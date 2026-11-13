import { spawnSync } from 'node:child_process';
// Daily operation, local unless --remote is explicitly supplied. Keep aggregate totals, remove PII.
const sql = `DELETE FROM shipping_quotes WHERE expires_at<=unixepoch()*1000; UPDATE orders SET whatsapp_message='',request_hash='',delivery_snapshot=json_remove(delivery_snapshot,'$.address','$.point','$.destination','$.origin','$.polyline','$.details','$.phone') WHERE delivery_snapshot IS NOT NULL AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days'); UPDATE orders SET customer_name='[Dihapus sesuai retensi]',delivery_snapshot=NULL,customer_note='',request_hash='',internal_note='',fulfillment='',whatsapp_message='' WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days'); DELETE FROM analytics_events WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days'); DELETE FROM admin_sessions WHERE expires_at <= unixepoch(); DELETE FROM rate_limits WHERE expires_at <= unixepoch();`;
const result = spawnSync(
	'npx',
	[
		'wrangler',
		'd1',
		'execute',
		'DB',
		process.argv.includes('--remote') ? '--remote' : '--local',
		'--command',
		sql
	],
	{ stdio: 'inherit' }
);
process.exitCode = result.status ?? 1;
