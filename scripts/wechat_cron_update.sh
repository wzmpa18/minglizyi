#!/bin/bash
set -e
# FINAL-17 第十六章：微信4批/月 —— crontab 从每日调度改为批次日(1,8,15,22)调度
crontab -l > /tmp/cron_backup_20260913.txt
echo "--- 备份已存 /tmp/cron_backup_20260913.txt ---"

python3 - <<'PYEOF'
import subprocess
cur = subprocess.run(['crontab', '-l'], capture_output=True, text=True).stdout
lines = cur.splitlines()
out = []
for line in lines:
    if 'wechatContentScheduler' in line:
        # 每日 -> 批次日
        if line.startswith('40 6 * * *'):
            line = line.replace('40 6 * * *', '40 6 1,8,15,22 * *', 1)
        elif line.startswith('0 7 * * *'):
            line = line.replace('0 7 * * *', '0 7 1,8,15,22 * *', 1)
        elif line.startswith('30 7 * * *'):
            line = line.replace('30 7 * * *', '30 7 1,8,15,22 * *', 1)
        elif line.startswith('50 7 * * *'):
            line = line.replace('50 7 * * *', '50 7 1,8,15,22 * *', 1)
    out.append(line)
new = '\n'.join(out) + '\n'
subprocess.run(['crontab', '-'], input=new, text=True, check=True)
print('CRON_UPDATED')
PYEOF

echo '--- 更新后的微信相关cron ---'
crontab -l | grep wechatContentScheduler
