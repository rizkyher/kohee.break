import { error } from '@sveltejs/kit';
import { mapCredentials } from './map-credentials';
import type { Destination } from '#lib/studio/shipping.ts';
export function routingEndpoint(raw: string) {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		error(503, 'Endpoint OSRM belum dikonfigurasi.');
	}
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	if (
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		(url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
		/router\.project-osrm\.org$/i.test(url.hostname)
	)
		error(503, 'Gunakan OSRM privat HTTPS, bukan server demo.');
	return url;
}
export async function roadRoute(origin: Destination['point'], destination: Destination['point']) {
	const { routingUrl, routingToken } = mapCredentials(),
		url = routingEndpoint(routingUrl);
	if (!routingToken && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
		error(503, 'Token OSRM privat belum dikonfigurasi.');
	url.pathname =
		url.pathname.replace(/\/$/, '') +
		`/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
	url.searchParams.set('overview', 'full');
	url.searchParams.set('geometries', 'geojson');
	url.searchParams.set('steps', 'false');
	url.searchParams.set('radiuses', '100;100');
	const response = await fetch(url, {
		headers: routingToken ? { Authorization: `Bearer ${routingToken}` } : {},
		redirect: 'manual',
		signal: AbortSignal.timeout(12000)
	});

	const data = (await response.json()) as {
		code: string;
		routes?: { distance: number; geometry: { type: string; coordinates: number[][] } }[];
	};
	if (['NoRoute', 'NoSegment'].includes(data.code))
		error(422, 'Tidak ada rute jalan yang dapat menjangkau titik tersebut.');
	if (!response.ok) throw Error('OSRM transport failure');
	const route = data.routes?.[0];
	if (
		data.code !== 'Ok' ||
		!route ||
		!Number.isFinite(route.distance) ||
		route.distance < 0 ||
		route.geometry?.type !== 'LineString' ||
		!Array.isArray(route.geometry.coordinates) ||
		route.geometry.coordinates.length < 2
	)
		throw Error('Invalid OSRM result');
	if (
		route.geometry.coordinates.some(
			(p) =>
				p.length < 2 ||
				!Number.isFinite(p[0]) ||
				!Number.isFinite(p[1]) ||
				Math.abs(p[0]) > 180 ||
				Math.abs(p[1]) > 90
		)
	)
		throw Error('Invalid OSRM geometry');
	return { distance: route.distance, polyline: JSON.stringify(route.geometry) };
}
