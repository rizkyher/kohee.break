# Open-source delivery implementation

The supplied brief is the specification. Preserve the existing cart and brand styling. Delivery area: Bandung Raya. The website/D1/R2 are deployed in Rizky; OSRM and Photon Containers are deployed in Khwarizmi.

- [x] D1 delivery settings, versioned quotes and historical order snapshots
- [x] Configurable pricing, free thresholds, rounding and distance limits
- [x] MapLibre picker, actual regional PMTiles, click/drag/GPS/manual address
- [x] Official R2/Workers tile integration and authenticated OSRM Docker gateway
- [x] Server-authoritative checkout and OpenStreetMap links in WhatsApp
- [x] Real Bandung road route, quote and checkout verified locally
- [x] Setup, licensing, retention and operator configuration documented
- [x] Self-hosted Photon with actual Bandung data, search suggestions and selection-to-quote verification
- [x] Safari iPhone header SVG icon rendering visually verified
- [x] Production website, D1, R2, PMTiles Worker, OSRM and Photon deployed and checked
- [x] Unlimited routable delivery, UPI production quote 10.72 km / Rp27,000
- [x] Fresh high-accuracy GPS options, accuracy status, cancellation and error paths
- [x] Cloudflare admin PBKDF2 compatibility, private KDF Worker and production invalid-login check
- [ ] Replace the explicitly supplied test origin with the final store address/coordinates
- [ ] Full native Safari map/GPS interaction (simulator input unavailable)

No demo production servers, mock customer distances or hardcoded store coordinates. Photon is deployed with its own authenticated Cloudflare Worker and Container. Software/data are open source; hosting may incur infrastructure costs.
