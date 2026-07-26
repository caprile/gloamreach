#!/usr/bin/env bash
# Pull a finished PixelLab character into the game's CREATURE rig layout.
#
#   art/tools/fetch-creature.sh <pixellab-character-id> <textureKey> [direction]
#   e.g. art/tools/fetch-creature.sh 44a670c2-... boar east
#
# Only ONE direction is kept; the others come down in the archive and are
# ignored. Which one depends on the creature's shape, and it matters a lot:
#
#   quadrupeds -> east   a boar reads side-on, and a front-facing one is a blob
#   humanoids  -> south  a profile hides the ears, face and held item that make
#                        a gremlin a gremlin — it came out as a generic green
#                        man. Front-facing is also how the placeholders were
#                        drawn, so the roster stays consistent.
#
# flipX still mirrors at runtime; on a front-facing sprite that reads as the
# creature turning, which is what the placeholders always did.
#
# Each animation becomes one horizontal strip:
#
#   art/creatures/<textureKey>_<anim>_f<frameCount>.png
#
# See src/art/creatureRig.ts for why the frame count lives in the filename.
# Also drops the east rotation into art/sprites/world/<textureKey>.png as the
# static sprite, so the still and the animation can never be different art.
set -euo pipefail

[ $# -ge 2 ] || { echo "usage: fetch-creature.sh <pixellab-character-id> <textureKey> [direction]" >&2; exit 1; }
PL_ID="$1"
KEY="$2"
DIR="${3:-east}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/art/creatures"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -sS --fail -o "$TMP/char.zip" "https://api.pixellab.ai/mcp/characters/$PL_ID/download"
unzip -qo "$TMP/char.zip" -d "$TMP/x"
SRC="$(find "$TMP/x" -maxdepth 1 -mindepth 1 -type d | head -1)"
mkdir -p "$OUT" "$ROOT/art/sprites/world"

for dir in "$SRC"/animations/*/"$DIR"/; do
  [ -d "$dir" ] || continue
  anim="$(basename "$(dirname "$dir")")"
  # A character with two animations of the same NAME (e.g. an east `attack`
  # kept alongside a new south one) gets a group-id suffix on the folder —
  # `attack-902741fb`. The rig parses `<key>_<anim>_f<n>`, so strip it back to
  # the bare name.
  anim="${anim%%-*}"
  frames=("$dir"frame_*.png)
  # Drop any earlier strip for this anim first — the frame count is in the
  # filename, so a re-fetch at a different count would leave BOTH on disk and
  # the rig would register two animations under one key.
  rm -f "$OUT/${KEY}_${anim}_f"*.png
  node "$ROOT/art/tools/sheet.mjs" --strip "$OUT/${KEY}_${anim}_f${#frames[@]}.png" "${frames[@]}"
done

# Deliberately NOT trimmed, unlike every other world sprite: this is the frame
# shown before the first animation starts, and the animation frames are the
# character's full canvas. Trimming only the still would make the creature
# visibly jump size the moment it moves. Transparent padding costs nothing to
# draw, and the body/reach footprint is pinned separately anyway.
if [ -f "$SRC/rotations/$DIR.png" ]; then
  cp "$SRC/rotations/$DIR.png" "$ROOT/art/sprites/world/$KEY.png"
fi
