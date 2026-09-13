#!/bin/bash
set +e
echo "--- verify目录全部文件 ---"
ls -la /root/yandaoguoxue/verify/ 2>/dev/null
echo ""
echo "--- U447glXVJ3l8Obskdb3h.html 内容 ---"
cat /root/yandaoguoxue/verify/U447glXVJ3l8Obskdb3h.html 2>/dev/null
echo ""
echo "--- 公网访问测试 ---"
curl -sk -m 10 "https://yandaoguoxue.yandao.vip/U447glXVJ3l8Obskdb3h.html" | head -2
echo ""
echo "--- 百度验证文件公网 ---"
curl -sk -m 10 "https://yandaoguoxue.yandao.vip/baidu_verify_codeva-mdfUGkzbxU.html" | head -2
