#!/bin/sh
# fetch.sh <id> <textureKey> ... — download map objects into art/sprites/world and trim.
# Skips keys already on disk so a poll loop doesn't re-download what it has.
while [ $# -ge 2 ]; do
  id=$1; key=$2; shift 2
  [ -f "art/sprites/world/$key.png" ] && continue
  code=$(curl -s -o "art/sprites/world/$key.png" -w "%{http_code}" "https://api.pixellab.ai/mcp/map-objects/$id/download")
  if [ "$code" != "200" ]; then echo "$key pending ($code)"; rm -f "art/sprites/world/$key.png"; continue; fi
  node art/tools/trim.mjs "art/sprites/world/$key.png"
done
