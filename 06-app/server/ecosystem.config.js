// PM2 进程管理配置 - AI 代理服务器
// 部署到 Linux 服务器后使用: pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name: "ai-proxy-server",
    script: "./index.js",
    env: {
      NODE_ENV: "production",
    },
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "500M",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    error_file: "../logs/ai-proxy-error.log",
    out_file: "../logs/ai-proxy-out.log",
  }],
};
