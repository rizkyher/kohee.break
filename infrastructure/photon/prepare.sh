#!/bin/sh
set -eu
# Requires Java 21+, Python 3 and zstd. Downloads are explicit operator input.
cd "$(dirname "$0")"
: "${PHOTON_JAR:=$PWD/data/photon.jar}"
: "${PHOTON_DUMP:=$PWD/data/indonesia.jsonl.zst}"
if [ -d data/index/photon_data ]; then echo 'Existing index found; prepare a new directory for updates.' >&2; exit 1; fi
python3 filter-bandung.py "$PHOTON_DUMP" > data/bandung.jsonl
mkdir -p data/index
java -Xmx1g -jar "$PHOTON_JAR" import -data-dir "$PWD/data/index" -languages en,id -import-file "$PWD/data/bandung.jsonl"
