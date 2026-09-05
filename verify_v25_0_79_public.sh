#!/bin/bash
set -u
BASE="https://yandaoguoxue.yandao.vip"
for page in "/ai" "/tools/qimen.html" "/records"; do
  chunks=$(curl -skL -m 10 "${BASE}${page}" | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u | head -15)
  for u in $chunks; do
    if curl -sk -m 10 "${BASE}${u}" | grep -q "仅用于国学、历法学术研究"; then
      echo "HIT: ${page} -> ${u} 含 AI免责声明"
      exit 0
    fi
  done
  echo "miss on ${page}"
done
echo "not found in sampled chunks"
