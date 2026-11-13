# Private password derivation Worker

Cloudflare's native PBKDF2 rejects iteration counts above 100,000. Existing Kohee admin hashes use PBKDF2-HMAC-SHA256 with 600,000 rounds. Running the audited `@noble/hashes` equivalent in the main Pages runtime exceeded its CPU budget (production error 1102). Keep the original hashes and work factor: this dedicated Worker runs in the existing Khwarizmi Workers account with a 5-second CPU ceiling. It uses the existing account's metered Workers usage; deployment does not enable or change a subscription.

Deploy with `npx wrangler deploy --config infrastructure/password/wrangler.jsonc --profile rizky`. Set a random `PASSWORD_KDF_TOKEN` using Wrangler secrets and configure that same server-only token in the Pages production environment. Set `PASSWORD_KDF_URL=https://kohee-password.khwarizmi.workers.dev` in the main site's config. Do not expose the token in public variables or browser code.

Only authenticated `POST /derive` is accepted, with a maximum 4 KiB body, a 1–256-character password and a 16-byte hex salt. The algorithm, 600,000 rounds and 32-byte output are fixed. Requests are rate-limited before derivation. No password, salt, derived key, request headers or bodies are logged or stored; responses are `no-store`. HTTPS transports credentials between the two existing Cloudflare accounts. Only the main website checks the resulting hash and issues sessions. Native PBKDF2 remains the default when supported; unavailable derivation fails closed with HTTP 503.

Verification: `npm test`, `npx tsc -p infrastructure/password/tsconfig.json`, and a known Node-generated hash vector tested against the deployed Worker. Main login invalid-credential checks must return HTTP 400 rather than 500/1102. No admin password reset is needed.

References: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Noble hashes](https://github.com/paulmillr/noble-hashes).
