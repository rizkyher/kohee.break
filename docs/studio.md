# Kohee Studio operations

Kohee Studio extends the existing storefront. The public page now uses SSR and reads D1 on every request. Published updates appear on the next page request without a redeploy. HTML, admin pages and API responses use `Cache-Control: no-store`; immutable media uses a new R2 key on every replacement.

## Prerequisites and local setup

Use Node 22.23+ and `npm ci`. The installed integration uses SvelteKit 3's `cloudflare:workers` module (not the old `event.platform.env` convention). `wrangler.jsonc` defines `DB` (D1) and `MEDIA` (R2). Its current D1 UUID references the deployed Kohee Studio database in the Rizky account; local commands still use a separate local database. See [deployment record](deployment.md).

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run admin:bootstrap
npm run dev
```

Open `http://localhost:5173/admin/login`. The first account email is **kohiibreak@gmail.com** (the requested `Kohiibreak@gmail.com`, normalized for login). Bootstrap asks for a hidden password and confirmation, minimum 12 characters. The SQL creates an account only when `admin_users` is empty; it never replaces a password or exposes public registration. No default password is included.

For unattended bootstrap, provide `KOHEE_ADMIN_PASSWORD` through your environment's secret manager. Do not place it in a command argument, public `.env` variable, source file, or chat. The script writes only a salted hash to a permission-restricted temporary SQL file and deletes the file afterward. Bootstrap's success message does not imply a row was created if an account already exists. Check the login you intended to create.

Settings initially import the existing validated public `WHATSAPP_NUMBER`, `INSTAGRAM_HANDLE`, and `FULFILLMENT_OPTIONS` once, if D1 has no settings record. Thereafter Studio settings in D1 are authoritative. `SITE_URL` remains a public build variable for canonical/Open Graph URLs. All four `.env.example` values are public; none should hold secrets.

Seed migrations preserve the existing four products and descriptions, prices, stock availability, section copy and brand assets. `INSERT OR IGNORE` seeds do not overwrite edited records. Static originals are registered as media; future uploads use R2.

## Verification

```bash
npm run check
npm test
npm run lint
npm run build
```

Start `npm run dev` in a separate terminal, then run:

```bash
npm run test:integration
```

The integration script accepts **localhost only**, uses local Wrangler bindings, creates random temporary Admin/Editor accounts, exercises the HTTP API and SSR routes, and restores settings/content and removes its test records. It changes local data temporarily; use a development database and do not run it concurrently with content editing. It verifies authorization, Origin validation, product/category CRUD, upload/replace and media references, draft/publish/unpublish, real checkout snapshots and idempotency, order transitions/revisions, and event deduplication. No WhatsApp messages are sent.

To test the production bundle:

```bash
npm run build
npm run preview
```

Then, in another terminal:

```bash
KOHEE_TEST_URL=http://127.0.0.1:4173 npm run test:integration
```

Regenerate binding declarations after changing Wrangler bindings:

```bash
npm run cf:types
```

`src/cloudflare-env.d.ts` is generated using `.env.example`, so no private runtime secret values are embedded in its declarations.

## Production provisioning and deployment

Use the intended Cloudflare account (the existing project documentation names Rizky Herdiansyah). Verify the account before creating resources. No remote resources are created by local migration or test commands.

```bash
npx wrangler whoami
npx wrangler d1 create kohee-studio
npx wrangler r2 bucket create kohee-studio-media
```

Copy the returned **actual** D1 UUID into `wrangler.jsonc` → `d1_databases[0].database_id`. Use the actual bucket name in `r2_buckets[0].bucket_name`. Keep binding names `DB` and `MEDIA`. Provision separate preview resources if you use preview deployments; do not point tests or untrusted previews at production data.

Before an existing database upgrade, export a backup and record the D1 Time Travel recovery point. Migrations are additive and forward-only; reversing them with `DROP TABLE` would destroy order history.

```bash
npx wrangler d1 export DB --remote --output=/private/tmp/kohee-before-studio.sql
npm run db:migrate:remote
npm run admin:bootstrap -- --remote
npm run cf:types
npm run check
npm test
npm run lint
npm run deploy
```

The export includes customer data and admin password hashes. Store it securely outside source control, then remove local copies when no longer needed. For rollback, use a compatible previous application build; do not roll back the schema by deleting tables. Use Cloudflare D1 recovery facilities if data recovery is required.

The existing Pages project remains `kohee-break`, output `.svelte-kit/cloudflare`. Ensure the deployed project's D1/R2 bindings match this configuration. For Git deployment, set build command `npm run build`, output `.svelte-kit/cloudflare`, and `NODE_VERSION=22`. Set a valid HTTPS `SITE_URL` before building. Initial public defaults are optional if Studio settings will be configured directly.

After deployment, verify HTTPS login, `Secure`/`HttpOnly` session cookie behavior, upload an image, publish a headline, and start a real test checkout without sending a WhatsApp message. Check the resulting Pending Confirmation record; delete/anonymize test customer details using your normal administrative process. Do not label a deployment production-ready solely because its build passed locally.

## Authentication and roles

- Web Crypto PBKDF2-SHA256, 600,000 rounds, independent 128-bit salt per password.
- Random 256-bit session token; only SHA-256 token hashes stored in D1.
- Eight-hour absolute expiration, HttpOnly + SameSite=Lax cookies; Secure over HTTPS. Plain HTTP is supported only for localhost development.
- Login rotates the current session; logout revokes it. Password changes require the current password and revoke the account's other sessions.
- Database-backed login rate limits: eight attempts per email and thirty per IP per 15 minutes. Limits include successful attempts to reduce distributed guessing. IPs/emails are hashed in throttle keys; expired throttle records are removed by maintenance.
- All mutations enforce exact same-origin requests, including JSON endpoints. SvelteKit's own form CSRF protection remains enabled. JSON and multipart request bodies have streamed size limits.
- **Admin:** all Studio areas, order status/revenue, settings, team creation, retention, activity.
- **Editor:** products, categories, structured content, media, own profile. Dashboard omits customer records and audit entries. Orders/settings/analytics/activity server loads and restricted mutation endpoints enforce the role; hidden navigation alone is not the control.

Admin can create individual team accounts under Settings. Share temporary credentials through a secure channel and have the person change their password under My Profile. There is no email invitation/reset service or public signup. If an account must be revoked urgently, remove its sessions via an authorized database operation and rotate/recover its password through your secure operations process.

## Catalog and content publication

Products support draft/published/archived status. Archive is the deletion workflow: it hides the product while preserving historical references. Duplicate creates a new draft and unique slug. Category deletion is blocked while referenced by any product.

Section editors cover hero, marquee, signature, story, promotional banners and footer. Save draft never changes the public version. Publish saves and publishes the validated draft; Unpublish hides the section while retaining its draft. Visibility is also editable. Use section display order to reorder sections; the menu follows the signature slot, while header, footer and final checkout CTA remain anchored. Banner order and marquee item order are independently editable.

Preview shows draft content immediately inside the Studio. View Website displays the full public layout and existing animations. Plain text is rendered as text, never as arbitrary HTML. CTA/social destinations permit validated HTTPS URLs, local paths and anchors; JavaScript/data URLs are rejected.

Product galleries use their first image as the storefront card image. Product SEO fields are stored for editorial management; this single-page storefront uses global settings for its document title/description (there are no individual public product pages).

Media library lists the latest 200 matching files; search queries the full library. Product/section selectors receive the full library. Raster uploads are limited to 5 MB and checked against actual PNG/JPEG/WebP signatures and their declared MIME. SVG uploads are intentionally rejected. Uploaded URLs are same-origin `/media/images/{uuid}.{extension}` routes backed by private R2 bindings. Originals from the seed stay in `static/products`.

Replacement changes the object's immutable URL while retaining the media record ID, so all product and section references point at the replacement on their next request. Draft **and** published media references block deletion. Replaced old objects are retained so an already-open/cached page does not break; periodically compare R2 keys with `media_assets.object_key` and remove unreferenced old keys after a grace period. Do not apply an indiscriminate R2 expiry policy to all objects, since that would remove active media.

## Orders and analytics

An order starts as a **checkout intent**, status **Pending Confirmation**. The server reads current published product prices/availability and validates quantities/customer fields before atomically recording immutable item snapshots. An idempotency key replays the same checkout rather than creating duplicate orders/events; reusing the key with different input is rejected.

WhatsApp is opened with the server-generated message. No API integration claims that it was sent, read, paid, or delivered. There is no WhatsApp webhook. Store closure or missing business number prevents new checkout intents. The store's message setting is the introduction; item/total/customer lines are generated safely by the server.

Allowed status transitions:

- Pending Confirmation → Confirmed or Cancelled
- Confirmed → Preparing, Completed or Cancelled
- Preparing → Completed or Cancelled
- Completed/Cancelled are terminal

Confirm manually only after communication with the customer. Each update checks the current status and record revision; stale edits return a conflict. Audit logs and status history accompany successful updates. Optional stock is a manually maintained ordering limit, not an inventory reservation system: checkout does not decrement or reserve it, and multiple intents do not prove purchases. Confirm availability in chat and update stock as needed.

Revenue includes current Confirmed/Preparing/Completed orders, excluding Pending and Cancelled. Reports use UTC calendar days and a 7/30/90-day checkout-created cohort. They do not prove payment settlement. A later cancellation removes its amount from that cohort's confirmed revenue.

Page views are emitted when the storefront mounts, product views when details open, add-to-cart when quantity actually increases, and checkout events when the server records an intent. Events use random per-event IDs with deduplication, without analytics cookies, stored customer names, visitor/session identifiers, or chat contents. Public endpoints are throttled. The funnel shows event counts, not unique people or attributed customer journeys; it is not a unique-visitor conversion rate. Empty periods display empty states.

## Customer data minimization and retention

Checkout collects only name, optional note, optional fulfillment choice, and line items. No email, phone, address, or payment credentials are required by the site. The customer sees a recording notice before checkout. Avoid entering personal details in internal notes unless needed for fulfillment.

Daily maintenance runs on the first storefront/admin request after the previous maintenance window expires. It anonymizes customer name/notes/fulfillment and stored WhatsApp messages/fingerprints after 90 days, removes raw analytics events after 90 days, and deletes expired sessions/throttle keys. Financial totals, product snapshots and status history remain available for operations. Internal notes are also erased, so they cannot become an accidental permanent PII store.

For predictable maintenance even when the site has no traffic, run daily from your authorized scheduler with a scoped Cloudflare API token stored as a scheduler secret:

```bash
npm run data:retention -- --remote
```

Locally, `npm run data:retention` uses D1 local. Admin can also run retention from Settings. Audit logs record important changes and entity IDs without raw passwords, tokens, or customer message payloads. Database backups require their own retention/deletion policy.

## Operational limits

Local runtime and browser verification do not provision Cloudflare accounts, configure production bindings, test a production domain, send WhatsApp messages, or validate real business fulfillment. Complete the deployment verification above before serving customers. Keep recovery credentials and database backups secure, monitor Cloudflare errors and resource usage, and re-run checks after dependency or binding changes.

Official references: [SvelteKit Cloudflare adapter](https://svelte.dev/docs/kit/adapter-cloudflare), [D1 prepared statements and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/), [R2 Workers binding API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## Dependency review at implementation

`npm audit` reported 15 transitive/toolchain advisories (5 low, 10 moderate; no high/critical) in the existing dependency family. The underlying reports include deepmerge prototype poisoning and minimatch glob amplification, with affected dependents in the Svelte build/adapter and ESLint toolchains. The CMS services do not pass customer data to these packages. The audit's automatic suggestions include incompatible major downgrades, so no forced downgrade was applied. Review upstream compatible fixes before production rollout; do not mistake this note for a clean dependency audit.

Local verification included 22 unit tests, secure/idempotent bootstrap verification, D1 migrations, the HTTP integration suite on both Vite and Wrangler Pages production preview, real browser product creation/media selection and content draft/publish, period filters, responsive overflow checks at 320/768/1440, and Safari iPhone 17 simulator screenshots of storefront/login SVG icons. Impeccable's source detector completed with no reported regex findings; its parsed-page rules did not run on Svelte source, so browser inspection remains part of verification.
