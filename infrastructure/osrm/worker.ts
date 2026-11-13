import { Container } from '@cloudflare/containers';

export class BandungRouter extends Container {
	defaultPort = 5000;
	sleepAfter = '5m';
	enableInternet = false;
}

export default {
	async fetch(request, env) {
		const reply = (message: string, status: number) =>
			Response.json({ message }, { status, headers: { 'cache-control': 'no-store' } });
		if (!env.OSRM_TOKEN) return reply('Routing service is not configured.', 503);
		const encode = new TextEncoder();
		const [provided, expected] = await Promise.all([
			crypto.subtle.digest('SHA-256', encode.encode(request.headers.get('authorization') ?? '')),
			crypto.subtle.digest('SHA-256', encode.encode(`Bearer ${env.OSRM_TOKEN}`))
		]);
		if (!crypto.subtle.timingSafeEqual(provided, expected)) return reply('Forbidden', 403);
		if (request.method !== 'GET') return reply('Method not allowed', 405);
		const url = new URL(request.url);
		const match =
			/^\/route\/v1\/driving\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(
				url.pathname
			);
		if (!match || url.pathname.length > 200) return reply('Invalid routing path', 400);
		const [lng1, lat1, lng2, lat2] = match.slice(1).map(Number);
		if (Math.abs(lng1) > 180 || Math.abs(lng2) > 180 || Math.abs(lat1) > 90 || Math.abs(lat2) > 90)
			return reply('Invalid coordinates', 400);
		if (!(await env.ROUTING_LIMIT.limit({ key: 'bandung' })).success)
			return reply('Too many routing requests', 429);
		// Fixed singleton, host, profile and options: callers cannot start arbitrary containers or upstream fetches.
		const upstream = new URL(url.pathname, 'http://container');
		upstream.search = 'overview=full&geometries=geojson&steps=false&radiuses=100;100';
		try {
			const result = await env.ROUTER.getByName('bandung').fetch(new Request(upstream));
			return new Response(result.body, {
				status: result.status,
				headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
			});
		} catch {
			console.error(JSON.stringify({ event: 'routing_unavailable' }));
			return reply('Routing temporarily unavailable', 503);
		}
	}
} satisfies ExportedHandler<RoutingEnv>;
