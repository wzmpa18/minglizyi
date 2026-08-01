module.exports = {
  apps: [{
    name: 'yandao-web',
    script: 'server.js',
    cwd: '/var/www/yandao/web',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
