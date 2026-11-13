# Photon search — Bandung Raya

The storefront now searches a self-hosted Photon 1.3.0 service. No public Photon demo is a runtime dependency. Both the customer picker and admin origin picker use the same search UI. Search suggestions do not replace the required complete address or a confirmed destination pin; customers can add house numbers, drag the pin, or select a location manually.

## Reproduce the regional index

Requires Java 21+, Python 3 and `zstd`. Download the official release JAR and the official GraphHopper Indonesia JSONL dump into ignored `data/`:

```sh
mkdir -p infrastructure/photon/data
curl -fL https://github.com/komoot/photon/releases/download/1.3.0/photon-1.3.0.jar -o infrastructure/photon/data/photon.jar
curl -fL https://download1.graphhopper.com/public/asia/indonesia/photon-dump-indonesia-release-261018.jsonl.zst -o infrastructure/photon/data/indonesia.jsonl.zst
npm run search:prepare
```

Verify the JAR SHA256 and dump MD5 against `sources.json` before importing. `filter-bandung.py` keeps OSM places whose centroids fall within `107.25,-7.30,108.05,-6.55` and preserves dump metadata/country names. It rejects dumps with unresolved address references and fails on incomplete decompression. The prepared dataset contains **63,398 actual places**; data freshness is recorded in `sources.json`. This region is geographic coverage, not a hardcoded store origin or a guarantee of delivery eligibility.

The import writes a new OpenSearch index under `data/index/photon_data`. Importing Photon deletes an existing index, so the preparation script refuses to replace one. For updates, create and verify a separate index directory offline, stop the service, then swap it atomically. Keep a backup for rollback. Never import into a live index.

## Run locally

From the repository root:

```sh
java -Xms256m -Xmx512m -jar infrastructure/photon/data/photon.jar serve -data-dir "$PWD/infrastructure/photon/data/index" -listen-ip 127.0.0.1 -listen-port 2322 -max-results 5
```

In ignored root `.dev.vars`, set `PHOTON_URL=http://localhost:2322` and leave `PHOTON_TOKEN` empty only for this loopback service. Restart Vite/Pages so the new environment is read. The server calls the fixed Photon `/api` path with a bounded query, five results, regional bounding box and store-origin bias. Clients never choose the upstream URL. The SvelteKit POST endpoint validates input, enforces same-origin requests and allows 60 searches/minute per client, independently of delivery quote limits.

In the picker, typing three or more characters starts a 450 ms debounced search. Changing the query or closing the dialog aborts obsolete requests. Selecting a result moves the destination marker, removes an obsolete route and fills an editable address. Search errors and empty results are explicit; map/GPS selection remains available. Queries are forwarded to the operator's service and are not stored in D1; selecting/confirming an address still follows the existing shipping retention policy.

## Cloudflare Containers — deployed in Khwarizmi

The separate `kohee-search` configuration targets the verified Khwarizmi account. It uses a single `basic` Container, 512 MiB Java heap and five-minute idle sleep. Do not increase instance sizes without reviewing spending. The index is baked into the image because container disks are ephemeral. Lock files are deliberately excluded: copying filesystem locks from another host can prevent Lucene from starting on an overlay filesystem. Serve queries locally while preparing a separate offline index for production images.

```sh
npm run search:types
npm run search:check
npm run search:build
# Local Cloudflare Worker/Container test:
npm run search:dev
```

The service is deployed at `https://kohee-search.khwarizmi.workers.dev`; see `deployment.json` for resource IDs and actual remote verification. A cold search was observed at 16.5 seconds and a warm search at 1.0 second (single measurements, not guarantees). The app allows 30 seconds for this search service so cold starts do not automatically become failed searches.

For `search:dev`, privately set a random `PHOTON_TOKEN` in ignored `infrastructure/photon/.dev.vars`. After verifying the intended account and its Workers Paid plan, an explicitly requested remote deployment can use:

```sh
npm run search:deploy -- --secrets-file infrastructure/photon/.dev.vars
```

Set the resulting HTTPS Worker URL and the same secret in the storefront account's `PHOTON_URL`/`PHOTON_TOKEN`. Remote HTTP URLs, embedded credentials/query strings and the public `photon.komoot.io` demo are rejected by the app. Remote search requires a token. The Worker compares tokens in constant time, permits only bounded GET `/api` searches, forces regional/five-result options, restricts outbound container internet and rate-limits authenticated requests. Import/update/OpenSearch endpoints are not forwarded. Requests/errors are not cached and no query content is written to custom logs. Restrict tracing/observability access and retention: traces may include query text in request URLs.

Measured local acceptance: Java service and Linux/amd64 image return actual Jalan Braga and Gedung Sate results. WebKit mobile selection fills the address, moves the pin and receives an actual OSRM quote. Empty-result, failed-search and recovery states were checked; 31 unit tests cover adapter validation/routing and existing shipping logic. Native Safari header SVGs were visually checked; simulator coordinate input was unavailable, so the new result-icon/modal interaction still needs a native iPhone pass.

Photon is Apache-2.0; geographic data is OpenStreetMap ODbL. Preserve OSM attribution on the map and the index's data-source/license record. Official references: [Photon 1.3.0](https://github.com/komoot/photon/tree/1.3.0), [dump source](https://download1.graphhopper.com/public/asia/indonesia/), [API](https://github.com/komoot/photon/blob/1.3.0/docs/api-v1.md), [OSM license](https://www.openstreetmap.org/copyright).
