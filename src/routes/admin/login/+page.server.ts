import { requestForm } from '#lib/server/request.ts';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loginSchema } from '#lib/studio/contracts.ts';
import { database, throttle, audit } from '#lib/server/db.ts';
import { verifyPassword, digest } from '#lib/server/password.ts';
import { createSession } from '#lib/server/auth.ts';
import type { AdminUser } from '#lib/studio/contracts.ts';
export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/admin');
	return {};
};
export const actions: Actions = {
	default: async (event) => {
		const data = loginSchema.safeParse(Object.fromEntries(await requestForm(event.request, 8192)));
		if (!data.success) return fail(400, { message: 'Isi email dan password yang valid.' });
		const db = database();
		const ip = event.getClientAddress();
		await throttle(db, `login-ip:${await digest(ip)}`, 30, 900);
		await throttle(db, `login-email:${await digest(data.data.email)}`, 8, 900);
		const user = await db
			.prepare('SELECT * FROM admin_users WHERE email=?')
			.bind(data.data.email)
			.first<AdminUser & { password_hash: string }>();
		// Unknown accounts still perform the same expensive password derivation.
		const passwordHash =
			user?.password_hash ??
			'pbkdf2-sha256$600000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
		const valid = await verifyPassword(data.data.password, passwordHash);
		if (!user || !valid) return fail(400, { message: 'Email atau password salah.' });
		await createSession(event, user);
		await audit(db, user.id, 'login', 'admin', user.id).run();
		redirect(303, '/admin');
	}
};
