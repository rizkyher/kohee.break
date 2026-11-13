import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { mapCredentials } from './map-credentials';
import { searchBounds, type AddressResult } from '#lib/studio/geocoding.ts';
import type { Destination } from '#lib/studio/shipping.ts';

export function photonEndpoint(raw: string) {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		error(503, 'Pencarian alamat belum dikonfigurasi. Pilih titik di peta.');
	}
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	if (
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		(url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
		url.hostname === 'photon.komoot.io'
	)
		error(503, 'Gunakan layanan Photon privat.');
	return { url, local };
}
const feature = z.object({
	geometry: z.object({
		type: z.literal('Point'),
		coordinates: z.tuple([
			z.number().finite().min(-180).max(180),
			z.number().finite().min(-90).max(90)
		])
	}),
	properties: z.record(z.string(), z.unknown())
});
export async function geocode(
	query: string,
	focus: Destination['point'] | null = null
): Promise<{ results: AddressResult[] }> {
	query = z.string().trim().min(3).max(160).parse(query);
	const { photonUrl, photonToken } = mapCredentials();
	const { url, local } = photonEndpoint(photonUrl);
	if (!local && !photonToken) error(503, 'Token layanan pencarian belum dikonfigurasi.');
	url.pathname = url.pathname.replace(/\/$/, '') + '/api';
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '5');
	url.searchParams.set('bbox', searchBounds.join(','));
	url.searchParams.set('lat', String(focus?.lat ?? (searchBounds[1] + searchBounds[3]) / 2));
	url.searchParams.set('lon', String(focus?.lng ?? (searchBounds[0] + searchBounds[2]) / 2));
	try {
		const response = await fetch(url, {
			headers: photonToken ? { Authorization: `Bearer ${photonToken}` } : {},
			redirect: 'manual',
			signal: AbortSignal.timeout(30000)
		});
		if (!response.ok) throw Error('Photon unavailable');
		const data = z.object({ features: z.array(feature).max(50) }).parse(await response.json());
		const results: AddressResult[] = [];
		const seen = new Set<string>();
		for (const f of data.features) {
			const [lng, lat] = f.geometry.coordinates;
			if (
				lng < searchBounds[0] ||
				lng > searchBounds[2] ||
				lat < searchBounds[1] ||
				lat > searchBounds[3]
			)
				continue;
			const p = f.properties;
			const label = [
				...new Set(
					['name', 'street', 'housenumber', 'district', 'city', 'county', 'state', 'postcode']
						.map((k) => p[k])
						.filter((v): v is string => typeof v === 'string' && !!v.trim())
						.map((v) => v.trim())
				)
			]
				.join(', ')
				.slice(0, 500);
			if (!label) continue;
			const id = `${lng},${lat}:${label}`;
			if (!seen.has(id)) {
				results.push({ id, label, point: { lat, lng } });
				seen.add(id);
			}
			if (results.length === 5) break;
		}
		return { results };
	} catch {
		error(502, 'Pencarian alamat sedang tidak tersedia. Coba lagi atau pilih titik di peta.');
	}
}
