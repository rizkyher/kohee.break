# Smart delivery

Delivery is disabled initially. No origin is invented. Apply `npm run db:migrate`, configure the PMTiles Worker and private OSRM gateway, then visit `/admin/delivery` as Admin to set and confirm the actual store location and enable delivery. Editor cannot change delivery settings.

## Open-source infrastructure

The Google integration has been replaced by MapLibre GL JS, Protomaps PMTiles in R2 through the official Workers integration, and a separately deployed OSRM Docker service. Geographic scope is Bandung Raya, per the operator. Self-hosted Photon now provides Bandung street/place suggestions; customers still complete the full address and confirm the pin. See [Photon setup](../infrastructure/photon/README.md).

See [the infrastructure guide](../infrastructure/README.md) for regional data sources/licenses, the official tile Worker, Docker preprocessing, authentication, TLS and runtime environment variables. Copy `.dev.vars.example` for local configuration. No proprietary map SDK, key, paid geocoder, or public demo routing endpoint is used. The plain location links in new WhatsApp messages open OpenStreetMap.

## Prices and quote validity

The same pure calculator powers admin sample-distance simulation and server quotes. The maximum range is optional: `maxDistanceKm: null` means every destination with a routable road connection is eligible. When an operator explicitly sets a maximum, it uses the unrounded road distance. Radius/minimum-cart free conditions bypass base/minimum fees. Model A charges excess distance; Model B charges full distance outside the free radius. Turning off radius-free delivery makes Model A charge all distance. Distance rounding precedes rate calculation; fees are integer IDR, rounded upward to the fee increment and then capped at any configured maximum. A configured maximum therefore takes precedence over the increment.

The server prices cart lines from D1 and stores a cart-price fingerprint with each quote. Checkout verifies destination/address, cart quantities/prices, quote expiration, delivery enabled state and settings version. Any settings save invalidates old quotes. Browser-submitted money fields are never authoritative. Existing checkout idempotency remains in effect. Delivery disabled preserves the existing non-delivery checkout workflow.

Manual fallback is opt-in and only applies to transport/provider failures, not a known unreachable route or out-of-range destination. It never describes unknown shipping as free: the quote/message is labeled pending manual confirmation, and the displayed total is provisional. Admin must enter the agreed shipping fee in order details before confirming such an order. That manual fee changes only this order's snapshot; it does not change pricing rules.

Orders store subtotal, final/provisional total, fee, distance, origin, destination, and quote reference in `delivery_snapshot`. Changing rules never reprices existing orders. Location/address/phone/polyline fields are removed after 30 days by daily request maintenance; remaining customer name/message fields retain the existing 90-day policy. Financial snapshots remain. A no-traffic deployment should run equivalent maintenance daily using an authorized scheduler. Backups need a separate deletion policy. The operator’s OSRM service receives selected points; the cart discloses this before use.

## Verification and deployment

Run `npm run check`, `npm test`, `npm run lint`, `npm run build`, local migrations, and the integration suite. The actual regional services were verified locally: an authenticated OSRM route returned 3291.3 meters, the server quote charged Rp6,000, and checkout ignored forged totals and persisted Rp26,000. Temporary public-landmark fixtures are removed after verification; these coordinates never define the actual store.

Production acceptance requires the operator's real store origin, deployed R2 tile Worker and TLS routing gateway. Verify click/drag, denied GPS, road route, pricing boundaries, out-of-range and unavailable routes, quote expiration, changed cart/settings, WhatsApp totals and historical snapshots. Safari iPhone header SVG icons were visually checked; simulator input automation was unavailable for full native map interaction.

References: [Protomaps Cloudflare integration](https://docs.protomaps.com/deploy/cloudflare), [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/), [OSRM backend](https://github.com/Project-OSRM/osrm-backend), [OpenStreetMap licensing](https://www.openstreetmap.org/copyright).

The location button requests browser geolocation with `enableHighAccuracy: true`, `maximumAge: 0`, and a 20-second timeout. It requires HTTPS and user permission; the device/browser chooses its available GPS/location providers. The picker shows reported accuracy, handles denied/unavailable/timed-out location, and ignores callbacks after close or a newer point selection. Actual address entry and pin confirmation remain required.
