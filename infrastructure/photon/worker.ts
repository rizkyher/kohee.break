import { Container } from '@cloudflare/containers';
import { searchBounds } from '../../src/lib/studio/geocoding';

export class BandungSearch extends Container {
	defaultPort = 2322;
	sleepAfter = '5m';
	enableInternet = false;
}
export default {
	async fetch(request, env) {
		const reply = (message: string, status: number) =>
			Response.json({ message }, { status, headers: { 'cache-control': 'no-store' } });
		if (!env.PHOTON_TOKEN) return reply('Search is not configured.', 503);
		const encode = new TextEncoder();
		const [provided, expected] = await Promise.all([
			crypto.subtle.digest('SHA-256', encode.encode(request.headers.get('authorization') ?? '')),
			crypto.subtle.digest('SHA-256', encode.encode(`Bearer ${env.PHOTON_TOKEN}`))
		]);
		if (!crypto.subtle.timingSafeEqual(provided, expected)) return reply('Forbidden', 403);
		if (request.method !== 'GET') return reply('Method not allowed', 405);
		const incoming = new URL(request.url);
		if (incoming.pathname !== '/api') return reply('Not found', 404);
		const query = (incoming.searchParams.get('q') ?? '').trim();
		if (query.length < 3 || query.length > 160) return reply('Invalid query', 400);
		if (!(await env.SEARCH_LIMIT.limit({ key: 'bandung' })).success)
			return reply('Too many searches', 429);
		const url = new URL('http://container/api');
		url.searchParams.set('q', query);
		url.searchParams.set('limit', '5');
		url.searchParams.set('bbox', searchBounds.join(','));
		const lat = Number(incoming.searchParams.get('lat')),
			lon = Number(incoming.searchParams.get('lon'));
		url.searchParams.set(
			'lat',
			String(
				Number.isFinite(lat) && lat >= searchBounds[1] && lat <= searchBounds[3]
					? lat
					: (searchBounds[1] + searchBounds[3]) / 2
			)
		);
		url.searchParams.set(
			'lon',
			String(
				Number.isFinite(lon) && lon >= searchBounds[0] && lon <= searchBounds[2]
					? lon
					: (searchBounds[0] + searchBounds[2]) / 2
			)
		);
		try {
			const result = await env.SEARCH.getByName('bandung').fetch(new Request(url));
			return new Response(result.body, {
				status: result.status,
				headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
			});
		} catch {
			console.error(JSON.stringify({ event: 'search_unavailable' }));
			return reply('Search temporarily unavailable', 503);
		}
	}
} satisfies ExportedHandler<SearchEnv>;
