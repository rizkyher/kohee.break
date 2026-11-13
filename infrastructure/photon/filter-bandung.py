#!/usr/bin/env python3
"""Crop official Photon JSONL data by centroid; preserve dump metadata and country names."""
import json
import subprocess
import sys

bounds = (107.25, -7.30, 108.05, -6.55)
count = 0
process = subprocess.Popen(['zstd', '-dc', sys.argv[1]], stdout=subprocess.PIPE, text=True)
for line in process.stdout:
    record = json.loads(line)
    if record['type'] == 'NominatimDumpFile':
        if record['content'].get('features', {}).get('has_addresslines', True):
            raise ValueError('This crop requires a dump with resolved address objects.')
    if record['type'] == 'Place':
        places = []
        for place in record['content']:
            lng, lat = place['centroid']
            if bounds[0] <= lng <= bounds[2] and bounds[1] <= lat <= bounds[3]:
                places.append(place)
        if not places:
            continue
        record['content'] = places
        count += len(places)
    print(json.dumps(record, ensure_ascii=False, separators=(',', ':')))
if process.wait() != 0:
    raise RuntimeError('Input decompression failed; do not import this incomplete crop.')
if not count:
    raise RuntimeError('No places found within Bandung bounds.')
print(f'Extracted {count} real OSM places in Bandung Raya', file=sys.stderr)
