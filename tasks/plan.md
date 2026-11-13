# Kohee Studio implementation

The supplied Admin Studio brief is the accepted specification. Extend the existing SvelteKit 3.1.1 storefront, preserving its visual identity, sections, and motion. Use the installed Cloudflare adapter 8.0.2 and D1/R2 bindings. Server-render published data without HTML caching so publishing takes effect on the next request.

## Architecture and boundaries

- Server-only prepared D1 statements, Zod request schemas, atomic D1 batches, R2 raster uploads.
- PBKDF2 Web Crypto passwords, hashed random session tokens, HttpOnly/SameSite cookies, origin checks, database login throttles, server authorization.
- Admin controls store settings, orders and maintenance; Editor controls products, sections and media. No public registration or hardcoded credentials.
- One orders table represents checkout intents and their subsequent manual confirmation. Immutable line snapshots; revenue includes confirmed/preparing/completed only.
- Content stores separate draft and published structured values. No free-form HTML or page builder.
- Customer details retained 90 days; anonymization preserves aggregate financial facts. No analytics identifiers or tracking cookies.
- Remote provisioning/deployment requires actual account/resource configuration; never invent Cloudflare IDs.

## Sequence and verification

1. Schema, safe seeds, validated contracts, password/session/auth boundary; migration and unit checks.
2. Server services and protected administration; CRUD and authorization integration checks.
3. Dynamic storefront, structured section publication, media and recorded checkout/events; runtime checks.
4. Responsive UI, accessibility and mutation states; browser flows and Safari iPhone icons when available.
5. Typecheck, tests, lint, production build, security review; deployment/retention/bootstrap documentation.

## Commands

`npm run check`, `npm test`, `npm run lint`, `npm run build`, `npm run db:migrate`, `npm run admin:bootstrap`, `npm run dev`.

Reuse the existing TypeScript/Svelte runes style and brand tokens. Never expose passwords, session hashes, secrets or customer details to public loads. Never fabricate analytics, addresses or successful WhatsApp deliveries.
