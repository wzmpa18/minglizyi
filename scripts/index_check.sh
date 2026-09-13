#!/bin/bash
# 搜索引擎真实收录状态核查（site:查询，非提交状态——这是"已收录"的直接证据）
# 从北京服务器发起（国内直连百度/搜狗/360，无代理问题）
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
HOST="yandaoguoxue.yandao.vip"

baidu_count() {
  # 百度 site: 收录数（从结果页"找到相关结果数约X个"提取）
  local html=$(curl -s -m 15 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://www.baidu.com/s?wd=site%3A${HOST}&rn=50&ie=utf-8")
  local n=$(echo "$html" | grep -oE '找到相关结果数约?[0-9,，]+个?' | head -1)
  local exact=$(echo "$html" | grep -oE '"siteSign":"[^"]*"' | wc -l)
  echo "百度site:计数文本=[$n] 页面结果数=[$exact]"
  echo "$html" | grep -oE 'href="(http[^"]*baidu\.com/link[^"]*)"' | wc -l | xargs echo "  可解析链接数:"
}

baidu_url_indexed() {
  # 检查指定URL是否被百度收录：搜索URL本身，若有结果且含该URL则已收录
  local u="$1"
  local html=$(curl -s -m 15 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://www.baidu.com/s?wd=$(echo "$u" | sed 's/:/%3A/g;s/\//%2F/g;s/?/%3F/g')&ie=utf-8")
  if echo "$html" | grep -q "很抱歉，没有找到"; then
    echo "NOT_INDEXED"
  elif echo "$html" | grep -q "找到相关结果"; then
    echo "INDEXED_OR_RELATED"
  else
    echo "UNKNOWN(可能被风控)"
  fi
}

sogou_count() {
  local html=$(curl -s -m 15 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://www.sogou.com/web?query=site%3A${HOST}")
  local n=$(echo "$html" | grep -oE '找到约?[0-9,，]+条' | head -1)
  [ -z "$n" ] && n=$(echo "$html" | grep -oE '[0-9,]+条结果' | head -1)
  if echo "$html" | grep -q "验证码\|antispider"; then n="$n [疑似触发反爬]"; fi
  echo "搜狗: [$n]"
}

so360_count() {
  local html=$(curl -s -m 15 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://www.so.com/s?q=site%3A${HOST}")
  local n=$(echo "$html" | grep -oE '找到相关结果约?[0-9,，]+个|共[0-9,，]+条结果' | head -1)
  if echo "$html" | grep -q "验证码\|captcha"; then n="$n [疑似触发反爬]"; fi
  echo "360: [$n]"
}

bing_count() {
  local html=$(curl -s -m 15 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://www.bing.com/search?q=site%3A${HOST}&count=50&mkt=zh-CN")
  local n=$(echo "$html" | grep -oE '[0-9,，]+ (条结果|results)' | head -1)
  echo "必应: [$n]"
}

toutiao_count() {
  local html=$(curl -s -m 15 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://so.toutiao.com/search?dvpf=pc&keyword=site%3A${HOST}")
  local n=$(echo "$html" | grep -oE '约[0-9,，]+条结果|共[0-9,，]+条' | head -1)
  echo "头条: [$n] (头条搜索对site:支持有限，结果仅参考)"
}

google_count() {
  # Google 需代理，服务器直连可能超时——尝试一下
  local html=$(curl -s -m 10 -A "$UA" -H "Accept-Language: zh-CN,zh;q=0.9" \
    "https://www.google.com/search?q=site%3A${HOST}&num=30" 2>/dev/null)
  local n=$(echo "$html" | grep -oE '约 [0-9,，]+ 条结果|about [0-9,]+ results' | head -1)
  if [ -z "$html" ]; then echo "Google: [服务器无法直连，需Owner在GSC/浏览器核查]"; else echo "Google: [$n]"; fi
}

echo "########## 搜索引擎收录核查 $(date '+%F %T') ##########"
echo ""
echo "== 1. 各引擎 site:${HOST} 整站收录 =="
baidu_count
sleep 3
sogou_count
sleep 3
so360_count
sleep 3
bing_count
sleep 3
toutiao_count
sleep 3
google_count

echo ""
echo "== 2. 重点URL百度收录逐条核查 =="
for u in \
  "https://${HOST}/yixue/qizheng/" \
  "https://${HOST}/academy/yixue/qizheng/" \
  "https://${HOST}/tools/luopan.html" \
  "https://${HOST}/tools/liji-ruler.html" \
  "https://${HOST}/tools/luban-ruler.html" \
  "https://${HOST}/learn/mianfei-zhongyi-tiku.html" \
  "https://${HOST}/zhongyi/exam/practice" ; do
  st=$(baidu_url_indexed "$u")
  echo "$st  $u"
  sleep 3
done
