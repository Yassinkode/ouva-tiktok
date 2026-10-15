#!/bin/bash
# Renders the ad in chunks (so a fix only needs one chunk re-rendered), then assembles.
cd "$(dirname "$0")"
mkdir -p out/chunks
CH=${CHUNKS:-"0-659 660-1319 1320-1739 1740-2219 2220-2489"}
for r in $CH; do
  npx remotion render OuvaAd out/chunks/c_$r.mp4 --frames=$r --muted --crf=12 --log=error || exit 1
  echo "chunk $r done $(date +%T)"
done
