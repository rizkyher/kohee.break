import { afterEach, expect, it, vi } from 'vitest';
import { pbkdf2Sync } from 'node:crypto';
vi.mock('./password-credentials', () => ({
	passwordCredentials: () => ({ url: 'https://kdf.example', token: 'test-only' })
}));
import { hashPassword, verifyPassword } from './password';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it('preserves existing 600000-round hashes when Workers rejects native PBKDF2', async () => {
	vi.spyOn(crypto.subtle, 'deriveBits').mockRejectedValue(
		new DOMException('iteration counts above 100000 are not supported', 'NotSupportedError')
	);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url, init) => {
			expect(String(url)).toBe('https://kdf.example/derive');
			expect(init.redirect).toBe('manual');
			const { password, salt } = JSON.parse(init.body);
			return Response.json({
				key: pbkdf2Sync(password, Buffer.from(salt, 'hex'), 600000, 32, 'sha256').toString('hex')
			});
		})
	);
	// Generated independently with Node crypto.pbkdf2Sync, using the hex-decoded salt.
	const stored =
		'pbkdf2-sha256$600000$00112233445566778899aabbccddeeff$2398df2f8115582a1dcf248088690b559c30ecbba0c39249399dd3fb29023f37';
	expect(await verifyPassword('uji-password-aman', stored)).toBe(true);
	expect(await verifyPassword('password-salah', stored)).toBe(false);
	const created = await hashPassword('password-baru');
	expect(created).toMatch(/^pbkdf2-sha256\$600000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
	expect(await verifyPassword('password-baru', created)).toBe(true);
}, 15000);

it('does not hide unexpected cryptographic failures', async () => {
	vi.spyOn(crypto.subtle, 'deriveBits').mockRejectedValue(new Error('unexpected failure'));
	await expect(hashPassword('password-baru')).rejects.toThrow('unexpected failure');
});

it('fails closed when the private password service is unavailable', async () => {
	vi.spyOn(crypto.subtle, 'deriveBits').mockRejectedValue(
		new DOMException('cap', 'NotSupportedError')
	);
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('Unavailable', { status: 503 }))
	);
	await expect(hashPassword('password-baru')).rejects.toMatchObject({ status: 503 });
});
