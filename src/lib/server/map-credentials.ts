import { env } from 'cloudflare:workers';
/** All upstream addresses are operator configuration, never customer input. */
export function mapCredentials() {
	const e = env as unknown as Record<string, string>;
	return {
		tileJson: e.MAP_TILEJSON_URL ?? '',
		routingUrl: e.OSRM_URL ?? '',
		routingToken: e.OSRM_TOKEN ?? '',
		photonUrl: e.PHOTON_URL ?? '',
		photonToken: e.PHOTON_TOKEN ?? ''
	};
}
