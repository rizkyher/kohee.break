import { deliverySettings, validateQuote } from '#lib/server/shipping.ts';
import { formatRupiah } from '#lib/order.ts';
import { requestJSON } from '#lib/server/request.ts';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkoutSchema } from '#lib/studio/contracts.ts';
import { database, throttle } from '#lib/server/db.ts';
import { settings } from '#lib/server/catalog.ts';
import { digest } from '#lib/server/password.ts';
import { buildOrderMessage, whatsappUrl, type PricedLine } from '#lib/order.ts';
export const POST: RequestHandler = async (event) => {
	if (Number(event.request.headers.get('content-length')) > 20000)
		error(413, 'Data pesanan terlalu besar.');
	const parsed = checkoutSchema.safeParse(await requestJSON(event.request, 20000));
	if (!parsed.success) error(400, parsed.error.issues[0]?.message ?? 'Pesanan tidak valid.');
	const input = parsed.data,
		db = database();
	await throttle(db, `checkout:${await digest(event.getClientAddress())}`, 20, 3600);
	const fingerprint = await digest(JSON.stringify(input));
	const existing = await db
		.prepare(
			'SELECT request_hash,whatsapp_message,whatsapp_number FROM orders WHERE idempotency_key=?'
		)
		.bind(input.key)
		.first<{ request_hash: string; whatsapp_message: string; whatsapp_number: string }>();
	if (existing) {
		if (existing.request_hash !== fingerprint)
			error(409, 'Kunci checkout sudah digunakan untuk pesanan berbeda.');
		return json({ url: whatsappUrl(existing.whatsapp_number, existing.whatsapp_message) });
	}
	const config = await settings(db);
	if (!config.open) error(409, 'Toko sedang tidak menerima pesanan.');
	if (!config.whatsappNumber) error(503, 'Nomor WhatsApp penjual belum diatur.');
	if (config.fulfillmentOptions.length && !config.fulfillmentOptions.includes(input.fulfillment))
		error(400, 'Pilih cara pengambilan yang tersedia.');
	const rows = await db
		.prepare(
			`SELECT id,name,price,available,stock FROM products WHERE status='published' AND id IN (${input.items.map(() => '?').join(',')})`
		)
		.bind(...input.items.map((i) => i.id))
		.all<{ id: string; name: string; price: number; available: number; stock: number | null }>();
	const lines: PricedLine[] = input.items.map((item) => {
		const p = rows.results.find((p) => p.id === item.id);
		if (!p || !p.available || (p.stock !== null && p.stock < item.qty))
			error(409, 'Produk atau jumlah tidak lagi tersedia. Muat ulang menu.');
		return { product: { ...p, available: true }, qty: item.qty, subtotal: p.price * item.qty };
	});
	const deliveryConfig = await deliverySettings();
	let shipping = null;
	if (deliveryConfig.config.enabled) {
		if (!input.delivery || !input.quoteId)
			error(400, 'Konfirmasi alamat dan ongkir terlebih dahulu.');
		shipping = await validateQuote(input.quoteId, input.delivery, input.items);
	}
	const orderId = crypto.randomUUID(),
		subtotal = lines.reduce((s, l) => s + l.subtotal, 0),
		total = subtotal + (shipping?.fee ?? 0);
	let message = buildOrderMessage({
		lines,
		name: input.name,
		note: input.note,
		fulfillment: input.fulfillment
	}).replace('Halo Kohee Break! Aku mau pesan:', config.messageTemplate);
	if (shipping && input.delivery) {
		message = message.replace(
			`Total: ${formatRupiah(subtotal)}`,
			`Subtotal: ${formatRupiah(subtotal)}`
		);
		message += `\n\nPENGIRIMAN\nAlamat: ${input.delivery.address}\nDetail: ${input.delivery.details}\nTelepon: ${input.delivery.phone}\nJarak: ${shipping.distance === null ? 'Menunggu konfirmasi' : (shipping.distance / 1000).toFixed(2) + ' km'}\nOngkir: ${shipping.fee === null ? 'Menunggu konfirmasi manual' : formatRupiah(shipping.fee)}\nSubtotal: ${formatRupiah(subtotal)}\nTotal ${shipping.fee === null ? 'sementara (belum termasuk ongkir)' : ''}: ${formatRupiah(total)}\nLokasi Pengiriman: https://www.openstreetmap.org/?mlat=${input.delivery.point.lat}&mlon=${input.delivery.point.lng}#map=17/${input.delivery.point.lat}/${input.delivery.point.lng}`;
	}
	try {
		await db.batch([
			db
				.prepare(
					'INSERT INTO orders (id,idempotency_key,request_hash,customer_name,customer_note,fulfillment,total,whatsapp_number,whatsapp_message,delivery_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?)'
				)
				.bind(
					orderId,
					input.key,
					fingerprint,
					input.name,
					input.note,
					input.fulfillment,
					total,
					config.whatsappNumber,
					message,
					shipping ? JSON.stringify({ ...shipping, ...input.delivery, subtotal, total }) : null
				),
			...lines.map((l) =>
				db
					.prepare(
						'INSERT INTO checkout_items (id,order_id,product_id,product_name,price,qty,subtotal) VALUES (?,?,?,?,?,?,?)'
					)
					.bind(
						crypto.randomUUID(),
						orderId,
						l.product.id,
						l.product.name,
						l.product.price,
						l.qty,
						l.subtotal
					)
			),
			db
				.prepare("INSERT INTO order_status_history (id,order_id,status) VALUES (?,?,'pending')")
				.bind(crypto.randomUUID(), orderId),
			db.prepare("INSERT INTO analytics_events (id,type) VALUES (?,'checkout')").bind(input.key)
		]);
	} catch (e) {
		const winner = await db
			.prepare(
				'SELECT request_hash,whatsapp_message,whatsapp_number FROM orders WHERE idempotency_key=?'
			)
			.bind(input.key)
			.first<{ request_hash: string; whatsapp_message: string; whatsapp_number: string }>();
		if (winner && winner.request_hash === fingerprint)
			return json({ url: whatsappUrl(winner.whatsapp_number, winner.whatsapp_message) });
		throw e;
	}
	return json({ url: whatsappUrl(config.whatsappNumber, message) }, { status: 201 });
};
