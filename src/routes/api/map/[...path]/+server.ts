import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapCredentials } from '#lib/server/map-credentials.ts';
// Same-origin tile proxy: fixed configured tileset, no client-controlled upstream URL.
export const GET: RequestHandler = async ({ params }) => {
	const config = mapCredentials();
	let base: URL;
	try {
		base = new URL(config.tileJson);
	} catch {
		error(503, 'PMTiles belum dikonfigurasi.');
	}
	if (
		base.protocol !== 'https:' &&
		!(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))
	)
		error(503, 'URL tile tidak valid.');
	if (
		base.username ||
		base.password ||
		base.search ||
		base.hash ||
		!base.pathname.endsWith('.json')
	)
		error(503, 'Gunakan URL TileJSON tileset milik toko.');
	const path = params.path ?? '';
	if (path === 'basemap.json') {
		const response = await fetch(base, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
		if (!response.ok) error(502, 'Tileset PMTiles tidak tersedia.');
		const data = (await response.json()) as Record<string, unknown>;
		return json(
			{ ...data, tiles: ['/api/map/tiles/{z}/{x}/{y}.mvt'] },
			{ headers: { 'cache-control': 'public,max-age=300' } }
		);
	}
	const match = /^tiles\/(\d{1,2})\/(\d+)\/(\d+)\.mvt$/.exec(path);
	if (!match) error(404);
	const [z, x, y] = match.slice(1).map(Number);
	if (z > 22 || x >= 2 ** z || y >= 2 ** z) error(404);
	base.pathname = base.pathname.slice(0, -5) + `/${z}/${x}/${y}.mvt`;
	const response = await fetch(base, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
	if (![200, 204, 404].includes(response.status)) error(502, 'Tile tidak tersedia.');
	return new Response(response.body, {
		status: response.status,
		headers: { 'content-type': 'application/x-protobuf', 'cache-control': 'public,max-age=86400' }
	});
};
