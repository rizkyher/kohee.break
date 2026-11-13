# OSRM on Cloudflare Containers

This is an alternative to the Docker Compose/VPS gateway. The routing Worker and Container can live in **Khwarizmi's Cloudflare account**, while the SvelteKit storefront, D1 and R2 stay in their existing account. The connection is authenticated HTTPS; it does not depend on a cross-account Durable Object or service binding.

## Local verification

Prepare the Bandung graph first using `prepare.sh` as documented in the infrastructure guide. `cloudflare.Dockerfile` copies only `data/bandung.osrm*` into the OSRM v6.0.0 image. No customer data, credentials, PBF source or PMTiles archive enters that image. Cloudflare requires Linux/amd64; the graph produced locally has also been verified with the amd64 image.

Set the same random hex `OSRM_TOKEN` privately in root `.dev.vars` and `infrastructure/osrm/.dev.vars`. Neither file is committed. Start Docker, then from the repository root:

```sh
npm run routing:types
npm run routing:check
npm run routing:dev
# In another terminal:
npm run routing:test
npm run routing:build
```

The dev server listens on `http://localhost:5002`. To connect the local storefront, set its ignored `.dev.vars` to `OSRM_URL=http://localhost:5002` and restart the storefront. The existing Compose gateway at port 5001 remains another supported option.

The acceptance script uses public landmark test points, asserts the actual road route (3291.3 meters in the prepared dataset), and checks denied authentication, invalid coordinates, unsupported methods/endpoints, forced GeoJSON options and OSRM `NoSegment`. It never saves a store origin or creates an order.

## Deployment to Khwarizmi's account

1. Verify the intended account ID and that the authenticated deployment identity has access to that account's Workers, Containers and Durable Objects. Use a separate local Wrangler profile or account-scoped API token. Never put authentication tokens in chat or Git. Workers Paid must already be enabled on **Khwarizmi's account**; Containers charges belong to that account.
2. Confirm the data provenance in `infrastructure/data-sources.json`. Rebuild the graph/image when updating data; OSRM does not modify its graph at runtime. Image layers retain the graph when ephemeral container disks are replaced.
3. From the repository root, explicitly select the verified account for every remote routing command. Replace the placeholder with the real ID, not the account display name:

```sh
CLOUDFLARE_ACCOUNT_ID=KH_ACCOUNT_ID npx wrangler whoami
CLOUDFLARE_ACCOUNT_ID=KH_ACCOUNT_ID npx wrangler secret put OSRM_TOKEN --config infrastructure/osrm/wrangler.jsonc
CLOUDFLARE_ACCOUNT_ID=KH_ACCOUNT_ID npm run routing:deploy
```

`secret put` prompts privately and changes the remote Worker. Execute them only after verifying the target account. For an atomic initial deployment, `npm run routing:deploy -- --secrets-file infrastructure/osrm/.dev.vars` uploads the secret with the version; this was the verified deployment path. If Wrangler requires the Worker to exist first, deploy it without the secret, then add it; missing secrets fail closed with 503. Never weaken the authentication guard to bootstrap deployment.

4. Copy the resulting HTTPS routing Worker URL into the storefront account's `OSRM_URL` runtime variable. Set the same `OSRM_TOKEN` as a secret **in the storefront account**, then redeploy the storefront through its existing deployment process. Keep its D1/media/map bucket bindings pointed at their existing account. Do not run storefront deployment commands with Khwarizmi's account selected.
5. Test unauthorized access (403), an authenticated actual Bandung route, an unreachable point, and quote/checkout totals from the deployed storefront. No CORS permissions are needed: browsers call the SvelteKit API, and only that server calls the routing Worker.

## Lifecycle, limits and operations

The Worker uses one named Container with `max_instances: 1`, a `basic` instance (1 GiB memory), five-minute idle sleep, and no container outbound internet. The graph is baked into the image to avoid downloading it during startup. Cold starts can still exceed the storefront's 12-second routing timeout: the customer receives a routing error/manual-confirmation state according to settings and can retry; failures never become free shipping. Measure deployed cold-start latency before launch.

Authentication is checked with constant-time digest comparison before touching the Container. The Worker accepts only GET requests for a two-point driving route with valid coordinates, discards caller options, and supplies fixed bounded snapping/GeoJSON options. Its managed rate limiter permits 40 authenticated routing requests per minute per Cloudflare location; this is a protective local limit, not a global billing cap. The storefront retains its own customer quote limits. Responses are not cached.

OSRM request logs are suppressed at WARNING level and Worker invocation URL logs are disabled. Custom errors contain no coordinates/tokens. Traces are enabled for diagnosis: restrict observability access and review trace retention/sampling because request URLs may contain coordinates. Monitor memory, cold starts, 429/5xx and spending after rollout. A larger region or concurrent traffic may require a reviewed instance-size/limit change.

The routing Worker and one Container application were deployed to the verified Khwarizmi account on 2026-11-06. See `deployment.json` for resource IDs and actual remote acceptance results. The first tested route took 3.625 seconds and a warm request took 79 ms; these are single observations, not latency guarantees. No paid plan was activated and no bucket was created by this deployment. The storefront account still needs its own runtime URL/token configuration before production use.

Official references: [Container setup](https://developers.cloudflare.com/containers/get-started/), [Container class](https://developers.cloudflare.com/containers/api/container-class/), [limits](https://developers.cloudflare.com/containers/platform/limits/), [pricing](https://developers.cloudflare.com/containers/platform/pricing/).
