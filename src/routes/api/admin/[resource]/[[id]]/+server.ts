import { requestJSON } from '#lib/server/request.ts';
import { error, json, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireUser } from '#lib/server/auth.ts';
import { database, audit, now } from '#lib/server/db.ts';
import { saveProduct, getProduct, sections } from '#lib/server/catalog.ts';
import {
	productSchema,
	categorySchema,
	sectionSchemas,
	settingsSchema,
	profileSchema,
	orderUpdateSchema,
	type SectionKey
} from '#lib/studio/contracts.ts';
import { uploadMedia, deleteMedia } from '#lib/server/media.ts';
import { updateOrder } from '#lib/server/orders.ts';
import { verifyPassword, hashPassword } from '#lib/server/password.ts';

const handler: RequestHandler = async (event) => {
	const { resource, id } = event.params,
		method = event.request.method;
	const user = requireUser(
		event,
		['settings', 'orders', 'maintenance', 'users'].includes(resource)
	);
	const db = database();
	if (resource === 'media') {
		if (method === 'POST') return json(await uploadMedia(event, user.id, id), { status: 201 });
		if (method === 'DELETE' && id) {
			await deleteMedia(event, id, user.id);
			return json({ ok: true });
		}
		error(405);
	}
	if (Number(event.request.headers.get('content-length')) > 65536)
		error(413, 'Data terlalu besar.');
	const body = method === 'DELETE' ? {} : await requestJSON(event.request, 65536);
	function parse<T>(schema: z.ZodType<T>): T {
		const result = schema.safeParse(body);
		if (!result.success)
			error(400, result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
		return result.data;
	}
	try {
		if (resource === 'products') {
			if (method === 'POST' && id) {
				const source = await getProduct(db, id),
					newId = crypto.randomUUID();
				await saveProduct(
					db,
					newId,
					productSchema.parse({
						...source,
						name: `${source.name} (copy)`,
						slug: `${source.slug.slice(0, 60)}-copy-${newId.slice(0, 8)}`,
						status: 'draft'
					}),
					user.id,
					true
				);
				return json({ id: newId });
			}
			if (method === 'POST' || method === 'PUT') {
				const data = parse(productSchema),
					productId = id ?? crypto.randomUUID();
				await saveProduct(db, productId, data, user.id, method === 'POST');
				return json({ id: productId });
			}
			if (method === 'DELETE' && id) {
				await getProduct(db, id);
				await db.batch([
					db
						.prepare("UPDATE products SET status='archived',updated_at=? WHERE id=?")
						.bind(now(), id),
					audit(db, user.id, 'archive', 'product', id)
				]);
				return json({ ok: true });
			}
		}
		if (resource === 'categories') {
			if (method === 'POST' || method === 'PUT') {
				const data = parse(categorySchema),
					categoryId = id ?? crypto.randomUUID();
				const duplicate = await db
					.prepare('SELECT id FROM product_categories WHERE slug=? AND id<>?')
					.bind(data.slug, categoryId)
					.first();
				if (duplicate) error(409, 'Slug kategori sudah digunakan.');
				const stmt =
					method === 'POST'
						? db
								.prepare(
									'INSERT INTO product_categories (id,name,slug,display_order) VALUES (?,?,?,?)'
								)
								.bind(categoryId, data.name, data.slug, data.display_order)
						: db
								.prepare('UPDATE product_categories SET name=?,slug=?,display_order=? WHERE id=?')
								.bind(data.name, data.slug, data.display_order, categoryId);
				await db.batch([
					stmt,
					audit(db, user.id, method === 'POST' ? 'create' : 'update', 'category', categoryId)
				]);
				return json({ id: categoryId });
			}
			if (method === 'DELETE' && id) {
				if (
					await db.prepare('SELECT id FROM products WHERE category_id=? LIMIT 1').bind(id).first()
				)
					error(409, 'Kategori masih digunakan produk.');
				await db.batch([
					db.prepare('DELETE FROM product_categories WHERE id=?').bind(id),
					audit(db, user.id, 'delete', 'category', id)
				]);
				return json({ ok: true });
			}
		}
		if (resource === 'content' && id && Object.hasOwn(sectionSchemas, id) && method === 'PUT') {
			const request = z
				.object({
					data: z.unknown(),
					action: z.enum(['save', 'publish', 'unpublish']),
					displayOrder: z.number().int().min(0).max(20)
				})
				.safeParse(body);
			if (!request.success) error(400, 'Data section tidak valid.');
			const section = id as SectionKey,
				result = sectionSchemas[section].safeParse(request.data.data);
			if (!result.success)
				error(400, result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
			const data = result.data,
				encoded = JSON.stringify(data),
				action = request.data.action;
			const all = await sections(db),
				old = all.find((s) => s.id === section);
			if (!old) error(404);
			const refs = new Set<string>();
			const scan = (v: unknown) => {
				if (!v || typeof v !== 'object') return;
				for (const [key, value] of Object.entries(v)) {
					if (key === 'imageId' && typeof value === 'string' && value) refs.add(value);
					else if (typeof value === 'object') {
						if (Array.isArray(value)) value.forEach(scan);
						else scan(value);
					}
				}
			};
			scan(data);
			if (action === 'save') scan(old.published);
			const productIds: string[] = [];
			if ('featuredProduct' in data && data.featuredProduct) productIds.push(data.featuredProduct);
			if ('productId' in data && data.productId) productIds.push(data.productId);
			for (const pid of productIds)
				if (
					!(await db
						.prepare("SELECT id FROM products WHERE id=? AND status='published'")
						.bind(pid)
						.first())
				)
					error(400, 'Featured product harus sudah published.');
			for (const mid of refs)
				if (!(await db.prepare('SELECT id FROM media_assets WHERE id=?').bind(mid).first()))
					error(400, 'Media tidak ditemukan.');
			await db.batch([
				db
					.prepare(
						`UPDATE site_sections SET draft=?,published=${action === 'save' ? 'published' : action === 'unpublish' ? 'NULL' : '?'},display_order=?,updated_at=? WHERE id=?`
					)
					.bind(
						encoded,
						...(action === 'publish' ? [encoded] : []),
						request.data.displayOrder,
						now(),
						section
					),
				db.prepare('DELETE FROM section_media WHERE section_id=?').bind(section),
				...[...refs].map((mid) =>
					db
						.prepare('INSERT INTO section_media (section_id,media_id) VALUES (?,?)')
						.bind(section, mid)
				),
				audit(db, user.id, action, 'section', section)
			]);
			return json({ ok: true });
		}
		if (resource === 'orders' && id && method === 'PUT') {
			await updateOrder(db, id, parse(orderUpdateSchema), user.id);
			return json({ ok: true });
		}
		if (resource === 'settings' && method === 'PUT') {
			const data = parse(settingsSchema);
			await db.batch([
				db
					.prepare(
						'INSERT INTO site_settings (id,data,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at'
					)
					.bind(JSON.stringify(data), now()),
				audit(db, user.id, 'update', 'settings', 'store')
			]);
			return json({ ok: true });
		}
		if (resource === 'profile' && method === 'PUT') {
			const data = parse(profileSchema),
				row = await db
					.prepare('SELECT password_hash FROM admin_users WHERE id=?')
					.bind(user.id)
					.first<{ password_hash: string }>();
			if (!row || !(await verifyPassword(data.currentPassword, row.password_hash)))
				error(400, 'Password saat ini salah.');
			await db.batch([
				db
					.prepare('UPDATE admin_users SET name=?,password_hash=? WHERE id=?')
					.bind(data.name, await hashPassword(data.newPassword), user.id),
				db
					.prepare('DELETE FROM admin_sessions WHERE user_id=? AND token_hash<>?')
					.bind(user.id, event.locals.sessionHash),
				audit(db, user.id, 'password-change', 'admin', user.id)
			]);
			return json({ ok: true });
		}
		if (resource === 'users' && method === 'POST') {
			const input = parse(
				z.object({
					email: z
						.email()
						.max(254)
						.transform((v) => v.toLowerCase()),
					name: z.string().trim().min(1).max(100),
					password: z.string().min(12).max(256),
					role: z.enum(['admin', 'editor'])
				})
			);
			const uid = crypto.randomUUID();
			await db.batch([
				db
					.prepare('INSERT INTO admin_users (id,email,name,password_hash,role) VALUES (?,?,?,?,?)')
					.bind(uid, input.email, input.name, await hashPassword(input.password), input.role),
				audit(db, user.id, 'create', 'admin', uid)
			]);
			return json({ id: uid });
		}
		if (resource === 'maintenance' && method === 'POST') {
			await db.batch([
				db.prepare(
					"UPDATE orders SET whatsapp_message='',request_hash='',delivery_snapshot=json_remove(delivery_snapshot,'$.address','$.point','$.destination','$.origin','$.polyline','$.details','$.phone') WHERE delivery_snapshot IS NOT NULL AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')"
				),
				db.prepare('DELETE FROM shipping_quotes WHERE expires_at<=?').bind(Date.now()),
				db.prepare(
					"UPDATE orders SET customer_name='[Dihapus sesuai retensi]',delivery_snapshot=NULL,customer_note='',request_hash='',internal_note='',fulfillment='',whatsapp_message='' WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"
				),
				db.prepare(
					"DELETE FROM analytics_events WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"
				),
				db
					.prepare('DELETE FROM admin_sessions WHERE expires_at<=?')
					.bind(Math.floor(Date.now() / 1000)),
				db
					.prepare('DELETE FROM rate_limits WHERE expires_at<=?')
					.bind(Math.floor(Date.now() / 1000)),
				audit(db, user.id, 'retention', 'system', '90-days')
			]);
			return json({ ok: true });
		}
		error(405, 'Operasi tidak tersedia.');
	} catch (e) {
		if (isHttpError(e)) throw e;
		if (e instanceof Error && /UNIQUE constraint/.test(e.message))
			error(409, 'Nilai unik sudah digunakan.');
		if (e instanceof Error && /FOREIGN KEY constraint/.test(e.message))
			error(409, 'Data masih digunakan atau referensi sudah berubah.');
		throw e;
	}
};
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
