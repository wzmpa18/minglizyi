$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
$HOST_ = "yandaoguoxue.yandao.vip"
$out = @()

function Get-Search($name, $url) {
  try {
    $r = curl.exe -s -m 15 -A $UA -H "Accept-Language: zh-CN,zh;q=0.9" -L $url 2>$null
    $html = $r -join "`n"
    if ($html -match "很抱歉，没有找到|没有找到相关结果") { $status = "无结果(未收录或site:不支持)" }
    elseif ($html -match "wasm_captcha|百度安全验证|异常访问|antispider|seccode|verify") { $status = "触发反爬验证" }
    else {
      $m = [regex]::Match($html, "(找到相关结果数约?[\d,，]+|约[\d,，]+条结果|共[\d,，]+条结果|[\d,，]+\s*(条结果|个结果|条))")
      $cnt = if ($m.Success) { $m.Value } else { "未解析到计数" }
      $links = ([regex]::Matches($html, "(?:baidu\.com/link|href=""https?://[^""]*$HOST_)")).Count
      $status = "$cnt | 页内相关链接:$links"
    }
    Write-Host "[$name] $status"
    $script:out += "[$name] $status"
  } catch { Write-Host "[$name] 请求失败: $_" }
  Start-Sleep -Seconds 4
}

Write-Host "===== 本地住宅IP搜索引擎收录核查 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ====="
Get-Search "百度整站" "https://www.baidu.com/s?wd=site%3A$HOST_&rn=50&ie=utf-8"
Get-Search "搜狗整站" "https://www.sogou.com/web?query=site%3A$HOST_"
Get-Search "360整站" "https://www.so.com/s?q=site%3A$HOST_"
Get-Search "必应整站" "https://www.bing.com/search?q=site%3A$HOST_&count=50&mkt=zh-CN"
Get-Search "头条整站" "https://so.toutiao.com/search?dvpf=pc&keyword=site%3A$HOST_"
Get-Search "Google整站" "https://www.google.com/search?q=site%3A$HOST_&num=30"

Write-Host "`n===== 重点URL百度逐条核查 ====="
$urls = @(
  "https://$HOST_/yixue/qizheng/",
  "https://$HOST_/academy/yixue/qizheng/",
  "https://$HOST_/tools/luopan.html",
  "https://$HOST_/tools/liji-ruler.html",
  "https://$HOST_/tools/luban-ruler.html",
  "https://$HOST_/learn/mianfei-zhongyi-tiku.html"
)
foreach ($u in $urls) {
  $q = [uri]::EscapeDataString($u)
  $html = (curl.exe -s -m 15 -A $UA -H "Accept-Language: zh-CN,zh;q=0.9" "https://www.baidu.com/s?wd=$q&ie=utf-8" 2>$null) -join "`n"
  if ($html -match "百度安全验证|异常访问|wasm_captcha") { $st = "风控" }
  elseif ($html -match "很抱歉，没有找到") { $st = "NOT_INDEXED" }
  elseif ($html -match "找到相关结果") { $st = "INDEXED" }
  else { $st = "UNKNOWN" }
  Write-Host "$st  $u"
  $out += "$st  $u"
  Start-Sleep -Seconds 4
}

Write-Host "`n===== 关键词排名抽查（百度前50） ====="
$keywords = @("七政四余排盘", "中医自学", "免费中医题库", "玄空飞星罗盘", "鲁班尺在线")
foreach ($kw in $keywords) {
  $q = [uri]::EscapeDataString($kw)
  $html = (curl.exe -s -m 15 -A $UA -H "Accept-Language: zh-CN,zh;q=0.9" "https://www.baidu.com/s?wd=$q&rn=50&ie=utf-8" 2>$null) -join "`n"
  if ($html -match "百度安全验证|wasm_captcha") { Write-Host "[$kw] 触发风控"; continue }
  $rank = 0
  if ($html -match $HOST_) { $rank = "前50有排名" } else { $rank = "前50未见" }
  Write-Host "[$kw] $rank"
  $out += "[$kw] $rank"
  Start-Sleep -Seconds 5
}
$out | Out-File "C:\Users\ZhuanZ\Projects\minglizyi\scripts\index_check_result.txt" -Encoding UTF8
Write-Host "`n结果已存: scripts\index_check_result.txt"
