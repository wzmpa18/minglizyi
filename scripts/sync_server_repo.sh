#!/bin/bash
cd /root/yandaoguoxue-source
git checkout -- public/version.json 2>/dev/null || true
git checkout -- package-lock.json 2>/dev/null || true
echo "server worktree cleaned: $(git status --short | wc -l) dirty files left"
