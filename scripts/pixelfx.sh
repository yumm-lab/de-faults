#!/bin/sh
# Rebuild public/de-faults/vendor/pixelfx.min.js from a pixelfx checkout.
# Usage: scripts/pixelfx.sh <path-to-pixelfx-clone>   (via ./dev pixelfx <path>)
# To add an effect: add an export line below, rebuild, then use it in fx.js.
# Clone into its own folder; the bundle is built from a temp dir outside it.
set -eu
cd "$(dirname "$0")/.."

src=$(cd "${1:?usage: ./dev pixelfx <path-to-pixelfx-clone>}" && pwd)
[ -f "$src/src/core/index.js" ] || { echo "pixelfx: $src is not a pixelfx checkout" >&2; exit 1; }
commit=$(git -C "$src" rev-parse HEAD)
out=public/de-faults/vendor/pixelfx.min.js
ESBUILD=0.25.10

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cat >"$tmp/entry.js" <<EOF
export { createFrame, clearFrame, createFx, createAct, actBounds, composite, painterFor, drawActor, stockActor, actorAlphaOf } from "$src/src/core/index.js";
export * as fireflies from "$src/src/fx/weather/fireflies.js";
export * as levelUp from "$src/src/fx/ui/level-up.js";
export * as exclamation from "$src/src/fx/ui/exclamation.js";
export * as confetti from "$src/src/fx/ui/confetti.js";
export * as questDone from "$src/src/fx/ui/quest-complete.js";
export * as coinCollect from "$src/src/fx/ui/coin-collect.js";
EOF

(cd "$tmp" && npx --yes "esbuild@$ESBUILD" entry.js --bundle --format=esm --minify --target=es2020 \
  --legal-comments=none --log-level=warning --outfile=bundle.js)

cat >"$out" <<EOF
/*! pixelfx (subset) · https://github.com/patch-gg/pixelfx @ $commit
 * MIT License, Copyright (c) 2026 Patch. Parts adapt Sprite Fusion pixel art VFX (c) 2026 Hugo Duprez, MIT,
 * and Hollow Crown (c) 2026 rehan-remade, MIT. Full text: /de-faults/vendor/PIXELFX-LICENSE.txt
 * Built with esbuild $ESBUILD (--bundle --format=esm --minify). Rebuild: ./dev pixelfx <clone>. */
EOF
cat "$tmp/bundle.js" >>"$out"
# vendor/PIXELFX-LICENSE.txt = upstream LICENSE + hand-written notices: update it by hand if upstream changes
echo "pixelfx: $out @ ${commit%"${commit#????????}"} ($(wc -c <"$out") bytes)"
