#!/bin/sh
set -eu
# Input: a legitimately downloaded OSM PBF covering Bandung and surrounding delivery roads.
# Input/output paths are mounted, never fetched from a user-supplied HTTP request.
: "${OSM_PBF:?Set OSM_PBF to a local .osm.pbf file}"
mkdir -p data
if [ "$OSM_PBF" != "$PWD/data/bandung.osm.pbf" ]; then cp "$OSM_PBF" data/bandung.osm.pbf; fi
image=ghcr.io/project-osrm/osrm-backend:v6.0.0
docker run --rm -t -v "$PWD/data:/data" "$image" osrm-extract -p /opt/car.lua /data/bandung.osm.pbf
docker run --rm -t -v "$PWD/data:/data" "$image" osrm-partition /data/bandung.osrm
docker run --rm -t -v "$PWD/data:/data" "$image" osrm-customize /data/bandung.osrm
