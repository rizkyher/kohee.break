import { webcrypto } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

// Explicit CLI-only bootstrap. The SQL cannot replace an existing account or create a second admin.
const remote = process.argv.includes('--remote');
const quiet = new Writable({
	write(_chunk, _encoding, callback) {
		callback();
	}
});
const rl = createInterface({ input: process.stdin, output: quiet, terminal: true });
process.stdout.write(
	`Bootstrap ${remote ? 'REMOTE' : 'LOCAL'} admin: kohiibreak@gmail.com\nPassword baru (minimal 12 karakter, input disembunyikan): `
);
const password = process.env.KOHEE_ADMIN_PASSWORD ?? (await rl.question(''));
process.stdout.write('\nUlangi password: ');
const confirm = process.env.KOHEE_ADMIN_PASSWORD ?? (await rl.question(''));
rl.close();
process.stdout.write('\n');
if (password !== confirm || password.length < 12 || password.length > 256)
	throw new Error('Password berbeda atau panjangnya tidak valid.');
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey(
	'raw',
	new TextEncoder().encode(password),
	'PBKDF2',
	false,
	['deriveBits']
);
const bits = await webcrypto.subtle.deriveBits(
	{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
	key,
	256
);
const hash = `pbkdf2-sha256$600000$${Buffer.from(salt).toString('hex')}$${Buffer.from(bits).toString('hex')}`;
const dir = await mkdtemp(join(tmpdir(), 'kohee-admin-'));
try {
	const file = join(dir, 'bootstrap.sql');
	await writeFile(
		file,
		`INSERT INTO admin_users (id,email,name,password_hash,role) SELECT '${webcrypto.randomUUID()}','kohiibreak@gmail.com','Kohee Admin','${hash}','admin' WHERE NOT EXISTS (SELECT 1 FROM admin_users);`,
		{ mode: 0o600 }
	);
	const result = spawnSync(
		'npx',
		['wrangler', 'd1', 'execute', 'DB', remote ? '--remote' : '--local', '--file', file],
		{ stdio: 'inherit' }
	);
	if (result.status !== 0) process.exitCode = 1;
	else console.log('Bootstrap selesai. Akun hanya dibuat jika tabel admin masih kosong.');
} finally {
	await rm(dir, { recursive: true, force: true });
}
