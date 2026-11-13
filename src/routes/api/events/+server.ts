import { requestJSON } from '#lib/server/request.ts';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventSchema } from '#lib/studio/contracts.ts';
import { database, throttle } from '#lib/server/db.ts';
import { digest } from '#lib/server/password.ts';
export const POST: RequestHandler = async (event) => {
	if (Number(event.request.headers.get('content-length')) > 2048) error(413);
	const input = eventSchema.safeParse(await requestJSON(event.request, 2048));
	if (!input.success) error(400, 'Event tidak valid.');
	const { id, type, productId } = input.data,
		db = database();
	await throttle(db, `event:${await digest(event.getClientAddress())}`, 150, 600);
	if (type !== 'page_view' && !productId) error(400, 'Produk wajib dipilih.');
	if (
		productId &&
		!(await db
			.prepare("SELECT id FROM products WHERE id=? AND status='published'")
			.bind(productId)
			.first())
	)
		error(400, 'Produk tidak ditemukan.');
	await db
		.prepare('INSERT OR IGNORE INTO analytics_events (id,type,product_id) VALUES (?,?,?)')
		.bind(id, type, productId ?? null)
		.run();
	return json({ ok: true });
};
