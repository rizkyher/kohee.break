# Kohee self-hosted maps — Bandung Raya

The app uses MapLibre GL JS, an R2-backed official PMTiles Worker, a private OSRM gateway and self-hosted Photon address search. No Google SDK/API, public routing demo, or public geocoding service is needed. See [Photon setup](photon/README.md) for the real Bandung search index and separate Cloudflare configuration. Customers still complete and confirm their full delivery address.

## Licensed regional data

Basemap source: https://docs.protomaps.com/basemaps/downloads and https://maps.protomaps.com/builds. The implementation's regional preparation uses the official `20261105.pmtiles` v4.15.2 archive, cropped to `107.25,-7.30,108.05,-6.55` (west,south,east,north), zooms 0–15. This is a geographic crop with buffer around Bandung Raya, **not** a hardcoded business origin or delivery promise. Store coordinates remain in D1 and must be set by the actual operator.

Install the official https://github.com/protomaps/go-pmtiles CLI. From `infrastructure/maps`:

```sh
PROTOMAPS_ARCHIVE_URL=https://build.protomaps.com/20261105.pmtiles sh extract-bandung.sh
```

Build retention is limited upstream. If that URL is no longer available, select a current v4 build from the official listing and record its date, version, source, and a checksum of the resulting regional archive. Never hotlink the upstream planet in the storefront. The OSM-derived basemap is ODbL Produced Work; retain OSM attribution. The map includes attribution links, cream/red road/route styling, water and buildings. The MVP style deliberately uses no externally hosted fonts, sprites or proprietary label service.

Routing source: https://download.geofabrik.de/asia/indonesia/java.html (OpenStreetMap ODbL). Download `java-latest.osm.pbf` and its provided checksum. Put data outside Git. Preserve a buffer so road routes can cross the service-area boundary. You can prepare the crop using the included Debian/osmium container:

```sh
cd infrastructure/osrm
docker build -f extract.Dockerfile -t kohee-osmium:local .
mkdir -p data
curl -fL https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf -o data/java.osm.pbf
docker run --rm -v "$PWD/data:/data" kohee-osmium:local extract -b 107.25,-7.30,108.05,-6.55 -s complete_ways /data/java.osm.pbf -o /data/bandung.osm.pbf --overwrite
```

## R2 + official Workers tile server

Follow https://docs.protomaps.com/deploy/cloudflare. Use a **separate map bucket** from product media. Upload `maps/data/bandung.pmtiles` as `bandung.pmtiles`; use rclone's S3 endpoint for archives over the dashboard upload limit. Example after privately configuring an R2 rclone remote:

```sh
rclone copyto infrastructure/maps/data/bandung.pmtiles r2:YOUR_MAP_BUCKET/bandung.pmtiles
```

No account/bucket is created automatically. From `infrastructure/maps`, `sh setup-worker.sh` checks out the official PMTiles Worker at reviewed commit `aec8fa1341222fdddb3318e9ffa8e18e19b312f7`, installs its dependencies and creates its config. Retain upstream BSD license notices in the checkout. Edit its `wrangler.toml`: point `BUCKET` to the actual map bucket, set `PUBLIC_HOSTNAME` to its actual hostname and `ALLOWED_ORIGINS` to the storefront origins rather than `*`. Run `npm run build` (dry run) and `npm run deploy` in `vendor/PMTiles/serverless/cloudflare`.

Verify `https://YOUR_TILE_WORKER/bandung.json` and an actual MVT tile. The app's fixed same-origin `/api/map` proxy supplies TileJSON/tiles to MapLibre; CSP therefore needs no broad external script/tile allowlist. `MAP_TILEJSON_URL` must be the operator's full `bandung.json` URL. Clients cannot choose arbitrary upstream URLs or tilesets. Keep tileset keys immutable/versioned for updates. Configure edge rate limits/caching/budget alerts for public tile traffic. R2/Workers and a VPS can incur infrastructure costs even though software/data have no per-request license fee.

## OSRM Docker preparation and service

For hosting entirely on Cloudflare, including a separate **Khwarizmi account** for routing, use the [Cloudflare Containers deployment guide](osrm/cloudflare.md). The Compose gateway below remains an alternative for a VPS/local machine.

Pinned routing image: `ghcr.io/project-osrm/osrm-backend:v6.0.0`. Prepare regional MLD routing files once, then start the service:

```sh
cd infrastructure/osrm
OSM_PBF="$PWD/data/bandung.osm.pbf" sh prepare.sh
# Generate a long random token privately, then set OSRM_TOKEN in the shell or ignored .env.
docker compose up -d
```

`prepare.sh` copies an external input when necessary and runs `osrm-extract`, `osrm-partition`, and `osrm-customize` for the car profile. The OSRM process is only exposed inside Docker. nginx accepts only routing paths, checks a Bearer token, rate-limits, and listens at `127.0.0.1:5001`. Publish that gateway behind your TLS reverse proxy or Cloudflare Tunnel; never expose port 5000 directly. Store the same `OSRM_TOKEN` in Pages runtime secrets. Use a random hex token (no quotes/newlines) for safe nginx template interpolation.

The server sends fixed `route/v1/driving/lng,lat;lng,lat` requests with GeoJSON geometry and bounded snapping radiuses. It uses OSRM's **road distance**, never Haversine. Upstream URL is environment-only, HTTPS outside localhost, no embedded credentials/query/fragment, redirects rejected, bearer authentication required outside localhost, 12-second timeout. Application quote endpoints are also throttled. `NoRoute` and `NoSegment` remain explicit errors, including HTTP 400 bodies; transport errors only use manual confirmation if Admin explicitly enabled it.

Use TLS gateway logs without full customer-coordinate URLs where possible; set a short retention period. OSM attribution remains visible. Validate several real Bandung destinations and roads after every data refresh. OSRM car profile is used; this is not live traffic or a motorcycle-specific navigation promise.

## Application runtime configuration

Copy root `.dev.vars.example` to ignored `.dev.vars` locally. For deployment set equivalent Cloudflare runtime vars/secrets:

- `MAP_TILEJSON_URL`: your official-worker-backed regional TileJSON URL.
- `OSRM_URL`: private HTTPS gateway base, or localhost HTTP for development.
- `OSRM_TOKEN`: secret Bearer token, never returned to the browser.
- `PHOTON_URL`: private Photon base URL, or authenticated Photon Worker URL.
- `PHOTON_TOKEN`: secret for the remote Photon Worker; empty only for a loopback-only local service.

Run local D1 migrations, restart Vite/Pages preview, and open `/admin/delivery`. Confirm the actual store address and coordinates. Save settings to publish pricing/version changes. Customers enter a complete address, confirm a clicked/dragged/GPS pin, then receive an authoritative quote. Origin, destination, cart/catalog-price or settings-version changes invalidate it. Existing order snapshots keep their historic fees and routes; old non-GeoJSON route strings are not reinterpreted as OSRM routes.

Run `npm run check`, `npm test`, `npm run lint`, `npm run build`, then the local HTTP integration suite. Real acceptance additionally checks a locally hosted **actual** Bandung basemap, the actual OSRM graph, authenticated gateway, mobile GPS denial and Safari iPhone marker/control rendering. Deployment/account/domain details remain operator configuration, never invented hostnames or coordinates.
