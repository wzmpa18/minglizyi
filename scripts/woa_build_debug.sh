#!/bin/bash
cd /root/yandaoguoxue-source
export PATH=/usr/local/node-v22/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
npm run build 2>&1 | grep -v '^\s*at ' | tail -45
echo "=== version.json ==="
cat out/version.json
