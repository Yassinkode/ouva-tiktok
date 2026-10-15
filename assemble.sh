#!/bin/bash
# Concats chunks, adds subtle film grain and the final audio mix.
cd "$(dirname "$0")"
ls out/chunks/c_*.mp4 | sort -t_ -k2 -n | sed "s#^#file '$(pwd)/#; s#\$#'#" > out/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -i public/mix.wav \
  -vf "noise=c0s=5:c0f=t+u,format=yuv420p" -c:v libx264 -preset slow -crf 16 -profile:v high -r 60 \
  -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/OuVa_pub_1080x1920_60fps.mp4
echo assembled
