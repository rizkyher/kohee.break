import { error } from '@sveltejs/kit';
/** Enforce real streamed size as well as Content-Length (which may be absent or dishonest). */
export async function requestBytes(request: Request, max: number) {
	const announced = Number(request.headers.get('content-length'));
	if (announced > max) error(413, 'Ukuran permintaan terlalu besar.');
	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > max) {
				await reader.cancel();
				error(413, 'Ukuran permintaan terlalu besar.');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
export async function requestJSON(request: Request, max = 65536): Promise<unknown> {
	if (!request.headers.get('content-type')?.startsWith('application/json'))
		error(415, 'Gunakan JSON.');
	const bytes = await requestBytes(request, max);
	try {
		return JSON.parse(new TextDecoder().decode(bytes));
	} catch {
		error(400, 'JSON tidak valid.');
	}
}
export async function requestForm(request: Request, max: number) {
	const bytes = await requestBytes(request, max);
	try {
		return await new Response(bytes, {
			headers: { 'content-type': request.headers.get('content-type') ?? '' }
		}).formData();
	} catch {
		error(400, 'Form tidak valid.');
	}
}
