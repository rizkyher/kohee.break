import { passwordCredentials } from './password-credentials';
import { error } from '@sveltejs/kit';

const iterations = 600_000;
const encoder = new TextEncoder();
const toHex = (v: Uint8Array) => [...v].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (v: string) => Uint8Array.from(v.match(/../g) ?? [], (v) => parseInt(v, 16));
async function derive(password: string, salt: Uint8Array, rounds: number) {
	const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	try {
		return new Uint8Array(
			await crypto.subtle.deriveBits(
				{
					name: 'PBKDF2',
					hash: 'SHA-256',
					salt: salt as Uint8Array<ArrayBuffer>,
					iterations: rounds
				},
				key,
				256
			)
		);
	} catch (cause) {
		if (!(cause instanceof DOMException) || cause.name !== 'NotSupportedError') throw cause;
		// Workers caps native PBKDF2 at 100000; preserve existing 600000-round hashes.
		const bindings = passwordCredentials();
		if (!bindings.url || !bindings.token) error(503, 'Layanan login belum dikonfigurasi.');
		const url = new URL(bindings.url);
		if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
			error(503, 'Konfigurasi layanan login tidak valid.');
		try {
			const response = await fetch(new URL('/derive', url), {
				method: 'POST',
				headers: {
					authorization: `Bearer ${bindings.token}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({ password, salt: toHex(salt) }),
				redirect: 'manual',
				signal: AbortSignal.timeout(15000)
			});
			if (!response.ok) throw Error('KDF unavailable', { cause });
			const result = (await response.json()) as { key?: unknown };
			if (typeof result.key !== 'string' || !/^[a-f0-9]{64}$/.test(result.key))
				throw Error('Invalid KDF output', { cause });
			return fromHex(result.key);
		} catch {
			error(503, 'Layanan login sedang tidak tersedia. Coba lagi nanti.');
		}
	}
}
export async function hashPassword(password: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `pbkdf2-sha256$${iterations}$${toHex(salt)}$${toHex(await derive(password, salt, iterations))}`;
}
export async function verifyPassword(password: string, stored: string) {
	const [algorithm, rounds, salt, hash] = stored.split('$');
	if (
		algorithm !== 'pbkdf2-sha256' ||
		Number(rounds) !== iterations ||
		!/^[a-f0-9]{32}$/.test(salt ?? '') ||
		!/^[a-f0-9]{64}$/.test(hash ?? '')
	)
		return false;
	const actual = await derive(password, fromHex(salt), Number(rounds));
	const expected = fromHex(hash);
	let diff = 0;
	for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
	return diff === 0;
}
export async function digest(value: string) {
	return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
export const randomToken = () => toHex(crypto.getRandomValues(new Uint8Array(32)));
