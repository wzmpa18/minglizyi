#!/bin/bash
BASE=https://yandaoguoxue.yandao.vip
echo "test1: pipe grep count"
curl -sk -m 10 "${BASE}/yixue/huangli/" | grep -c "钦定协纪辨方书"
echo "exit1=$?"
echo "test2: file grep"
curl -sk -m 10 "${BASE}/yixue/huangli/" -o /tmp/hl2.html
grep -c "钦定协纪辨方书" /tmp/hl2.html
echo "exit2=$?"
echo "test3: locale"
locale | head -2
echo "test4: bytes diff"
wc -c /tmp/hl2.html /tmp/hl.html
