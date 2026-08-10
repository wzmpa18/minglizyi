# 言道国学认证后端模块 - 部署说明

版本：v20.3  
部署目录：`/root/backend-auth/`

---

## 1. 模块概述

本模块为言道国学提供完整的用户注册/登录认证服务，包含以下能力：

| 能力 | 服务 | 关键参数 |
|------|------|----------|
| 短信验证码 | 腾讯云SMS API v3 | SdkAppId=1401146274, 模板186686, 签名=东莞言道科技有限公司 |
| 邮件验证码 | 腾讯云邮件推送(SES) API | 发件noreply@yandao.vip, 模板186641, 发件人=言道国学 |
| 密码加密 | bcrypt | 10轮哈希 |
| Token签发 | JWT 双轨 | access(7天) + refresh(30天) |
| 数据存储 | SQLite (better-sqlite3) | WAL模式 |
| 防刷控制 | 内存Map | 60秒冷却/IP每分钟3次/每日10次/5分钟有效一次性 |

### 路由列表（前缀 `/api/auth`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/send-code` | 发送验证码（手机/邮箱） |
| POST | `/api/auth/verify-code` | 校验验证码 |
| POST | `/api/auth/register` | 注册（手机/邮箱+密码） |
| POST | `/api/auth/check-duplicate` | 查重（手机/邮箱实时校验） |
| POST | `/api/auth/refresh-token` | 刷新token |
| POST | `/api/auth/login` | 密码登录（手机/邮箱） |

---

## 2. 文件清单

```
/root/backend-auth/
├── smsService.js          # 腾讯云SMS短信发送服务
├── emailService.js        # 腾讯云SES邮件发送服务
├── authRoutes.js          # 认证路由模块（需注入db）
├── register_routes.js     # 完整集成模块（含SQLite+所有路由）
├── verificationStore.js   # 验证码存储与频率限制
├── .env                   # 环境变量配置（从.env.example复制）
├── .env.example           # 环境变量模板
├── DEPLOY.md              # 本部署说明
└── data/
    └── yandao_users.db    # SQLite数据库文件（自动创建）
```

---

## 3. 部署步骤

### 3.1 创建部署目录

```bash
mkdir -p /root/backend-auth/data
cd /root/backend-auth
```

### 3.2 复制模块文件

将以下文件复制到 `/root/backend-auth/` 目录：

```bash
# 从项目源码复制
cp src/lib/backend/smsService.js /root/backend-auth/
cp src/lib/backend/emailService.js /root/backend-auth/
cp src/lib/backend/authRoutes.js /root/backend-auth/
cp src/lib/backend/register_routes.js /root/backend-auth/
cp src/lib/backend/verificationStore.js /root/backend-auth/
cp src/lib/backend/.env.example /root/backend-auth/
cp src/lib/backend/DEPLOY.md /root/backend-auth/
```

### 3.3 安装依赖

在 `/root/backend-auth/` 目录下创建 `package.json` 并安装依赖：

```bash
cd /root/backend-auth

# 初始化package.json（如果尚未存在）
npm init -y

# 安装依赖
npm install express bcrypt jsonwebtoken better-sqlite3
```

### 3.4 配置环境变量

```bash
cd /root/backend-auth
cp .env.example .env

# 编辑 .env 文件，填入真实的密钥
vim .env
```

`.env` 文件需要填写的变量：

```bash
# 腾讯云SMS密钥（从腾讯云控制台获取）
TENCENT_SMS_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxx
TENCENT_SMS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# 腾讯云SES密钥（从腾讯云控制台获取）
TENCENT_SES_SECRET_ID=AKIDyyyyyyyyyyyyyyyy
TENCENT_SES_SECRET_KEY=yyyyyyyyyyyyyyyyyyyy
TENCENT_SES_FROM_EMAIL=noreply@yandao.vip
TENCENT_SES_TEMPLATE_ID=186641

# JWT密钥（请替换为随机字符串）
JWT_SECRET=your_random_jwt_secret_at_least_32_chars
JWT_ACCESS_EXPIRES=7d
JWT_REFRESH_EXPIRES=30d

# 数据库路径
DB_PATH=/root/backend-auth/data/yandao_users.db
```

> **注意**：以下参数已硬编码在代码中，无需通过环境变量配置：
> - SMS: SdkAppId=1401146274, 模板ID=186686, 签名=东莞言道科技有限公司
> - SES: 发件地址=noreply@yandao.vip, 模板ID=186641, 发件人=言道国学

### 3.5 验证部署

```bash
cd /root/backend-auth
node -e "
require('dotenv').config();
const r = require('./register_routes');
r.initDatabase();
console.log('数据库初始化成功');
console.log('模块加载成功，可挂载到Express应用');
"
```

---

## 4. 挂载到 ai-proxy-server.js

### 4.1 方式一：直接挂载（推荐）

在 `ai-proxy-server.js` 中添加以下代码：

```javascript
// ============================================================================
// 认证路由挂载
// ============================================================================
require('dotenv').config(); // 确保.env已加载

const registerRoutes = require('./src/lib/backend/register_routes');

// 挂载认证路由到 /api/auth 前缀
app.use('/api/auth', registerRoutes.createRouter());

console.log('[AUTH] 认证路由已挂载到 /api/auth');
```

### 4.2 方式二：独立部署为微服务

创建独立的 Express 服务器：

```javascript
// /root/backend-auth/server.js
require('dotenv').config();

const express = require('express');
const registerRoutes = require('./register_routes');

const app = express();
app.use(express.json());

// 挂载认证路由
app.use('/api/auth', registerRoutes.createRouter());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend-auth', version: 'v20.3' });
});

const PORT = process.env.AUTH_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[AUTH] 认证服务启动，端口: ${PORT}`);
  console.log(`[AUTH] 路由前缀: /api/auth`);
});
```

### 4.3 方式三：通过 Nginx 反向代理集成

如果 ai-proxy-server 运行在其他端口，可通过 Nginx 转发：

```nginx
# /etc/nginx/conf.d/yandao-auth.conf
location /api/auth/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 5. PM2 进程管理

### 5.1 使用 PM2 启动（独立部署方式）

```bash
# 安装PM2（如果尚未安装）
npm install -g pm2

# 启动认证服务
cd /root/backend-auth
pm2 start server.js --name "backend-auth"

# 保存PM2配置（开机自启）
pm2 save
pm2 startup
```

### 5.2 PM2 常用命令

```bash
# 查看状态
pm2 status backend-auth

# 查看日志
pm2 logs backend-auth

# 重启服务（更新代码后）
pm2 restart backend-auth

# 停止服务
pm2 stop backend-auth

# 删除进程
pm2 delete backend-auth

# 重载（零停机重启）
pm2 reload backend-auth
```

### 5.3 PM2 配置文件（可选）

创建 `/root/backend-auth/ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'backend-auth',
    script: './server.js',
    cwd: '/root/backend-auth',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/root/backend-auth/logs/error.log',
    out_file: '/root/backend-auth/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

使用配置文件启动：

```bash
mkdir -p /root/backend-auth/logs
pm2 start ecosystem.config.js
pm2 save
```

---

## 6. 环境变量配置说明

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| `TENCENT_SMS_SECRET_ID` | 是 | 腾讯云SMS密钥ID | AKIDxxxxxxxx |
| `TENCENT_SMS_SECRET_KEY` | 是 | 腾讯云SMS密钥Key | xxxxxxxx |
| `TENCENT_SES_SECRET_ID` | 是 | 腾讯云SES密钥ID | AKIDyyyyyyyy |
| `TENCENT_SES_SECRET_KEY` | 是 | 腾讯云SES密钥Key | yyyyyyyy |
| `TENCENT_SES_FROM_EMAIL` | 否 | 发件邮箱（已硬编码noreply@yandao.vip） | noreply@yandao.vip |
| `TENCENT_SES_TEMPLATE_ID` | 否 | 邮件模板ID（已硬编码186641） | 186641 |
| `JWT_SECRET` | 是 | JWT签名密钥 | 随机字符串(32位+) |
| `JWT_ACCESS_EXPIRES` | 否 | access token有效期 | 7d |
| `JWT_REFRESH_EXPIRES` | 否 | refresh token有效期 | 30d |
| `DB_PATH` | 否 | SQLite数据库路径 | /root/backend-auth/data/yandao_users.db |

---

## 7. 硬编码参数一览

以下参数已硬编码在源码中，不可通过环境变量覆盖：

### 腾讯云SMS（smsService.js）

| 参数 | 值 | 说明 |
|------|-----|------|
| SdkAppId | 1401146274 | 短信应用ID |
| 模板ID | 186686 | 短信模板ID |
| 签名 | 东莞言道科技有限公司 | 短信签名 |
| 地区 | ap-guangzhou | API地区 |
| 模板参数{1} | 验证码 | 6位数字 |
| 模板参数{2} | 5 | 有效时间(分钟) |

### 腾讯云SES（emailService.js）

| 参数 | 值 | 说明 |
|------|-----|------|
| 发件地址 | noreply@yandao.vip | 发件人邮箱 |
| 发件人名称 | 言道国学 | 发件人别名 |
| 模板ID | 186641 | 邮件模板ID |
| 地区 | ap-guangzhou | API地区 |
| 模板变量{{.code}} | 验证码 | 6位数字 |
| 模板变量{{.expire}} | 5 | 有效时间(分钟) |

### 防刷规则（verificationStore.js）

| 规则 | 值 | 说明 |
|------|-----|------|
| 单号码冷却 | 60秒 | 同一号码60秒内不可重发 |
| 单IP每分钟 | 3次 | 同一IP每分钟最多3次请求 |
| 单IP每日 | 10次 | 同一IP每天最多10次请求 |
| 验证码有效期 | 5分钟 | 验证码5分钟后过期 |
| 一次性使用 | 是 | 校验通过后立即删除 |

---

## 8. 验证测试

部署完成后，可使用 curl 测试各接口：

```bash
# 健康检查（独立部署方式）
curl http://localhost:3001/health

# 发送短信验证码
curl -X POST http://localhost:3001/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'

# 发送邮件验证码
curl -X POST http://localhost:3001/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 校验验证码
curl -X POST http://localhost:3001/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}'

# 注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456","password":"test1234"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"test1234"}'

# 刷新token
curl -X POST http://localhost:3001/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your_refresh_token"}'

# 查重
curl -X POST http://localhost:3001/api/auth/check-duplicate \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
```

---

## 9. 更新后重启流程

每次更新代码后，按以下步骤重启：

```bash
# 1. 复制更新的文件到部署目录
cp src/lib/backend/*.js /root/backend-auth/

# 2. 重启PM2进程
pm2 restart backend-auth

# 3. 验证服务状态
pm2 status backend-auth
pm2 logs backend-auth --lines 20

# 4. 测试接口
curl http://localhost:3001/health
```
