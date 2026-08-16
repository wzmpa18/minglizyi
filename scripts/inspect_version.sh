#!/bin/bash
cd /root/yandaoguoxue-source
grep -n '"version"' package.json | head -3
echo '--- scripts ---'
node -e 'const p=require("./package.json");console.log(JSON.stringify(p.scripts,null,1))'
echo '--- version.json writers ---'
grep -rn 'version.json' next.config.js scripts/ 2>/dev/null | grep -v node_modules | head -8
echo '--- out/version.json ---'
cat out/version.json
