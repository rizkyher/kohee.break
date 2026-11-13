import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
export const now = () => new Date().toISOString();
export function database(): D1Database {
	if (!env.DB) error(503, 'Database belum dikonfigurasi. Ikuti panduan Kohee Studio.');
	return env.DB;
}

export function audit(
	db: D1Database,
	actor: string | null,
	action: string,
	entity: string,
	id: string
): D1PreparedStatement {
	return db
		.prepare('INSERT INTO activity_logs (id,actor_id,action,entity,entity_id) VALUES (?,?,?,?,?)')
		.bind(crypto.randomUUID(), actor, action, entity, id);
}
export async function throttle(db: D1Database, key: string, limit: number, seconds: number) {
	const time = Math.floor(Date.now() / 1000);
	const row = await db
		.prepare(
			`INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at <= ? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING count`
		)
		.bind(key, time + seconds, time, time)
		.first<{ count: number }>();
	if (!row || row.count > limit) error(429, 'Terlalu banyak percobaan. Coba lagi nanti.');
}
