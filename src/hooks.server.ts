import { database } from '#lib/server/db.ts';
import { retainCustomerData } from '#lib/server/retention.ts';
import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { readSession } from '#lib/server/auth.ts';
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (
		event.url.protocol === 'http:' &&
		!['localhost', '127.0.0.1', '[::1]'].includes(event.url.hostname)
	) {
		const secure = new URL(event.url);
		secure.protocol = 'https:';
		redirect(308, secure.href);
	}
	const protectedPath =
		pathname.startsWith('/admin') ||
		pathname.startsWith('/api/admin') ||
		pathname === '/api/delivery/settings';
	const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method);
	if (mutation && event.request.headers.get('origin') !== event.url.origin)
		error(403, 'Origin permintaan tidak valid.');
	if (pathname === '/' || protectedPath) await retainCustomerData(database());
	event.locals.user = null;
	event.locals.sessionHash = null;
	if (protectedPath) {
		await readSession(event);
		if (pathname !== '/admin/login' && !event.locals.user) {
			if (pathname.startsWith('/api/') && !pathname.startsWith('/api/map/'))
				error(401, 'Silakan login.');
			redirect(303, '/admin/login');
		}
	}
	const response = await resolve(event);
	if (
		protectedPath ||
		pathname === '/' ||
		(pathname.startsWith('/api/') && !pathname.startsWith('/api/map/'))
	)
		response.headers.set('cache-control', 'no-store');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(self)');
	if (event.url.protocol === 'https:')
		response.headers.set('strict-transport-security', 'max-age=31536000');
	if (protectedPath) response.headers.set('x-robots-tag', 'noindex, nofollow');
	return response;
};
