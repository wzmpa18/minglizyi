#!/bin/bash
echo '=== current symlink ==='
readlink -f /root/yandaoguoxue/current
echo '=== releases dir ==='
ls -la /root/yandaoguoxue/releases/ | tail -6
echo '=== deploy scripts in source ==='
ls /root/yandaoguoxue-source/scripts/ | grep -iE 'deploy|release' | tail -8
echo '=== how was v5 released (search script) ==='
grep -l 'v25.0.47_5' /root/yandaoguoxue-source/scripts/*.sh 2>/dev/null
