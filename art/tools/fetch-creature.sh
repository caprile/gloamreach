#!/usr/bin/env bash
# Pull a finished PixelLab character into the game's CREATURE rig layout.
#
#   art/tools/fetch-creature.sh <pixellab-character-id> <textureKey> [move-dir] [idle-dir]
#   e.g. art/tools/fetch-creature.sh 44a670c2-... boar east east
#        art/tools/fetch-creature.sh a527da27-... gremlin east south
#
# Only ONE direction per animation is kept; the rest come down in the archive
# and are ignored. Which one is a per-ANIMATION choice, not per-creature:
#
#   move/attack -> east   a creature that walks should face where it's going;
#                         a front-facing walk cycle reads as moonwalking.
#   idle        -> south  standing still, a profile hides the ears, face and
#                         held item that make a gremlin a gremlin (it came out
#                         as a generic green man). Front-facing is also how the
#                         placeholders were drawn.
#
# Quadrupeds want east for everything — a front-on boar is a blob. Humanoids
# split: front-facing when idle, side-on when moving (the user).
#
# flipX still mirrors at runtime, so a side-on walk faces either way.
#
# Each animation becomes one horizontal strip:
#
#   art/creatures/<textureKey>_<anim>_f<frameCount>.png
#
# See src/art/creatureRig.ts for why the frame count lives in the filename.
# Also drops the east rotation into art/sprites/world/<textureKey>.png as the
# static sprite, so the still and the animation can never be different art.
set -euo pipefail

[ $# -ge 2 ] || { echo "usage: fetch-creature.sh <id> <textureKey> [move-dir] [idle-dir]" >&2; exit 1; }
PL_ID="$1"
KEY="$2"
MOVE_DIR="${3:-east}"
IDLE_DIR="${4:-$MOVE_DIR}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/art/creatures"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -sS --fail -o "$TMP/char.zip" "https://api.pixellab.ai/mcp/characters/$PL_ID/download"
unzip -qo "$TMP/char.zip" -d "$TMP/x"
SRC="$(find "$TMP/x" -maxdepth 1 -mindepth 1 -type d | head -1)"
mkdir -p "$OUT" "$ROOT/art/sprites/world"

for group in "$SRC"/animations/*/; do
  [ -d "$group" ] || continue
  anim="$(basename "$group")"
  # A character with two animations of the same NAME (e.g. an east `attack`
  # kept alongside a new south one) gets a group-id suffix on the folder —
  # `attack-902741fb`. The rig parses `<key>_<anim>_f<n>`, so strip it back to
  # the bare name.
  anim="${anim%%-*}"
  # Idle takes its own direction; everything that MOVES takes the move one.
  want="$MOVE_DIR"
  [ "$anim" = "idle" ] && want="$IDLE_DIR"
  dir="$group$want/"
  [ -d "$dir" ] || continue
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
# The static sprite matches the IDLE direction: it's what a resting creature
# shows before any animation starts, so it has to agree with the idle strip.
if [ -f "$SRC/rotations/$IDLE_DIR.png" ]; then
  cp "$SRC/rotations/$IDLE_DIR.png" "$ROOT/art/sprites/world/$KEY.png"
fi
