import type { D1Database } from '@cloudflare/workers-types';
/** Idempotent daily maintenance on traffic; CLI is also available for a no-traffic scheduled job. */
export async function retainCustomerData(db: D1Database) {
	const time = Math.floor(Date.now() / 1000);
	const last = await db
		.prepare("SELECT expires_at FROM rate_limits WHERE key='maintenance:retention'")
		.first<{ expires_at: number }>();
	if (last && last.expires_at > time) return;
	await db.prepare('DELETE FROM shipping_quotes WHERE expires_at<=?').bind(Date.now()).run();
	await db
		.prepare(
			"UPDATE orders SET whatsapp_message='',request_hash='',delivery_snapshot=json_remove(delivery_snapshot,'$.address','$.point','$.destination','$.origin','$.polyline','$.details','$.phone') WHERE delivery_snapshot IS NOT NULL AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')"
		)
		.run();
	await db.batch([
		db.prepare(
			"UPDATE orders SET customer_name='[Dihapus sesuai retensi]',delivery_snapshot=NULL,customer_note='',request_hash='',internal_note='',fulfillment='',whatsapp_message='' WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days') AND customer_name <> '[Dihapus sesuai retensi]'"
		),
		db.prepare(
			"DELETE FROM analytics_events WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"
		),
		db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(time),
		db.prepare('DELETE FROM rate_limits WHERE expires_at<=?').bind(time),
		db
			.prepare(
				"INSERT INTO rate_limits (key,count,expires_at) VALUES ('maintenance:retention',1,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at"
			)
			.bind(time + 86400)
	]);
}
