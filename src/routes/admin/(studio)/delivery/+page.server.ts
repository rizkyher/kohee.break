import { requireUser } from '#lib/server/auth.ts';
import { deliverySettings, mapCredentials } from '#lib/server/shipping.ts';
export const load = async (event: import('@sveltejs/kit').RequestEvent) => {
	requireUser(event, true);
	const { config, version } = await deliverySettings();
	const keys = mapCredentials();
	return { config, version, configured: !!keys.routingUrl && !!keys.tileJson };
};
