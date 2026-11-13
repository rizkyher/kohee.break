// Local acceptance against the actual Cloudflare Worker and Bandung OSRM container, never a demo.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = process.env.KOHEE_ROUTING_TEST_URL ?? 'http://localhost:5002';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const vars = await readFile('infrastructure/osrm/.dev.vars', 'utf8');
const token = vars
	.split('\n')
	.find((line) => line.startsWith('OSRM_TOKEN='))
	?.slice(11)
	.trim();
assert.ok(token, 'Configure the ignored infrastructure/osrm/.dev.vars file first.');
const headers = { authorization: `Bearer ${token}` };
const route = '/route/v1/driving/107.6188,-6.9025;107.6098,-6.9215';
assert.equal((await fetch(base + route)).status, 403);
assert.equal(
	(await fetch(base + route, { headers: { authorization: 'Bearer wrong' } })).status,
	403
);
assert.equal((await fetch(base + '/table/v1/driving/107,-6', { headers })).status, 400);
assert.equal((await fetch(base + '/route/v1/driving/107,91;108,-6', { headers })).status, 400);
assert.equal((await fetch(base + route, { method: 'POST', headers })).status, 405);
const response = await fetch(base + route + '?geometries=polyline&steps=true', { headers });
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store');
const data = await response.json();
assert.equal(data.code, 'Ok');
assert.equal(data.routes[0].geometry.type, 'LineString');
assert.ok(data.routes[0].distance > 0);
const unreachable = await fetch(base + '/route/v1/driving/0,0;0.001,0.001', { headers });
assert.equal(unreachable.status, 400);
assert.equal((await unreachable.json()).code, 'NoSegment');
console.log(
	`PASS: Cloudflare Worker → actual Bandung OSRM ${data.routes[0].distance}m; authentication, method/path/coordinate restrictions, fixed GeoJSON options and NoSegment handling.`
);
