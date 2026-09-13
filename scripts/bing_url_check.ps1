$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
$HOST_ = "yandaoguoxue.yandao.vip"
Write-Output "===== Bing逐URL收录核查 $(Get-Date -Format 'HH:mm:ss') ====="

$paths = @(
  @("七政排盘页", "/yixue/qizheng/"),
  @("七政学习专区(新)", "/qizheng-study/"),
  @("七政入门(新)", "/qizheng-study/rumen.html"),
  @("中医自学hub(新)", "/zixue/"),
  @("中医入门(新)", "/zixue/zhongyi-zenme-rumen.html"),
  @("医考hub(新)", "/yikao/"),
  @("医考题库(新)", "/yikao/zhongyi-yikao-mianfei-tiku.html"),
  @("罗盘工具", "/tools/luopan.html"),
  @("立极尺", "/tools/liji-ruler.html"),
  @("玄空飞星", "/tools/xuankong-feixing.html"),
  @("鲁班尺", "/tools/luban-ruler.html"),
  @("中医题库落地页", "/learn/mianfei-zhongyi-tiku.html"),
  @("中药学题库(新)", "/yikao/zhongyaoxue-tiku.html")
)

foreach ($p in $paths) {
  $name = $p[0]; $path = $p[1]
  $q = [uri]::EscapeDataString("site:$HOST_$path")
  $html = (curl.exe -s -m 15 -A $UA -H "Accept-Language: zh-CN,zh;q=0.9" "https://www.bing.com/search?q=$q&count=20&mkt=zh-CN" 2>$null) -join "`n"
  if ($html -match "没有找到.*结果|There are no results") { $st = "NOT_INDEXED" }
  elseif ($html -match "$HOST_") { $st = "INDEXED" }
  elseif ($html -match "验证码|captcha") { $st = "风控" }
  else { $st = "UNKNOWN" }
  Write-Output "[$st] $name $path"
  Start-Sleep -Seconds 3
}

Write-Output ""
Write-Output "===== Bing关键词排名抽查（前20） ====="
$keywords = @("七政四余排盘", "中医自学", "免费中医题库", "医考题库", "罗盘在线", "鲁班尺", "立极尺")
foreach ($kw in $keywords) {
  $q = [uri]::EscapeDataString($kw)
  $html = (curl.exe -s -m 15 -A $UA -H "Accept-Language: zh-CN,zh;q=0.9" "https://www.bing.com/search?q=$q&count=20&mkt=zh-CN" 2>$null) -join "`n"
  if ($html -match $HOST_) {
    $idx = $html.IndexOf($HOST_)
    $st = "前20可见"
  } else { $st = "前20未见" }
  Write-Output "[$kw] $st"
  Start-Sleep -Seconds 4
}
