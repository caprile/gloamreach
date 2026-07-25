#!/bin/sh
# fetch-raw.sh <id> <key> ... — like fetch.sh but NEVER trims.
# POI floor decals and tiles must keep their full canvas: a decal's transparent
# margin is what keeps the stain inside the POI circle, and a tile's bleed is
# what makes it tile.
#
# Because trimming is skipped, so is the accidental opacity check it provided —
# so check-alpha runs explicitly here. A decal that came back with an opaque
# canvas draws a white square in-game and looks perfectly fine in a viewer.
while [ $# -ge 2 ]; do
  id=$1; key=$2; shift 2
  code=$(curl -s -o "art/sprites/world/$key.png" -w "%{http_code}" "https://api.pixellab.ai/mcp/map-objects/$id/download")
  if [ "$code" != "200" ]; then echo "$key pending ($code)"; rm -f "art/sprites/world/$key.png"; continue; fi
  echo "$key ok"
  node art/tools/check-alpha.mjs "art/sprites/world/$key.png"
done
