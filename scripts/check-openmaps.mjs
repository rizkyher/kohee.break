// Actual local services only. Uses public landmark test coordinates, never saves a business origin.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const vars = Object.fromEntries(
	(await readFile('.dev.vars', 'utf8'))
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => {
			const i = l.indexOf('=');
			return [l.slice(0, i), l.slice(i + 1)];
		})
);
const base = new URL(vars.OSRM_URL);
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Local service test only.');
const url = new URL(
	'/route/v1/driving/107.6188,-6.9025;107.6098,-6.9215?overview=full&geometries=geojson',
	base
);
const denied = await fetch(url);
assert.equal(denied.status, 403);
const response = await fetch(url, { headers: { Authorization: `Bearer ${vars.OSRM_TOKEN}` } });
assert.equal(response.status, 200);
const data = await response.json();
assert.equal(data.code, 'Ok');
assert.ok(data.routes[0].distance > 0);
assert.equal(data.routes[0].geometry.type, 'LineString');
const tiles = await fetch(vars.MAP_TILEJSON_URL);
assert.equal(tiles.status, 200);
const meta = await tiles.json();
assert.equal(meta.maxzoom, 15);
assert.deepEqual(meta.bounds, [107.25, -7.3, 108.05, -6.55]);
console.log(
	`PASS: official PMTiles/R2 Bandung tileset; OSRM real road route ${data.routes[0].distance} meters; unauthenticated routing denied.`
);
