# Production deployment — 2026-11-06

Website: https://kohee-break.pages.dev  
Admin: https://kohee-break.pages.dev/admin/login

The existing Git-connected Pages project was upgraded through a direct Wrangler upload from this working tree. Its previous deployment ID and the verified resources are recorded in `deployment.json`. The changes have not been committed or pushed by this deployment; synchronize the repository before a future Git-triggered build so it does not rebuild the older source.

## Account boundaries

| Resource                | Account                                                | Name                                                    |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Pages storefront/admin  | Rizky Herdiansyah (`eb85a8ce283c91ec262bde26e1716165`) | `kohee-break`                                           |
| D1                      | Rizky Herdiansyah                                      | `kohee-studio` / `f5040716-dc64-466e-a246-f6a2919ae12f` |
| Product media R2        | Rizky Herdiansyah                                      | `kohee-studio-media`                                    |
| Regional map R2         | Rizky Herdiansyah                                      | `kohee-maps` / `bandung-20261105.pmtiles`               |
| Official PMTiles Worker | Rizky Herdiansyah                                      | `kohee-map-tiles.rizkyherdiansyah31.workers.dev`        |
| OSRM Worker/Container   | Khwarizmi                                              | `kohee-routing.khwarizmi.workers.dev`                   |
| Photon Worker/Container | Khwarizmi                                              | `kohee-search.khwarizmi.workers.dev`                    |

The local named profile `rizky` was verified as `rizkyherdiansyah31@gmail.com`, with access to the Rizky account. The original `default` login remains separate. Profiles are machine-local. Always verify the target account and scopes when using another machine or refreshing authentication. In this Wrangler release, `whoami` displayed the default identity even for the selected profile; actual profile identity/account access was verified privately through the official auth command and Cloudflare API before provisioning.

Pages does not accept `account_id` in its configuration file. `npm run deploy` explicitly selects the verified account via `CLOUDFLARE_ACCOUNT_ID` and `--profile rizky`, targets project `kohee-break` and production branch `main`. The OSRM, Photon and PMTiles Worker configurations have their own pinned account IDs. Avoid using an implicit account selection for remote D1/R2 commands.

## Data and secrets

D1 migrations were applied to a new Kohee-specific production database. The four current products, categories, static seed media references, website sections/settings, delivery settings and the existing `kohiibreak@gmail.com` admin account were copied privately. The existing salted password hash was retained; there was no password reset or default password. Use the same password already configured locally. Active sessions, order records, analytics, rate limits and test accounts were not transferred.

The localhost database was backed up before switching the binding UUID, then restored into the new local namespace. Local and remote D1 storage remain separate even though their configured database UUID is the same. Initial product images remain bundled static assets; future admin uploads use the media R2 binding.

Pages production has `DB`/`MEDIA` bindings, server-only `OSRM_TOKEN`/`PHOTON_TOKEN` secrets, and the three upstream service URLs. Tokens are never included in source or returned to browsers. Existing project variables were preserved. Root `.dev.vars` remains ignored; deployments do not automatically upload it. Production tokens were set through the authenticated project API.

The requested **test origin** remains enabled at `-6.949305555555556, 107.60563888888888`, labeled `Kohee Break (lokasi uji)`. Replace it with the final store address/coordinates in `/admin/delivery` when ready. Pricing settings were retained from local D1 rather than invented during deployment.

## Verification and recovery

Check, 31 unit tests, lint and the production build passed. Public acceptance verified SSR catalog, no-store HTML, absence of server tokens in HTML, GPS permission limited to the same origin, actual PMTiles metadata/MVT data, admin login/unauthenticated redirect, origin/query validation, real Photon search and an OSRM quote. The tested quote returned **4978.7 meters / Rp9,000** under the current pricing rules; it was removed afterward. No test checkout or WhatsApp message was sent. WebKit mobile successfully selected a live search result and rendered the production map without horizontal modal overflow. Full native Safari picker interaction remains a separate manual check due simulator coordinate-input limitations.

Both Container services have a maximum of one `basic` instance and five-minute idle sleep. The first observed Photon request took 16.5 seconds, so the server search timeout is 30 seconds. OSRM retains its 12-second routing timeout. Failures remain explicit and never become free shipping.

The previous Pages deployment is available for a rollback through Cloudflare if needed. A code rollback does not roll back D1 or R2. Export/Time Travel-backup D1 before future schema or data changes, and preserve immutable map object keys when refreshing the basemap. Preview deployments are not part of this release; provision isolated D1/media resources before testing untrusted preview code.

## Login compatibility and delivery update, 2026-11-06

The admin password format remains PBKDF2-SHA256 with 600,000 rounds. Cloudflare rejected the native derivation above 100,000; a local JavaScript fallback then exceeded the main site's production CPU limit. `infrastructure/password` supplies the same derivation in a private authenticated Worker on the existing Khwarizmi account. Configure its server-only `PASSWORD_KDF_TOKEN` in Pages and its URL in `wrangler.jsonc`. This reuses existing Workers billing and does not change a subscription. Passwords/hashes are neither reset nor weakened. See its README for deployment and boundaries.

Production delivery settings now use `maxDistanceKm: null` (version 2). Quotes use actual OSRM road distance without a kilometer cap; the loaded regional road graph must still provide a route. The user-reported UPI address successfully routed 10,720.7 meters and cost Rp27,000 with the existing pricing rules. Browser location requests use fresh high-accuracy geolocation (`enableHighAccuracy: true`, `maximumAge: 0`) and display device-reported accuracy; the browser/OS decides the available location source.
