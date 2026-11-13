import { afterEach, expect, it, vi } from 'vitest';
import worker from '../../../infrastructure/password/worker';
import { timingSafeEqual } from 'node:crypto';

// Node WebCrypto lacks Workers' timingSafeEqual extension.
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
const token = 'test-only';
const env = { PASSWORD_KDF_TOKEN: token, KDF_LIMIT: { limit: async () => ({ success: true }) } };
async function call(body: unknown, authorization = `Bearer ${token}`) {
	vi.stubGlobal('crypto', {
		subtle: {
			digest: globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle),
			timingSafeEqual
		}
	});
	return worker.fetch(
		new Request('https://kdf.example/derive', {
			method: 'POST',
			headers: { authorization },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		}),
		env
	);
}
it('authenticates before deriving and rejects invalid or oversized input', async () => {
	expect((await call({}, 'Bearer wrong')).status).toBe(403);
	expect((await call({ password: 'valid', salt: 'bad' })).status).toBe(400);
	expect((await call('x'.repeat(4097))).status).toBe(413);
});
it('derives exactly the existing 600000-round SHA256 password format', async () => {
	const response = await call({
		password: 'uji-password-aman',
		salt: '00112233445566778899aabbccddeeff'
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({
		key: '2398df2f8115582a1dcf248088690b559c30ecbba0c39249399dd3fb29023f37'
	});
	expect(response.headers.get('cache-control')).toBe('no-store');
});
