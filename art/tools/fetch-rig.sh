#!/usr/bin/env bash
# Pull a finished PixelLab character into the game's player-rig layout.
#
#   art/tools/fetch-rig.sh <pixellab-character-id> <character-id>
#   e.g. art/tools/fetch-rig.sh ca0e6dcb-... vagabond
#
# The <character-id> is the game's own CharacterDef id (Characters.ts), because
# that is what MainScene passes to Player.setCharacter().
#
# The character download is one ZIP holding rotations/ and animations/<name>/
# <direction>/frame_NNN.png. Each direction's frames are stitched into a single
# horizontal strip named `<anim>_<dir>_f<count>.png` — see src/art/playerRig.ts
# for why the frame count lives in the filename.
#
# A character with no `idle` animation gets a 1-frame idle strip made from its
# rotation image, so a rig is usable the moment the character itself is done,
# before any animation has been generated.
set -euo pipefail

[ $# -eq 2 ] || { echo "usage: fetch-rig.sh <pixellab-character-id> <character-id>" >&2; exit 1; }
PL_ID="$1"
CHAR="$2"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/art/rig/$CHAR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -sS --fail -o "$TMP/char.zip" "https://api.pixellab.ai/mcp/characters/$PL_ID/download"
unzip -qo "$TMP/char.zip" -d "$TMP/x"
# The archive's top folder is the PixelLab display name, not the id.
SRC="$(find "$TMP/x" -maxdepth 1 -mindepth 1 -type d | head -1)"
mkdir -p "$OUT"

for dir in "$SRC"/animations/*/*/; do
  [ -d "$dir" ] || continue
  d="$(basename "$dir")"
  anim="$(basename "$(dirname "$dir")")"
  frames=("$dir"frame_*.png)
  # Drop any earlier strip for this anim+direction first: the frame count is in
  # the filename, so a re-fetch at a different count would leave BOTH on disk and
  # the rig would register two animations under one key.
  rm -f "$OUT/${anim}_${d}_f"*.png
  node "$ROOT/art/tools/sheet.mjs" --strip "$OUT/${anim}_${d}_f${#frames[@]}.png" "${frames[@]}"
done

for rot in "$SRC"/rotations/*.png; do
  d="$(basename "$rot" .png)"
  # Only cardinals — an 8-direction character also ships the diagonals, which
  # the game's 4-way facing has no use for.
  case "$d" in south|north|east|west) ;; *) continue ;; esac
  compgen -G "$OUT/idle_${d}_f*.png" >/dev/null && continue
  cp "$rot" "$OUT/idle_${d}_f1.png"
  echo "$OUT/idle_${d}_f1.png: still frame from rotation"
done
