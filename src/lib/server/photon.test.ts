import { afterEach, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({
	photonUrl: 'https://search.kohee.test',
	photonToken: 'test-only'
}));
vi.mock('./map-credentials', () => ({ mapCredentials: () => config }));
import { geocode, photonEndpoint } from './photon';
afterEach(() => {
	vi.unstubAllGlobals();
	config.photonUrl = 'https://search.kohee.test';
	config.photonToken = 'test-only';
});
const place = (lng = 107.619, lat = -6.902) => ({
	geometry: { type: 'Point', coordinates: [lng, lat] },
	properties: { name: 'Gedung Sate', street: 'Jalan Diponegoro', city: 'Bandung' }
});
it('searches a fixed Photon endpoint with authentication, regional bounds and origin bias', async () => {
	const fetcher = vi.fn<(url: URL, options: RequestInit) => Promise<Response>>(async () =>
		Response.json({ features: [place()] })
	);
	vi.stubGlobal('fetch', fetcher);
	const result = await geocode('  Gedung Sate ', { lat: -6.95, lng: 107.6 });
	expect(result.results[0].label).toBe('Gedung Sate, Jalan Diponegoro, Bandung');
	expect(result.results[0].point).toEqual({ lat: -6.902, lng: 107.619 });
	const [url, options] = fetcher.mock.calls[0];
	expect(url.pathname).toBe('/api');
	expect(url.searchParams.get('q')).toBe('Gedung Sate');
	expect(url.searchParams.get('bbox')).toBe('107.25,-7.3,108.05,-6.55');
	expect(url.searchParams.get('lat')).toBe('-6.95');
	expect(options.headers).toEqual({ Authorization: 'Bearer test-only' });
	expect(options.redirect).toBe('manual');
});
it('deduplicates results and excludes locations outside Bandung', async () => {
	vi.stubGlobal('fetch', async () => Response.json({ features: [place(), place(), place(0, 0)] }));
	expect((await geocode('Bandung')).results).toHaveLength(1);
	vi.stubGlobal('fetch', async () => Response.json({ features: [] }));
	expect((await geocode('unknown')).results).toEqual([]);
});
it('fails clearly for unavailable, redirected and malformed providers', async () => {
	for (const response of [
		new Response('', { status: 503 }),
		new Response('', { status: 302 }),
		Response.json({ features: [place(107, 91)] })
	]) {
		vi.stubGlobal('fetch', async () => response);
		await expect(geocode('Bandung')).rejects.toMatchObject({ status: 502 });
	}
});
it('rejects insecure/demo URLs and remote requests without a secret', async () => {
	for (const raw of [
		'',
		'file:///etc/passwd',
		'http://example.com',
		'https://photon.komoot.io',
		'https://user:pass@example.com',
		'https://example.com/?url=internal'
	])
		expect(() => photonEndpoint(raw)).toThrow();
	expect(photonEndpoint('http://localhost:2322').local).toBe(true);
	config.photonToken = '';
	const fetcher = vi.fn();
	vi.stubGlobal('fetch', fetcher);
	await expect(geocode('Bandung')).rejects.toMatchObject({ status: 503 });
	expect(fetcher).not.toHaveBeenCalled();
});
