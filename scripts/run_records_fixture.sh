#!/bin/bash
# v25.0.77 会员专属云端同步 fixture（服务端 /www/yandaoguoxue-backend 下运行）
cd /www/yandaoguoxue-backend
export PATH=/usr/local/node-v22/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
node records_fixture_v25_0_77.js
