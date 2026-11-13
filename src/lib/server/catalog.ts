import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import type {
	ProductRecord,
	MediaAsset,
	Settings,
	Sections,
	SectionKey
} from '#lib/studio/contracts.ts';
import { defaultSettings } from '#lib/studio/defaults.ts';
import { brand } from '#lib/brand.ts';
import { audit, now } from './db';

export async function settings(db: D1Database): Promise<Settings> {
	const initial = {
		...defaultSettings,
		whatsappNumber: brand.whatsappNumber ?? '',
		instagram: brand.instagram?.url ?? '',
		fulfillmentOptions: brand.fulfillmentOptions
	};
	let row = await db.prepare('SELECT data FROM site_settings WHERE id=1').first<{ data: string }>();
	if (!row) {
		await db
			.prepare('INSERT OR IGNORE INTO site_settings (id,data) VALUES (1,?)')
			.bind(JSON.stringify(initial))
			.run();
		row = await db.prepare('SELECT data FROM site_settings WHERE id=1').first<{ data: string }>();
	}
	return JSON.parse(row!.data);
}
export async function listProducts(
	db: D1Database,
	opts: {
		published?: boolean;
		all?: boolean;
		q?: string;
		status?: string;
		category?: string;
		sort?: string;
		page?: number;
		limit?: number;
	} = {}
) {
	const where = ['1=1'],
		values: (string | number)[] = [];
	if (opts.published) {
		where.push("p.status='published'");
	}
	if (opts.q) {
		where.push('(p.name LIKE ? OR p.slug LIKE ?)');
		values.push(`%${opts.q.slice(0, 100)}%`, `%${opts.q.slice(0, 100)}%`);
	}
	if (opts.status) {
		where.push('p.status=?');
		values.push(opts.status);
	}
	if (opts.category) {
		where.push('p.category_id=?');
		values.push(opts.category);
	}
	const sort =
		(
			{
				name: 'p.name ASC',
				price: 'p.price ASC',
				newest: 'p.created_at DESC',
				order: 'p.display_order ASC,p.name ASC'
			} as Record<string, string>
		)[opts.sort ?? 'order'] ?? 'p.display_order ASC,p.name ASC';
	const page = Math.max(1, opts.page ?? 1),
		limit = opts.all ? -1 : Math.min(200, opts.limit ?? 20);
	const clause = where.join(' AND ');
	const [count, rows, images] = await Promise.all([
		db
			.prepare(`SELECT COUNT(*) AS count FROM products p WHERE ${clause}`)
			.bind(...values)
			.first<{ count: number }>(),
		db
			.prepare(
				`SELECT p.*,c.name AS category_name,c.slug AS category_slug FROM products p LEFT JOIN product_categories c ON c.id=p.category_id WHERE ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`
			)
			.bind(...values, limit, (page - 1) * limit)
			.all<ProductRecord>(),
		db
			.prepare(
				'SELECT m.*,pi.product_id FROM product_images pi JOIN media_assets m ON m.id=pi.media_id ORDER BY pi.display_order'
			)
			.all<MediaAsset & { product_id: string }>()
	]);
	return {
		items: rows.results.map((p) => ({
			...p,
			available: !!p.available && p.stock !== 0,
			featured: !!p.featured,
			images: images.results.filter((i) => i.product_id === p.id),
			image_ids: images.results.filter((i) => i.product_id === p.id).map((i) => i.id)
		})),
		total: count?.count ?? 0,
		page,
		limit
	};
}
export async function getProduct(db: D1Database, id: string) {
	const row = await db
		.prepare(
			'SELECT p.*,c.name AS category_name,c.slug AS category_slug FROM products p LEFT JOIN product_categories c ON c.id=p.category_id WHERE p.id=?'
		)
		.bind(id)
		.first<ProductRecord>();
	if (!row) error(404, 'Produk tidak ditemukan.');
	const images = await db
		.prepare(
			'SELECT m.* FROM product_images pi JOIN media_assets m ON m.id=pi.media_id WHERE pi.product_id=? ORDER BY pi.display_order'
		)
		.bind(id)
		.all<MediaAsset>();
	return {
		...row,
		available: !!row.available,
		featured: !!row.featured,
		images: images.results,
		image_ids: images.results.map((i) => i.id)
	};
}
export async function categories(db: D1Database) {
	return (
		await db
			.prepare(
				'SELECT c.*,COUNT(p.id) AS products FROM product_categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.display_order,c.name'
			)
			.all<{ id: string; name: string; slug: string; display_order: number; products: number }>()
	).results;
}
export async function media(db: D1Database, q = '', limit = 200) {
	return (
		await db
			.prepare('SELECT * FROM media_assets WHERE name LIKE ? ORDER BY created_at DESC LIMIT ?')
			.bind(`%${q.slice(0, 100)}%`, limit)
			.all<MediaAsset>()
	).results;
}
export async function sections(db: D1Database) {
	return (
		await db.prepare('SELECT * FROM site_sections ORDER BY display_order').all<{
			id: SectionKey;
			draft: string;
			published: string | null;
			display_order: number;
			updated_at: string;
		}>()
	).results.map((s) => ({
		...s,
		draft: JSON.parse(s.draft),
		published: s.published ? JSON.parse(s.published) : null
	}));
}
export async function publishedSections(db: D1Database) {
	const rows = await sections(db);
	const content = Object.fromEntries(
		rows.map((s) => [s.id, s.published ? { ...s.published } : { visible: false }])
	) as Sections;
	return { content, order: rows.map((s) => s.id) };
}
export async function saveProduct(
	db: D1Database,
	id: string,
	data: Omit<
		ProductRecord,
		'id' | 'images' | 'category_name' | 'category_slug' | 'created_at' | 'updated_at'
	>,
	actor: string,
	create = false
) {
	const duplicate = await db
		.prepare('SELECT id FROM products WHERE slug=? AND id<>?')
		.bind(data.slug, id)
		.first();
	if (duplicate) error(409, 'Slug sudah dipakai produk lain.');
	if (
		data.category_id &&
		!(await db
			.prepare('SELECT id FROM product_categories WHERE id=?')
			.bind(data.category_id)
			.first())
	)
		error(400, 'Kategori tidak ditemukan.');
	const ids = [...new Set(data.image_ids)];
	if (ids.length) {
		const found = await db
			.prepare(`SELECT id FROM media_assets WHERE id IN (${ids.map(() => '?').join(',')})`)
			.bind(...ids)
			.all();
		if (found.results.length !== ids.length) error(400, 'Media tidak ditemukan.');
	}
	const { image_ids: unused, ...fields } = data;
	void unused;
	const keys = Object.keys(fields),
		values = Object.values(fields).map((v) => (typeof v === 'boolean' ? Number(v) : v));
	const stmt = create
		? db
				.prepare(
					`INSERT INTO products (id,${keys.join(',')}) VALUES (?,${keys.map(() => '?').join(',')})`
				)
				.bind(id, ...values)
		: db
				.prepare(
					`UPDATE products SET ${keys.map((k) => `${k}=?`).join(',')},updated_at=? WHERE id=?`
				)
				.bind(...values, now(), id);
	if (!create) await getProduct(db, id);
	await db.batch([
		stmt,
		db.prepare('DELETE FROM product_images WHERE product_id=?').bind(id),
		...ids.map((mid, i) =>
			db
				.prepare('INSERT INTO product_images (product_id,media_id,display_order) VALUES (?,?,?)')
				.bind(id, mid, i)
		),
		audit(db, actor, create ? 'create' : 'update', 'product', id)
	]);
}

/** Only resolve artwork referenced by published content; never enumerate draft media publicly. */
export async function publishedMedia(
	db: D1Database,
	content: Sections
): Promise<Record<string, string>> {
	const ids = new Set<string>();
	function collect(value: unknown) {
		if (!value || typeof value !== 'object') return;
		for (const [key, child] of Object.entries(value)) {
			if (key === 'imageId' && typeof child === 'string' && child) ids.add(child);
			else if (typeof child === 'object') collect(child);
		}
	}
	collect(content);
	if (!ids.size) return {};
	const rows = await db
		.prepare(`SELECT id,url FROM media_assets WHERE id IN (${[...ids].map(() => '?').join(',')})`)
		.bind(...ids)
		.all<{ id: string; url: string }>();
	return Object.fromEntries(rows.results.map((row) => [row.id, row.url]));
}
