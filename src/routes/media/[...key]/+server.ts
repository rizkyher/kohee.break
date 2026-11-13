import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ params, request }) => {
	const key = params.key ?? '';
	if (!/^images\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) error(404);
	const bucket = env.MEDIA;
	if (!bucket) error(503, 'R2 belum dikonfigurasi.');
	const object = await bucket.get(key);
	if (!object) error(404);
	const headers = new Headers({
		'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
		'cache-control': 'public, max-age=31536000, immutable',
		etag: object.httpEtag,
		'x-content-type-options': 'nosniff',
		'content-security-policy': "default-src 'none'; sandbox"
	});
	if (request.headers.get('if-none-match') === object.httpEtag)
		return new Response(null, { status: 304, headers });
	return new Response(object.body as unknown as ReadableStream, { headers });
};
