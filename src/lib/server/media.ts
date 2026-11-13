import { requestForm } from './request';
import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { database, audit } from './db';
import type { MediaAsset } from '#lib/studio/contracts.ts';
export const MAX_UPLOAD = 5 * 1024 * 1024;
export function imageType(bytes: Uint8Array): { mime: string; extension: string } | null {
	if (bytes.length < 24) return null;
	const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (
		bytes[0] === 255 &&
		bytes[1] === 216 &&
		bytes[2] === 255 &&
		bytes.at(-2) === 255 &&
		bytes.at(-1) === 217
	)
		return { mime: 'image/jpeg', extension: 'jpg' };
	if (
		bytes.length >= 45 &&
		[137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b) &&
		ascii(12, 16) === 'IHDR' &&
		view.getUint32(16) > 0 &&
		view.getUint32(20) > 0 &&
		ascii(bytes.length - 8, bytes.length - 4) === 'IEND'
	)
		return { mime: 'image/png', extension: 'png' };
	if (
		ascii(0, 4) === 'RIFF' &&
		ascii(8, 12) === 'WEBP' &&
		view.getUint32(4, true) + 8 === bytes.length &&
		['VP8 ', 'VP8L', 'VP8X'].includes(ascii(12, 16))
	)
		return { mime: 'image/webp', extension: 'webp' };
	return null;
}

export async function uploadMedia(event: RequestEvent, actor: string, replaceId?: string) {
	const bucket = env.MEDIA;
	if (!bucket) error(503, 'R2 belum dikonfigurasi.');
	const length = Number(event.request.headers.get('content-length'));
	if (length > MAX_UPLOAD + 65536) error(413, 'Upload maksimal 5 MB.');
	const form = await requestForm(event.request, MAX_UPLOAD + 65536),
		file = form.get('file'),
		alt = String(form.get('alt') ?? '')
			.trim()
			.slice(0, 250);
	if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD)
		error(400, 'Pilih gambar JPG, PNG, atau WebP maksimal 5 MB.');
	const bytes = new Uint8Array(await file.arrayBuffer()),
		type = imageType(bytes);
	if (!type || file.type !== type.mime)
		error(400, 'Isi file tidak cocok dengan tipe gambar. SVG dan file aktif tidak diterima.');
	const db = database(),
		id = replaceId ?? crypto.randomUUID();
	const old = replaceId
		? await db.prepare('SELECT * FROM media_assets WHERE id=?').bind(id).first<MediaAsset>()
		: null;
	if (replaceId && !old) error(404, 'Media tidak ditemukan.');
	const key = `images/${crypto.randomUUID()}.${type.extension}`,
		url = `/media/${key}`;
	await bucket.put(key, bytes, {
		httpMetadata: { contentType: type.mime, cacheControl: 'public, max-age=31536000, immutable' }
	});
	try {
		const stmt = old
			? db
					.prepare(
						'UPDATE media_assets SET object_key=?,name=?,mime=?,size=?,url=?,alt=? WHERE id=?'
					)
					.bind(key, file.name.slice(0, 150), type.mime, file.size, url, alt, id)
			: db
					.prepare(
						'INSERT INTO media_assets (id,object_key,name,mime,size,url,alt) VALUES (?,?,?,?,?,?,?)'
					)
					.bind(id, key, file.name.slice(0, 150), type.mime, file.size, url, alt);
		await db.batch([stmt, audit(db, actor, old ? 'replace' : 'upload', 'media', id)]);
	} catch (e) {
		await bucket.delete(key);
		throw e;
	}
	// Retain replaced objects for cached pages; purge orphan objects through the documented bucket lifecycle.
	return { id, url };
}
export async function deleteMedia(event: RequestEvent, id: string, actor: string) {
	const db = database();
	const asset = await db
		.prepare('SELECT * FROM media_assets WHERE id=?')
		.bind(id)
		.first<MediaAsset>();
	if (!asset) error(404, 'Media tidak ditemukan.');
	const refs = await db
		.prepare(
			'SELECT (SELECT COUNT(*) FROM product_images WHERE media_id=?)+(SELECT COUNT(*) FROM section_media WHERE media_id=?) AS count'
		)
		.bind(id, id)
		.first<{ count: number }>();
	if (refs?.count)
		error(409, 'Gambar masih dipakai produk atau draft/konten terbit. Ganti referensinya dahulu.');
	await db.batch([
		db.prepare('DELETE FROM media_assets WHERE id=?').bind(id),
		audit(db, actor, 'delete', 'media', id)
	]);
	if (asset.object_key) await env.MEDIA.delete(asset.object_key);
}
