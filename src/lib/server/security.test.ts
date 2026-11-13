import { describe, it, expect } from 'vitest';
import { requestJSON } from './request';
import { imageType } from './media';

describe('request and upload boundaries', () => {
	it('limits streamed JSON even without Content-Length', async () => {
		const request = new Request('https://kohee.example/api', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: 'x'.repeat(100) })
		});
		await expect(requestJSON(request, 20)).rejects.toMatchObject({ status: 413 });
	});
	it('rejects non-JSON and malformed JSON', async () => {
		await expect(
			requestJSON(new Request('https://kohee.example', { method: 'POST', body: '{}' }))
		).rejects.toMatchObject({ status: 415 });
		await expect(
			requestJSON(
				new Request('https://kohee.example', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: '{bad'
				})
			)
		).rejects.toMatchObject({ status: 400 });
	});
	it('rejects active content and truncated image headers', () => {
		expect(imageType(new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).toBeNull();
		expect(imageType(new Uint8Array([255, 216, 255]))).toBeNull();
		expect(imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBeNull();
	});
});
