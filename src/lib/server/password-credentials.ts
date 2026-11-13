import { env } from 'cloudflare:workers';
export function passwordCredentials() {
	const bindings = env as typeof env & { PASSWORD_KDF_URL?: string; PASSWORD_KDF_TOKEN?: string };
	return { url: bindings.PASSWORD_KDF_URL, token: bindings.PASSWORD_KDF_TOKEN };
}
