import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { AdminUser } from '#lib/studio/contracts.ts';
import { database } from './db';
import { digest, randomToken } from './password';
export const SESSION_COOKIE = 'kohee_session';
const lifetime = 60 * 60 * 8;
export function requireUser(event: Pick<RequestEvent, 'locals'>, admin = false): AdminUser {
	if (!event.locals.user) error(401, 'Silakan login.');
	if (admin && event.locals.user.role !== 'admin') error(403, 'Akses ini hanya untuk Admin.');
	return event.locals.user;
}
export async function readSession(event: RequestEvent) {
	event.locals.user = null;
	event.locals.sessionHash = null;
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
	const db = database(),
		hash = await digest(token);
	const user = await db
		.prepare(
			'SELECT u.id,u.email,u.name,u.role FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?'
		)
		.bind(hash, Math.floor(Date.now() / 1000))
		.first<AdminUser>();
	if (user) {
		event.locals.user = user;
		event.locals.sessionHash = hash;
	} else event.cookies.delete(SESSION_COOKIE, { path: '/' });
}
export async function createSession(event: RequestEvent, user: AdminUser) {
	const token = randomToken(),
		db = database();
	await db.batch([
		db
			.prepare('DELETE FROM admin_sessions WHERE expires_at <= ? OR token_hash=?')
			.bind(Math.floor(Date.now() / 1000), event.locals.sessionHash ?? ''),
		db
			.prepare('INSERT INTO admin_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)')
			.bind(await digest(token), user.id, Math.floor(Date.now() / 1000) + lifetime)
	]);
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure:
			event.url.protocol === 'https:' ||
			!['localhost', '127.0.0.1', '[::1]'].includes(event.url.hostname),
		maxAge: lifetime
	});
}
export async function logout(event: RequestEvent): Promise<never> {
	if (event.locals.sessionHash)
		await database()
			.prepare('DELETE FROM admin_sessions WHERE token_hash=?')
			.bind(event.locals.sessionHash)
			.run();
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/admin/login');
}
