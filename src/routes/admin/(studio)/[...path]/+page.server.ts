import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { database } from '#lib/server/db.ts';
import { requireUser } from '#lib/server/auth.ts';
import {
	listProducts,
	getProduct,
	categories,
	media,
	sections,
	settings
} from '#lib/server/catalog.ts';
import { listOrders, getOrder, analytics } from '#lib/server/orders.ts';
import { sectionKeys } from '#lib/studio/contracts.ts';

export const load: PageServerLoad = async (event) => {
	const path = (event.params.path ?? '').split('/').filter(Boolean),
		area = path[0] ?? 'overview',
		id = path[1];
	if (
		path.length > 2 ||
		![
			'overview',
			'products',
			'categories',
			'content',
			'media',
			'orders',
			'analytics',
			'settings',
			'activity',
			'profile'
		].includes(area)
	)
		error(404);
	if (id && !['products', 'content', 'orders'].includes(area)) error(404);
	const user = requireUser(event, ['orders', 'analytics', 'settings', 'activity'].includes(area)),
		db = database(),
		p = event.url.searchParams;
	const days = [7, 30, 90].includes(Number(p.get('days'))) ? Number(p.get('days')) : 30;
	const productList =
		area === 'products' && !id
			? await listProducts(db, {
					q: p.get('q') ?? '',
					status: p.get('status') ?? '',
					category: p.get('category') ?? '',
					sort: p.get('sort') ?? 'order',
					page: Math.max(1, Math.min(10000, Number(p.get('page')) || 1))
				})
			: null;
	const product = area === 'products' && id && id !== 'new' ? await getProduct(db, id) : null;
	const categoryList = ['products', 'categories'].includes(area) ? await categories(db) : [];
	const assets = ['products', 'content', 'media'].includes(area)
		? await media(db, area === 'media' ? (p.get('q') ?? '') : '', area === 'media' ? 200 : -1)
		: [];
	const content = area === 'content' ? await sections(db) : [];
	if (area === 'content' && id && !sectionKeys.includes(id as (typeof sectionKeys)[number]))
		error(404);
	const productChoices =
		area === 'content' ? (await listProducts(db, { published: true, all: true })).items : [];
	const orderList = area === 'orders' && !id ? await listOrders(db, p) : null;
	const order = area === 'orders' && id ? await getOrder(db, id) : null;
	const stats = ['overview', 'analytics'].includes(area) ? await analytics(db, days) : null;
	if (stats && user.role !== 'admin') {
		stats.recent = [];
		stats.activity = [];
	}
	const config = area === 'settings' ? await settings(db) : null;
	const activityPage = Math.max(1, Math.min(10000, Number(p.get('page')) || 1));
	const activity =
		area === 'activity'
			? (
					await db
						.prepare(
							'SELECT a.*,u.name AS actor FROM activity_logs a LEFT JOIN admin_users u ON u.id=a.actor_id WHERE a.action LIKE ? ORDER BY a.created_at DESC LIMIT 50 OFFSET ?'
						)
						.bind(`%${(p.get('q') ?? '').slice(0, 100)}%`, (activityPage - 1) * 50)
						.all<{
							id: string;
							action: string;
							entity: string;
							entity_id: string;
							actor: string | null;
							created_at: string;
						}>()
				).results
			: [];
	const activityCount =
		area === 'activity'
			? ((
					await db
						.prepare('SELECT COUNT(*) AS count FROM activity_logs WHERE action LIKE ?')
						.bind(`%${(p.get('q') ?? '').slice(0, 100)}%`)
						.first<{ count: number }>()
				)?.count ?? 0)
			: 0;
	const users =
		area === 'settings'
			? (
					await db
						.prepare('SELECT id,name,email,role FROM admin_users ORDER BY created_at')
						.all<{ id: string; name: string; email: string; role: string }>()
				).results
			: [];
	return {
		area,
		id,
		user,
		productList,
		product,
		categoryList,
		assets,
		content,
		productChoices,
		orderList,
		order,
		stats,
		config,
		activity,
		activityPage,
		activityCount,
		users,
		filters: Object.fromEntries(p)
	};
};
