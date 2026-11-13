import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requestJSON } from '#lib/server/request.ts';
import { database, throttle, audit } from '#lib/server/db.ts';
import { requireUser } from '#lib/server/auth.ts';
import { digest } from '#lib/server/password.ts';
import { deliverySettings, mapCredentials, createQuote } from '#lib/server/shipping.ts';
import { geocode } from '#lib/server/photon.ts';
import { deliverySchema, destinationSchema } from '#lib/studio/shipping.ts';
export const GET: RequestHandler = async () => {
	const { config } = await deliverySettings();
	const { tileJson, routingUrl } = mapCredentials();
	return json(
		{
			enabled: config.enabled,
			origin: config.origin,
			tileJson: '/api/map/basemap.json',
			configured: !!tileJson,
			routingConfigured: !!routingUrl
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
export const POST: RequestHandler = async (event) => {
	const action = event.params.action;
	const body = await requestJSON(event.request, 12000);
	if (action === 'settings') {
		const user = requireUser(event, true),
			input = deliverySchema.safeParse(body);
		if (!input.success) error(400, input.error.issues.map((i) => i.message).join('\n'));
		await database().batch([
			database()
				.prepare(
					"INSERT INTO delivery_settings (id,data,version) VALUES (1,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"
				)
				.bind(JSON.stringify(input.data)),
			audit(database(), user.id, 'update', 'delivery', 'settings')
		]);
		return json({ ok: true });
	}
	if (action === 'geocode') {
		await throttle(database(), `geocode:${await digest(event.getClientAddress())}`, 60, 60);
		const input = z.object({ query: z.string().trim().min(3).max(160) }).safeParse(body);
		if (!input.success) error(400, 'Masukkan 3–160 karakter nama jalan atau tempat.');
		return json(await geocode(input.data.query, (await deliverySettings()).config.origin));
	}
	await throttle(database(), `delivery:${await digest(event.getClientAddress())}`, 40, 600);
	if (action === 'quote') {
		const input = z
			.object({
				destination: destinationSchema,
				items: z
					.array(z.object({ id: z.string().min(1).max(100), qty: z.number().int().min(1).max(20) }))
					.min(1)
					.max(30)
			})
			.refine((i) => new Set(i.items.map((x) => x.id)).size === i.items.length)
			.safeParse(body);
		if (!input.success) error(400, 'Alamat atau keranjang tidak valid.');
		return json(await createQuote(input.data.destination, input.data.items));
	}
	error(404);
};
