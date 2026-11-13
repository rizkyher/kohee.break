// Local-only integration test. Start Vite (or preview) and apply local migrations first.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultDelivery } from '../src/lib/studio/shipping.ts';
import { hashPassword, digest } from '../src/lib/server/password.ts';
import { getPlatformProxy } from 'wrangler';
const origin = process.env.KOHEE_TEST_URL ?? 'http://127.0.0.1:5173';
assert.ok(
	['127.0.0.1', 'localhost'].includes(new URL(origin).hostname),
	'Integration tests only run on localhost.'
);
const unique = crypto.randomUUID();
const checkoutKey = crypto.randomUUID();
const auth = {
	password: crypto.randomUUID() + 'Aa!',
	ids: { admin: crypto.randomUUID(), editor: crypto.randomUUID() }
};
const adminEmail = `studio-${unique}@example.invalid`,
	editorEmail = `editor-${unique}@example.invalid`;
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', remoteBindings: false }),
	db = proxy.env.DB;
const health = await fetch(origin);
if (health.status !== 200) {
	await proxy.dispose();
	throw new Error(
		'Local storefront must be running with migrations applied before integration tests.'
	);
}
// Preserve local visitors' existing quotas; test traffic must not exhaust development limits.
const rateKeys = (
	await Promise.all(
		['127.0.0.1', '::1', '::ffff:127.0.0.1'].map(async (ip) => {
			const h = await digest(ip);
			return [`checkout:${h}`, `login-ip:${h}`, `event:${h}`];
		})
	)
).flat();
const initialRates = (
	await db
		.prepare(`SELECT * FROM rate_limits WHERE key IN (${rateKeys.map(() => '?').join(',')})`)
		.bind(...rateKeys)
		.all()
).results;
await db.batch(rateKeys.map((key) => db.prepare('DELETE FROM rate_limits WHERE key=?').bind(key)));
const replacedKeys = [];
let admin = '',
	editor,
	productId = '',
	mediaId = '',
	orderId = '',
	categoryId = '';
const hash = await hashPassword(auth.password);
await db.batch([
	db
		.prepare('INSERT INTO admin_users (id,email,name,password_hash,role) VALUES (?,?,?,?,?)')
		.bind(auth.ids.admin, adminEmail, 'Integration Admin', hash, 'admin'),
	db
		.prepare('INSERT INTO admin_users (id,email,name,password_hash,role) VALUES (?,?,?,?,?)')
		.bind(auth.ids.editor, editorEmail, 'Integration Editor', hash, 'editor')
]);
const initialSettings = await db.prepare('SELECT * FROM site_settings WHERE id=1').first();
const initialDelivery = await db.prepare('SELECT * FROM delivery_settings WHERE id=1').first();
const initialHero = await db.prepare("SELECT * FROM site_sections WHERE id='hero'").first();
const initialHeroMedia = (
	await db.prepare("SELECT media_id FROM section_media WHERE section_id='hero'").all()
).results;
async function request(
	path,
	{ method = 'GET', body, cookie = admin, originHeader = origin, form } = {}
) {
	return fetch(origin + path, {
		method,
		redirect: 'manual',
		headers: {
			...(cookie ? { cookie } : {}),
			...(method !== 'GET' ? { origin: originHeader } : {}),
			...(body ? { 'content-type': 'application/json' } : {})
		},
		body: form ?? (body ? JSON.stringify(body) : undefined)
	});
}
async function login(email) {
	const response = await request('/admin/login', {
		method: 'POST',
		cookie: '',
		form: new URLSearchParams({ email, password: auth.password })
	});
	const result = await response.text();
	assert.ok(
		response.status === 303 || (response.status === 200 && JSON.parse(result).status === 303),
		result
	);
	return response.headers.get('set-cookie').split(';')[0];
}
async function mutate(path, method, body, status = 200, cookie = admin) {
	const res = await request('/api/admin/' + path, { method, body, cookie });
	const data = await res.json();
	assert.equal(res.status, status, JSON.stringify(data));
	return data;
}
try {
	assert.equal((await request('/admin/products', { cookie: '' })).status, 303);
	assert.equal(
		(await request('/api/admin/products', { method: 'POST', cookie: '', body: {} })).status,
		401
	);
	admin = await login(adminEmail);
	editor = await login(editorEmail);
	const deliveryConfigResponse = await request('/api/delivery/config', { cookie: '' });
	assert.equal(deliveryConfigResponse.status, 200);
	assert.equal('serverKey' in (await deliveryConfigResponse.json()), false);
	assert.equal(
		(
			await request('/api/delivery/settings', {
				method: 'POST',
				body: defaultDelivery,
				cookie: editor
			})
		).status,
		403
	);
	assert.equal(
		(await request('/api/delivery/settings', { method: 'POST', body: defaultDelivery })).status,
		200
	);
	assert.equal((await request('/admin/delivery')).status, 200);
	assert.equal(
		(
			await request('/api/delivery/quote', {
				method: 'POST',
				body: {
					destination: {
						address: 'Alamat uji lokal',
						point: { lat: 0, lng: 0 },
						details: '',
						phone: ''
					},
					items: [{ id: 'kuro-aren', qty: 1 }]
				},
				cookie: ''
			})
		).status,
		409
	);

	assert.equal(
		(
			await request('/api/admin/settings', {
				method: 'PUT',
				body: {},
				originHeader: 'https://evil.example'
			})
		).status,
		403
	);
	await mutate('settings', 'PUT', {}, 403, editor);
	assert.equal((await request('/admin/orders', { cookie: editor })).status, 403);
	categoryId = (
		await mutate('categories', 'POST', {
			name: 'Runtime category',
			slug: 'category-' + unique,
			display_order: 2
		})
	).id;
	await mutate('categories/' + categoryId, 'PUT', {
		name: 'Updated category',
		slug: 'category-' + unique,
		display_order: 3
	});
	const product = {
		name: 'CMS runtime verification',
		slug: 'runtime-' + unique,
		category_id: categoryId,
		short_description: 'Runtime test',
		description: 'Temporary local test product',
		price: 22000,
		comparison_price: 25000,
		size: '250ml',
		available: true,
		stock: 5,
		featured: false,
		display_order: 9,
		status: 'draft',
		seo_title: '',
		seo_description: '',
		image_ids: []
	};
	await mutate('products', 'POST', { ...product, price: -1 }, 400);
	productId = (await mutate('products', 'POST', product, 200, editor)).id;
	await mutate('products', 'POST', product, 409);
	await mutate('categories/' + categoryId, 'DELETE', undefined, 409);
	let form = new FormData();
	form.set(
		'file',
		new File([await readFile('static/products/bottle-latte.png')], 'runtime-test.png', {
			type: 'image/png'
		})
	);
	form.set('alt', 'Runtime test bottle');
	let res = await request('/api/admin/media', { method: 'POST', form });
	assert.equal(res.status, 201, await res.clone().text());
	const uploaded = await res.json();
	mediaId = uploaded.id;
	assert.equal((await request(uploaded.url, { cookie: '' })).status, 200);
	replacedKeys.push(
		(await db.prepare('SELECT object_key FROM media_assets WHERE id=?').bind(mediaId).first())
			.object_key
	);
	form = new FormData();
	form.set(
		'file',
		new File([await readFile('static/products/bottle-chocori.png')], 'runtime-replaced.png', {
			type: 'image/png'
		})
	);
	res = await request('/api/admin/media/' + mediaId, { method: 'POST', form });
	assert.equal(res.status, 201);
	assert.notEqual((await res.json()).url, uploaded.url);
	product.image_ids = [mediaId];
	product.status = 'published';
	await mutate('products/' + productId, 'PUT', product);
	const home = await request('/', { cookie: '' });
	assert.equal(home.status, 200);
	assert.match(await home.text(), /CMS runtime verification/);
	await mutate('media/' + mediaId, 'DELETE', undefined, 409);
	form = new FormData();
	form.set('file', new File(['<script>alert(1)</script>'], 'bad.png', { type: 'image/png' }));
	res = await request('/api/admin/media', { method: 'POST', form });
	assert.equal(res.status, 400);
	const hero = JSON.parse(initialHero.draft);
	hero.imageId = mediaId;
	hero.headline = 'Verified headline\nKohee Studio.';
	await mutate('content/hero', 'PUT', { data: hero, action: 'save', displayOrder: 0 });
	assert.doesNotMatch(await (await request('/', { cookie: '' })).text(), /Verified headline/);
	await mutate('content/hero', 'PUT', { data: hero, action: 'publish', displayOrder: 0 });
	assert.match(await (await request('/', { cookie: '' })).text(), /Verified headline/);
	await mutate('content/hero', 'PUT', { data: hero, action: 'unpublish', displayOrder: 0 });
	assert.doesNotMatch(await (await request('/', { cookie: '' })).text(), /Verified headline/);
	const config = JSON.parse(initialSettings.data);
	config.whatsappNumber = '6281234567890';
	config.open = true;
	config.storeInfo = 'Runtime store information';
	config.fulfillmentOptions = [];
	await mutate('settings', 'PUT', config);
	assert.match(await (await request('/', { cookie: '' })).text(), /Runtime store information/);
	const checkout = {
		key: checkoutKey,
		name: 'Runtime test customer',
		note: 'Temporary local check',
		fulfillment: '',
		items: [{ id: productId, qty: 2 }]
	};
	res = await request('/api/checkout', { method: 'POST', body: checkout, cookie: '' });
	assert.equal(res.status, 201, await res.clone().text());
	const link = await res.json();
	assert.match(decodeURIComponent(link.url), /Rp44.000/);
	res = await request('/api/checkout', { method: 'POST', body: checkout, cookie: '' });
	assert.equal(res.status, 200);
	assert.equal((await res.json()).url, link.url);
	res = await request('/api/checkout', {
		method: 'POST',
		body: { ...checkout, name: 'changed' },
		cookie: ''
	});
	assert.equal(res.status, 409);
	const row = await db
		.prepare('SELECT * FROM orders WHERE idempotency_key=?')
		.bind(checkout.key)
		.first();
	orderId = row.id;
	assert.equal(row.status, 'pending');
	assert.equal(row.total, 44000);
	await mutate(
		'orders/' + orderId,
		'PUT',
		{ status: 'preparing', previous: 'pending', version: 0, internal_note: '' },
		400
	);
	await mutate('orders/' + orderId, 'PUT', {
		status: 'confirmed',
		previous: 'pending',
		version: 0,
		internal_note: 'Confirmed in local smoke test'
	});
	assert.equal(
		(await db.prepare('SELECT status FROM orders WHERE id=?').bind(orderId).first()).status,
		'confirmed'
	);
	await mutate(
		'orders/' + orderId,
		'PUT',
		{ status: 'preparing', previous: 'confirmed', version: 0, internal_note: '' },
		409
	);
	assert.equal(
		(
			await db
				.prepare('SELECT COUNT(*) AS n FROM order_status_history WHERE order_id=?')
				.bind(orderId)
				.first()
		).n,
		2
	);
	const event = { id: crypto.randomUUID(), type: 'product_view', productId };
	await request('/api/events', { method: 'POST', body: event, cookie: '' });
	await request('/api/events', { method: 'POST', body: event, cookie: '' });
	assert.equal(
		(
			await db
				.prepare('SELECT COUNT(*) AS n FROM analytics_events WHERE id=?')
				.bind(event.id)
				.first()
		).n,
		1
	);
	const copy = await mutate('products/' + productId, 'POST', {});
	await mutate('products/' + copy.id, 'DELETE');
	await db.prepare('DELETE FROM products WHERE id=?').bind(copy.id).run();
	for (const path of [
		'/admin',
		'/admin/products',
		'/admin/products/new',
		'/admin/products/' + productId,
		'/admin/categories',
		'/admin/content',
		'/admin/content/hero',
		'/admin/media',
		'/admin/orders',
		'/admin/orders/' + orderId,
		'/admin/analytics',
		'/admin/settings',
		'/admin/activity',
		'/admin/profile'
	])
		assert.equal((await request(path)).status, 200, path);
	await mutate('products/' + productId, 'DELETE');
	assert.doesNotMatch(
		await (await request('/', { cookie: '' })).text(),
		/CMS runtime verification/
	);
	const otherSession = await login(adminEmail);
	const nextPassword = crypto.randomUUID() + 'Aa!';
	await mutate('profile', 'PUT', {
		name: 'Integration updated admin',
		currentPassword: auth.password,
		newPassword: nextPassword
	});
	assert.equal(
		(await request('/admin', { cookie: otherSession })).status,
		303,
		'Password change must revoke other sessions.'
	);
	auth.password = nextPassword;
	const logoutSession = await login(adminEmail);
	assert.equal(
		(await request('/admin/logout', { method: 'POST', cookie: logoutSession })).status,
		303
	);
	assert.equal(
		(await request('/admin', { cookie: logoutSession })).status,
		303,
		'Logout must revoke the session.'
	);
	console.log(
		'PASS: login, profile/password rotation, session revocation/logout, origin/role protection, product/category boundaries, R2 upload/signature checks/reference protection, draft/publish, dynamic storefront, idempotent checkout, order transitions, event deduplication, duplicate/archive and all admin routes.'
	);
} finally {
	if (initialDelivery)
		await db
			.prepare('UPDATE delivery_settings SET data=?,version=?,updated_at=? WHERE id=1')
			.bind(initialDelivery.data, initialDelivery.version, initialDelivery.updated_at)
			.run();
	else await db.prepare('DELETE FROM delivery_settings WHERE id=1').run();

	await db.batch([
		db.prepare("DELETE FROM section_media WHERE section_id='hero'"),
		...initialHeroMedia.map((row) =>
			db
				.prepare("INSERT INTO section_media (section_id,media_id) VALUES ('hero',?)")
				.bind(row.media_id)
		)
	]);
	await db.prepare('DELETE FROM orders WHERE idempotency_key=?').bind(checkoutKey).run();
	if (orderId) {
		await db.prepare('DELETE FROM orders WHERE id=?').bind(orderId).run();
	}
	if (productId) {
		await db.prepare('DELETE FROM analytics_events WHERE product_id=?').bind(productId).run();
		await db.prepare('DELETE FROM products WHERE id=?').bind(productId).run();
	}
	if (categoryId)
		await db.prepare('DELETE FROM product_categories WHERE id=?').bind(categoryId).run();
	if (mediaId) {
		await mutate('media/' + mediaId, 'DELETE').catch(() => {});
	}
	await db.prepare('DELETE FROM analytics_events WHERE id=?').bind(checkoutKey).run();
	await db
		.prepare('DELETE FROM activity_logs WHERE actor_id IN (?,?)')
		.bind(auth.ids.admin, auth.ids.editor)
		.run();
	await db
		.prepare('DELETE FROM admin_users WHERE id IN (?,?)')
		.bind(auth.ids.admin, auth.ids.editor)
		.run();
	await db
		.prepare('UPDATE site_settings SET data=?,updated_at=? WHERE id=1')
		.bind(initialSettings.data, initialSettings.updated_at)
		.run();
	await db
		.prepare(
			"UPDATE site_sections SET draft=?,published=?,display_order=?,updated_at=? WHERE id='hero'"
		)
		.bind(
			initialHero.draft,
			initialHero.published,
			initialHero.display_order,
			initialHero.updated_at
		)
		.run();
	for (const key of replacedKeys) if (key) await proxy.env.MEDIA.delete(key);
	await db.batch([
		...rateKeys.map((key) => db.prepare('DELETE FROM rate_limits WHERE key=?').bind(key)),
		...initialRates.map((row) =>
			db
				.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,?,?)')
				.bind(row.key, row.count, row.expires_at)
		)
	]);
	await db
		.prepare('DELETE FROM rate_limits WHERE key IN (?,?)')
		.bind(`login-email:${await digest(adminEmail)}`, `login-email:${await digest(editorEmail)}`)
		.run();
	await proxy.dispose();
}
