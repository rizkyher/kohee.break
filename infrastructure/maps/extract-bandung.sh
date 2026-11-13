#!/bin/sh
set -eu
# Official Protomaps v4 daily archive URL selected by the operator, never hotlinked by the app.
: "${PROTOMAPS_ARCHIVE_URL:?Choose an official v4 archive from https://maps.protomaps.com/builds}"
mkdir -p data
# Geographic crop only, not a store origin or a promise of delivery eligibility.
# Bandung Raya with a buffer; operators should verify every intended service area is covered.
pmtiles extract "$PROTOMAPS_ARCHIVE_URL" data/bandung.pmtiles --bbox=107.25,-7.30,108.05,-6.55 --maxzoom=15
pmtiles verify data/bandung.pmtiles
