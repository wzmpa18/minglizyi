#!/bin/bash
# 回归异常项复测（正确路径口径）
BASE=https://yandaoguoxue.yandao.vip
BE=/www/yandaoguoxue-backend
TOKEN=$(cd $BE && node -e "require('dotenv').config({path:'.env'}); console.log(require('jsonwebtoken').sign({userId:910077,phone:'19800000099'}, process.env.JWT_SECRET, {expiresIn:'10m'}))")
p(){ echo -n "$1: "; curl -sk -o /dev/null -m 10 -w '%{http_code}\n' "$BASE$2"; }
a(){ echo -n "$1(带Token): "; curl -sk -o /dev/null -m 10 -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" "$BASE$2"; }
p "/api/health" "/api/health"
p "/share/result/" "/share/result/"
p "/invite/" "/invite/"
a "social/friends/list" "/api/social/friends/list"
a "social/posts" "/api/social/posts"
a "ai/quota" "/api/ai/quota"
a "social/blacklist" "/api/social/blacklist"
a "social/favorites/mine" "/api/social/favorites/mine"
