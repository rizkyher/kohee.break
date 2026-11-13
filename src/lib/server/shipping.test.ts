import { it, expect, vi, afterEach } from 'vitest';
import { defaultDelivery } from '#lib/studio/shipping.ts';
import { digest } from './password';
const state = vi.hoisted(() => ({
	config: '',
	version: 1,
	price: 20000,
	quote: null as null | {
		data: string;
		cart_hash: string;
		settings_version: number;
		expires_at: number;
	}
}));
vi.mock('./map-credentials', () => ({
	mapCredentials: () => ({
		routingUrl: 'https://routing.kohee.test',
		routingToken: 'unit-test-token',
		tileJson: '',
		photonUrl: ''
	})
}));
vi.mock('./db', () => ({
	database: () => ({
		prepare: (sql: string) => ({
			bind() {
				return this;
			},
			async first() {
				return sql.includes('delivery_settings')
					? { data: state.config, version: state.version }
					: state.quote;
			},
			async all() {
				return {
					results: [
						{ id: 'coffee', price: state.price, available: 1, stock: null, status: 'published' }
					]
				};
			},
			async run() {
				return { success: true };
			}
		})
	})
}));
import { createQuote, validateQuote } from './shipping';
const destination = {
	address: 'Alamat uji terkonfirmasi',
	point: { lat: -6, lng: 106 },
	details: '',
	phone: ''
};
const items = [{ id: 'coffee', qty: 1 }];
afterEach(() => vi.unstubAllGlobals());
function configure(extra: Record<string, unknown> = {}) {
	state.config = JSON.stringify({
		...defaultDelivery,
		origin: { lat: -6.1, lng: 106.1 },
		originAddress: 'Toko uji',
		enabled: true,
		...extra
	});
	state.version = 1;
	state.price = 20000;
}
it('uses provider road distance and applies updated origin/rate without fake fallback', async () => {
	configure();
	const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
		void options;
		return new Response(
			JSON.stringify({
				code: 'Ok',
				routes: [
					{
						distance: 4300,
						geometry: {
							type: 'LineString',
							coordinates: [
								[106, -6],
								[107, -7]
							]
						}
					}
				]
			}),
			{ status: 200 }
		);
	});
	vi.stubGlobal('fetch', fetcher);
	expect((await createQuote(destination, items)).fee).toBe(9000);
	configure({ rate: 4000, origin: { lat: -7, lng: 107 } });
	expect((await createQuote(destination, items)).fee).toBe(12000);
	expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain('107,-7;');
});
it('rejects provider failures unless explicit manual mode and never treats unreachable routes as free', async () => {
	configure();
	vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
	await expect(createQuote(destination, items)).rejects.toMatchObject({ status: 502 });
	configure({ manualFallback: true });
	expect((await createQuote(destination, items)).fee).toBeNull();
	vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ code: 'NoRoute', routes: [] })));
	await expect(createQuote(destination, items)).rejects.toMatchObject({ status: 422 });
	vi.stubGlobal(
		'fetch',
		async () => new Response(JSON.stringify({ code: 'NoSegment' }), { status: 400 })
	);
	await expect(createQuote(destination, items)).rejects.toMatchObject({ status: 422 });
});
it('rejects expired quotes, changed rules, destination or catalog price', async () => {
	configure();
	const data = {
		id: crypto.randomUUID(),
		fee: 9000,
		distance: 4300,
		expires: Date.now() + 60000,
		status: 'quoted',
		polyline: '',
		address: destination.address,
		destination: destination.point,
		origin: { lat: -6.1, lng: 106.1 }
	};
	state.quote = {
		data: JSON.stringify(data),
		cart_hash: await digest(JSON.stringify([{ id: 'coffee', qty: 1, price: 20000 }])),
		settings_version: 1,
		expires_at: data.expires
	};
	expect((await validateQuote(data.id, destination, items)).fee).toBe(9000);
	await expect(
		validateQuote(data.id, { ...destination, point: { lat: -7, lng: 106 } }, items)
	).rejects.toMatchObject({ status: 409 });
	state.version = 2;
	await expect(validateQuote(data.id, destination, items)).rejects.toMatchObject({ status: 409 });
	state.version = 1;
	state.price = 25000;
	await expect(validateQuote(data.id, destination, items)).rejects.toMatchObject({ status: 409 });
	state.price = 20000;
	state.quote.expires_at = 0;
	await expect(validateQuote(data.id, destination, items)).rejects.toMatchObject({ status: 409 });
	expect(JSON.parse(state.quote.data).fee).toBe(9000);
});

import { routingEndpoint } from './osrm';
import { coordinates } from '#lib/studio/shipping.ts';
it('rejects invalid coordinates, arbitrary URL schemes and demo routing origins', () => {
	expect(coordinates.safeParse({ lat: 91, lng: 107 }).success).toBe(false);
	expect(coordinates.safeParse({ lat: -6, lng: 181 }).success).toBe(false);
	for (const url of [
		'file:///etc/passwd',
		'http://example.com',
		'https://router.project-osrm.org',
		'https://example.com/?url=http://internal',
		'https://user:password@example.com'
	])
		expect(() => routingEndpoint(url)).toThrow();
	expect(routingEndpoint('http://localhost:5001').hostname).toBe('localhost');
});
