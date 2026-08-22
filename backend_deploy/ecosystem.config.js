module.exports = {
  apps: [
    {
      name: "yandaoguoxue-backend",
      script: "server.js",
      cwd: "/www/yandaoguoxue-backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        API_PORT: 3001,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/www/yandaoguoxue-backend/logs/error.log",
      out_file: "/www/yandaoguoxue-backend/logs/out.log",
      merge_logs: true,
      max_memory_restart: "200M",
      autorestart: true,
      watch: false,
    },
  ],
};
