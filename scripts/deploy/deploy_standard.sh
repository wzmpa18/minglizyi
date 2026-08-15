#!/bin/bash
# ============================================================
# 部署流程标准化 v2.0
# 项目: minglizyi / 言道国学
# 更新: 2026-08-15 学外语项目已迁出本服务器（用户授权清理）
#       修正身份校验匹配本机真实环境；隔离验证改为 /xuewaiyu/ 必须不可用
# 用途: 标准化部署流程 - 身份校验→范围校验→七层门禁→Nginx路径校验→事故回归→隔离验证→原子切换
# ============================================================

set -euo pipefail

TIMESTAMP=$(date '+%Y-%m-%d_%H:%M:%S')
mkdir -p /root/yandaoguoxue/logs
DEPLOY_LOG="/root/yandaoguoxue/logs/deploy_$(date '+%Y%m%d_%H%M%S').log"
GATE_DIR="/root/yandaoguoxue"
DOMAIN="https://yandaoguoxue.yandao.vip"
BLOCKED=false

log_step() {
  echo "[${TIMESTAMP}] $1" | tee -a "$DEPLOY_LOG"
}

block() {
  echo "[${TIMESTAMP}] BLOCKED: $1" | tee -a "$DEPLOY_LOG"
  BLOCKED=true
}

# ============================================================
# STEP 0: 身份校验 (机器门禁)
# ============================================================
log_step "STEP-0: 身份校验"

# 公网IP：腾讯云 metadata 获取（本机为轻量服务器，内网IP为10.2.0.15）
PUBLIC_IP=$(curl -s --connect-timeout 3 http://metadata.tencentyun.com/latest/meta-data/public-ipv4 2>/dev/null || echo "")
if [ "$PUBLIC_IP" != "82.156.228.87" ]; then
  block "公网IP校验失败: '${PUBLIC_IP}' != 82.156.228.87"
else
  log_step "STEP-0: 公网IP校验通过 (${PUBLIC_IP})"
fi

INSTANCE_ID=$(curl -s --connect-timeout 3 http://metadata.tencentyun.com/latest/meta-data/instance-id 2>/dev/null || echo "")
if [ "$INSTANCE_ID" != "ins-gvpvo1op" ]; then
  block "实例ID校验失败: ${INSTANCE_ID} != ins-gvpvo1op"
else
  log_step "STEP-0: 实例ID校验通过 (${INSTANCE_ID})"
fi

if [ ! -f "/www/yandaoguoxue-backend/server.js" ]; then
  block "国学后端标识文件不存在: /www/yandaoguoxue-backend/server.js"
else
  log_step "STEP-0: 国学后端标识文件存在"
fi

# 学外语已迁出：残留路径必须不存在
for p in /www/xuewaiyu /www/xuewaiyu-backend; do
  if [ -d "$p" ]; then
    block "学外语残留路径仍存在（已授权清理）: ${p}"
  fi
done

log_step "STEP-0: 身份校验完成"

# ============================================================
# STEP 1: 范围校验
# ============================================================
log_step "STEP-1: 范围校验: 项目=minglizyi(言道国学), 唯一项目, 服务器=82.156.228.87"

# ============================================================
# STEP 2: 七层门禁
# ============================================================
log_step "STEP-2: 七层门禁"
if bash "${GATE_DIR}/gate_seven_layer.sh" >> "$DEPLOY_LOG" 2>&1; then
  log_step "STEP-2: 七层门禁 PASS"
else
  block "七层门禁 BLOCKED"
fi

# ============================================================
# STEP 3: Nginx路径校验
# ============================================================
log_step "STEP-3: Nginx路径校验"
if bash "${GATE_DIR}/gate_nginx_path.sh" >> "$DEPLOY_LOG" 2>&1; then
  log_step "STEP-3: Nginx路径校验 PASS"
else
  block "Nginx路径校验 BLOCKED"
fi

# ============================================================
# STEP 4: 事故回归测试
# ============================================================
log_step "STEP-4: 事故回归测试"
if bash "${GATE_DIR}/gate_regression.sh" >> "$DEPLOY_LOG" 2>&1; then
  log_step "STEP-4: 事故回归测试 PASS"
else
  block "事故回归测试 BLOCKED"
fi

# ============================================================
# STEP 5: 学外语迁出隔离验证 + 国学健康检查
# ============================================================
log_step "STEP-5: 隔离与健康验证"

MAIN_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "${DOMAIN}/" 2>/dev/null)
if [ "$MAIN_CODE" = "200" ]; then
  log_step "STEP-5: 国学主站 200 OK"
else
  block "国学主站异常: ${MAIN_CODE}"
fi

XW_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "${DOMAIN}/xuewaiyu/" 2>/dev/null)
if [ "$XW_CODE" = "404" ]; then
  log_step "STEP-5: /xuewaiyu/ 已隔离返回404（学外语迁出验证通过）"
else
  block "学外语隔离异常: /xuewaiyu/ -> ${XW_CODE}（预期404）"
fi

API_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "${DOMAIN}/api/health" 2>/dev/null)
log_step "STEP-5: 国学API /api/health -> ${API_CODE}"

# ============================================================
# 汇总
# ============================================================
log_step "============================================"
if $BLOCKED; then
  log_step "DEPLOY: BLOCKED - 禁止Atomic Switch"
  exit 1
else
  log_step "DEPLOY: ALL_GATES_PASS - 可以执行Atomic Switch"
  exit 0
fi
