// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Generated Worker bindings use global declarations.
/// <reference path="./worker-env.d.ts" />
import type { SubtleCrypto as WorkersSubtleCrypto } from '@cloudflare/workers-types';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export default {
	async fetch(request: Request, env: PasswordEnv) {
		const reply = (body: object, status = 200) =>
			Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
		if (!env.PASSWORD_KDF_TOKEN) return reply({ message: 'Unavailable' }, 503);
		const encoder = new TextEncoder();
		const [provided, expected] = await Promise.all([
			crypto.subtle.digest('SHA-256', encoder.encode(request.headers.get('authorization') ?? '')),
			crypto.subtle.digest('SHA-256', encoder.encode(`Bearer ${env.PASSWORD_KDF_TOKEN}`))
		]);
		if (!(crypto.subtle as WorkersSubtleCrypto).timingSafeEqual(provided, expected))
			return reply({ message: 'Forbidden' }, 403);
		if (request.method !== 'POST' || new URL(request.url).pathname !== '/derive')
			return reply({ message: 'Not found' }, 404);
		if (!(await env.KDF_LIMIT.limit({ key: 'studio' })).success)
			return reply({ message: 'Too many requests' }, 429);
		const reader = request.body?.getReader();
		if (!reader) return reply({ message: 'Invalid input' }, 400);
		let text = '',
			size = 0;
		const decoder = new TextDecoder();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 4096) {
				await reader.cancel();
				return reply({ message: 'Too large' }, 413);
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
		let input: { password?: unknown; salt?: unknown };
		try {
			input = JSON.parse(text);
		} catch {
			return reply({ message: 'Invalid input' }, 400);
		}
		if (
			!input ||
			typeof input.password !== 'string' ||
			input.password.length < 1 ||
			input.password.length > 256 ||
			typeof input.salt !== 'string' ||
			!/^[a-f0-9]{32}$/.test(input.salt)
		)
			return reply({ message: 'Invalid input' }, 400);
		// Fixed algorithm, work factor and output size; callers cannot request unbounded CPU work.
		const salt = Uint8Array.from(input.salt.match(/../g)!, (x) => parseInt(x, 16));
		const key = await pbkdf2Async(sha256, encoder.encode(input.password), salt, {
			c: 600000,
			dkLen: 32
		});
		return reply({ key: [...key].map((x) => x.toString(16).padStart(2, '0')).join('') });
	}
} satisfies ExportedHandler<PasswordEnv>;
