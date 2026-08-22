#!/bin/bash
echo "=== /root 全部文件（非目录） ==="
ls -la /root/ | grep -v '^d' | grep -v '^total'
echo ""
echo "=== /root 全部目录 ==="
ls -la /root/ | grep '^d' | awk '{print $NF}'
echo ""
echo "=== /tmp 大文件 ==="
du -sh /tmp/* 2>/dev/null | sort -rh | head -10
