import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { allowedTransition, type OrderRecord, type OrderStatus } from '#lib/studio/contracts.ts';
import { now } from './db';
export async function listOrders(db: D1Database, params: URLSearchParams) {
	const q = (params.get('q') ?? '').slice(0, 100),
		status = params.get('status') ?? '';
	const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1)),
		limit = 20;
	const where = ['(customer_name LIKE ? OR id LIKE ?)'],
		args: (string | number)[] = [`%${q}%`, `%${q}%`];
	if (status) {
		where.push('status=?');
		args.push(status);
	}
	const sort =
		params.get('sort') === 'oldest'
			? 'created_at ASC'
			: params.get('sort') === 'total'
				? 'total DESC'
				: 'created_at DESC';
	const [rows, count] = await Promise.all([
		db
			.prepare(
				`SELECT id,customer_name,customer_note,fulfillment,total,status,internal_note,created_at,confirmed_at,updated_at,whatsapp_number,version,delivery_snapshot FROM orders WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ? OFFSET ?`
			)
			.bind(...args, limit, (page - 1) * limit)
			.all<OrderRecord>(),
		db
			.prepare(`SELECT COUNT(*) AS count FROM orders WHERE ${where.join(' AND ')}`)
			.bind(...args)
			.first<{ count: number }>()
	]);
	return { items: rows.results, total: count?.count ?? 0, page, limit };
}
export async function getOrder(db: D1Database, id: string) {
	const row = await db
		.prepare(
			'SELECT id,customer_name,customer_note,fulfillment,total,status,internal_note,created_at,confirmed_at,updated_at,whatsapp_number,version,delivery_snapshot FROM orders WHERE id=?'
		)
		.bind(id)
		.first<OrderRecord>();
	if (!row) error(404, 'Pesanan tidak ditemukan.');
	const [items, history] = await Promise.all([
		db
			.prepare('SELECT * FROM checkout_items WHERE order_id=?')
			.bind(id)
			.all<{ id: string; product_name: string; price: number; qty: number; subtotal: number }>(),
		db
			.prepare(
				'SELECT h.*,u.name AS actor FROM order_status_history h LEFT JOIN admin_users u ON u.id=h.actor_id WHERE order_id=? ORDER BY h.created_at DESC'
			)
			.bind(id)
			.all<{ id: string; status: OrderStatus; created_at: string; actor: string | null }>()
	]);
	return { ...row, items: items.results, history: history.results };
}
export async function updateOrder(
	db: D1Database,
	id: string,
	input: {
		status: OrderStatus;
		previous: OrderStatus;
		version: number;
		internal_note: string;
		deliveryFee?: number;
	},
	actor: string
) {
	const order = await getOrder(db, id);
	if (order.status !== input.previous || order.version !== input.version)
		error(409, 'Status telah diubah pengguna lain. Muat ulang sebelum menyimpan.');
	if (!allowedTransition(order.status, input.status))
		error(400, 'Perubahan status ini tidak diizinkan. Konfirmasi pesanan terlebih dahulu.');
	let snapshot = order.delivery_snapshot,
		total = order.total;
	if (snapshot) {
		const shipping = JSON.parse(snapshot);
		if (shipping.fee === null && input.status === 'confirmed') {
			if (input.deliveryFee === undefined)
				error(400, 'Isi ongkir yang disepakati sebelum konfirmasi.');
			shipping.fee = input.deliveryFee;
			shipping.total = shipping.subtotal + input.deliveryFee;
			shipping.status = 'manual-confirmed';
			snapshot = JSON.stringify(shipping);
			total = shipping.total;
		}
	}
	// History and audit select only the winning compare-and-swap update in the same D1 transaction.
	const marker = crypto.randomUUID(),
		stamp = now();
	const result = await db.batch([
		db
			.prepare(
				"UPDATE orders SET total=?,delivery_snapshot=?,status=?,internal_note=?,confirmed_at=CASE WHEN ?='confirmed' AND confirmed_at IS NULL THEN ? ELSE confirmed_at END,updated_at=?,version=version+1 WHERE id=? AND status=? AND version=?"
			)
			.bind(
				total,
				snapshot,
				input.status,
				input.internal_note,
				input.status,
				stamp,
				stamp,
				id,
				input.previous,
				input.version
			),
		db
			.prepare(
				'INSERT INTO order_status_history (id,order_id,status,actor_id) SELECT ?,id,status,? FROM orders WHERE changes()=1 AND id=? AND version=? AND status=?'
			)
			.bind(marker, actor, id, input.version + 1, input.status),
		db
			.prepare(
				"INSERT INTO activity_logs (id,actor_id,action,entity,entity_id) SELECT ?,?,'update','order',? WHERE EXISTS (SELECT 1 FROM order_status_history WHERE id=?)"
			)
			.bind(crypto.randomUUID(), actor, id, marker)
	]);
	if (!result[0].meta.changes) error(409, 'Pesanan berubah. Muat ulang halaman.');
}
export async function analytics(db: D1Database, days: number) {
	const since = new Date(new Date().setUTCHours(0, 0, 0, 0) - (days - 1) * 86400000).toISOString();
	const [products, orders, events, daily, popular, recent, activity] = await Promise.all([
		db
			.prepare(
				"SELECT COUNT(*) AS total,SUM(CASE WHEN status='published' AND available=1 AND (stock IS NULL OR stock>0) THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN available=0 OR stock=0 THEN 1 ELSE 0 END) AS outOfStock FROM products WHERE status<>'archived'"
			)
			.first<{ total: number; active: number; outOfStock: number }>(),
		db
			.prepare(
				"SELECT COUNT(*) AS checkouts,SUM(CASE WHEN status IN ('confirmed','preparing','completed') THEN 1 ELSE 0 END) AS confirmed,COALESCE(SUM(CASE WHEN status IN ('confirmed','preparing','completed') THEN total ELSE 0 END),0) AS revenue FROM orders WHERE created_at>=?"
			)
			.bind(since)
			.first<{ checkouts: number; confirmed: number; revenue: number }>(),
		db
			.prepare(
				'SELECT type,COUNT(*) AS count FROM analytics_events WHERE created_at>=? GROUP BY type'
			)
			.bind(since)
			.all<{ type: string; count: number }>(),
		db
			.prepare(
				'SELECT substr(created_at,1,10) AS day,type,COUNT(*) AS count FROM analytics_events WHERE created_at>=? GROUP BY day,type ORDER BY day'
			)
			.bind(since)
			.all<{ day: string; type: string; count: number }>(),
		db
			.prepare(
				"SELECT p.id,p.name,SUM(CASE WHEN e.type='product_view' THEN 1 ELSE 0 END) AS views,SUM(CASE WHEN e.type='add_to_cart' THEN 1 ELSE 0 END) AS selected FROM analytics_events e JOIN products p ON p.id=e.product_id WHERE e.created_at>=? GROUP BY p.id ORDER BY selected DESC,views DESC LIMIT 10"
			)
			.bind(since)
			.all<{ id: string; name: string; views: number; selected: number }>(),
		db
			.prepare(
				'SELECT id,customer_name,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 5'
			)
			.all<OrderRecord>(),
		db
			.prepare(
				'SELECT a.*,u.name AS actor FROM activity_logs a LEFT JOIN admin_users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 8'
			)
			.all<{
				id: string;
				action: string;
				entity: string;
				entity_id: string;
				created_at: string;
				actor: string | null;
			}>()
	]);
	return {
		products: products!,
		orders: orders!,
		events: events.results,
		daily: daily.results,
		popular: popular.results,
		recent: recent.results,
		activity: activity.results,
		days
	};
}
