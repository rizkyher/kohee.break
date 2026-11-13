import { roadRoute } from './osrm';
import { mapCredentials } from './map-credentials';
export { mapCredentials } from './map-credentials';
import { error } from '@sveltejs/kit';
import { database } from './db';
import { digest } from './password';
import {
	defaultDelivery,
	calculateShipping,
	type DeliverySettings,
	type ShippingQuote,
	type Destination
} from '#lib/studio/shipping.ts';
export async function deliverySettings() {
	const row = await database()
		.prepare('SELECT data,version FROM delivery_settings WHERE id=1')
		.first<{ data: string; version: number }>();
	return {
		config: row ? (JSON.parse(row.data) as DeliverySettings) : defaultDelivery,
		version: row?.version ?? 0
	};
}
export async function cartSnapshot(items: { id: string; qty: number }[]) {
	const rows = await database()
		.prepare(
			`SELECT id,price,available,stock,status FROM products WHERE id IN (${items.map(() => '?').join(',')})`
		)
		.bind(...items.map((i) => i.id))
		.all<{ id: string; price: number; available: number; stock: number | null; status: string }>();
	let subtotal = 0;
	for (const i of items) {
		const p = rows.results.find((p) => p.id === i.id);
		if (!p || p.status !== 'published' || !p.available || (p.stock !== null && p.stock < i.qty))
			error(409, 'Produk atau jumlah tidak tersedia.');
		subtotal += p.price * i.qty;
	}
	return {
		subtotal,
		hash: await digest(
			JSON.stringify(
				[...items]
					.sort((a, b) => a.id.localeCompare(b.id))
					.map((i) => ({ ...i, price: rows.results.find((p) => p.id === i.id)!.price }))
			)
		)
	};
}
export async function createQuote(destination: Destination, items: { id: string; qty: number }[]) {
	const { config, version } = await deliverySettings();
	if (!config.enabled || !config.origin) error(409, 'Pengiriman belum diaktifkan oleh toko.');
	const cart = await cartSnapshot(items);
	if (!mapCredentials().routingUrl) error(503, 'Layanan OSRM belum dikonfigurasi.');
	let distance: number | null = null,
		polyline = '';
	try {
		const route = await roadRoute(config.origin, destination.point);
		distance = route.distance;
		polyline = route.polyline;
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		if (!config.manualFallback) error(502, 'Rute gagal dihitung. Silakan coba lagi.');
	}
	const result = distance === null ? null : calculateShipping(config, distance, cart.subtotal);
	if (result && !result.eligible) error(422, 'Tujuan di luar jangkauan pengiriman toko.');
	const quote: ShippingQuote = {
		id: crypto.randomUUID(),
		fee: result?.fee ?? null,
		distance,
		expires: Date.now() + 5 * 60000,
		status: distance === null ? 'manual' : 'quoted',
		polyline,
		address: destination.address,
		destination: destination.point,
		origin: config.origin
	};
	await database()
		.prepare(
			'INSERT INTO shipping_quotes (id,data,cart_hash,settings_version,expires_at) VALUES (?,?,?,?,?)'
		)
		.bind(quote.id, JSON.stringify(quote), cart.hash, version, quote.expires)
		.run();
	return quote;
}
export async function validateQuote(
	id: string,
	destination: Destination,
	items: { id: string; qty: number }[]
) {
	const row = await database()
		.prepare('SELECT * FROM shipping_quotes WHERE id=?')
		.bind(id)
		.first<{ data: string; cart_hash: string; settings_version: number; expires_at: number }>();
	const settings = await deliverySettings();
	if (
		!row ||
		row.expires_at < Date.now() ||
		row.settings_version !== settings.version ||
		!settings.config.enabled
	)
		error(409, 'Ongkir kedaluwarsa atau aturan toko berubah. Hitung ulang.');
	const quote = JSON.parse(row.data) as ShippingQuote;
	const cart = await cartSnapshot(items);
	if (
		row.cart_hash !== cart.hash ||
		quote.address !== destination.address ||
		quote.destination.lat !== destination.point.lat ||
		quote.destination.lng !== destination.point.lng
	)
		error(409, 'Alamat atau keranjang berubah. Konfirmasi titik dan hitung ulang ongkir.');
	return { ...quote, subtotal: cart.subtotal };
}
