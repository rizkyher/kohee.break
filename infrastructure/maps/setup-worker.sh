#!/bin/sh
set -eu
# Use the official Protomaps R2/Workers integration rather than a handwritten tile decoder.
# Pin PMTILES_COMMIT to a reviewed upstream commit for reproducible deployments.
: "${PMTILES_COMMIT:=aec8fa1341222fdddb3318e9ffa8e18e19b312f7}"
case "$PMTILES_COMMIT" in *[!a-f0-9]*|'') echo 'Expected a hexadecimal Git commit' >&2; exit 1;; esac
[ ${#PMTILES_COMMIT} -eq 40 ] || exit 1
mkdir -p vendor
if [ ! -d vendor/PMTiles/.git ]; then git clone https://github.com/protomaps/PMTiles.git vendor/PMTiles; fi
git -C vendor/PMTiles sparse-checkout set serverless/cloudflare serverless/shared
git -C vendor/PMTiles checkout --detach "$PMTILES_COMMIT"
cd vendor/PMTiles/serverless/cloudflare
npm ci
if [ ! -f wrangler.toml ]; then cp wrangler.toml.example wrangler.toml; fi
printf '%s\n' 'Set BUCKET, ALLOWED_ORIGINS, PUBLIC_HOSTNAME in vendor/PMTiles/serverless/cloudflare/wrangler.toml; then run npm run build and npm run deploy there.'
