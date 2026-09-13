# 本地 out/ 全量 SEO 核查（对照必应站长平台5项警告）
# 用法: powershell -ExecutionPolicy Bypass -File scripts\seo_scan_local.ps1
param([string]$OutDir = "C:\Users\ZhuanZ\Projects\minglizyi\out")

$pages = @()
Get-ChildItem $OutDir -Recurse -Filter "index.html" | ForEach-Object {
  $rel = $_.FullName.Substring($OutDir.Length).Replace('\', '/').Replace('/index.html', '/')
  if ($rel -eq '') { $rel = '/' }
  $t = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
  $title = [regex]::Match($t, '<title>([^<]*)</title>').Groups[1].Value
  $desc = [regex]::Match($t, 'name="description" content="([^"]+)"').Groups[1].Value
  $robots = [regex]::Match($t, 'name="robots" content="([^"]+)"').Groups[1].Value
  $noindex = $robots -match 'noindex'
  $text = [regex]::Replace($t, '<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>', ' ')
  $text = [regex]::Replace($text, '\s+', ' ').Trim()
  $pages += [pscustomobject]@{ Path = $rel; Title = $title; TitleLen = $title.Length; Desc = $desc; DescLen = $desc.Length; TextLen = $text.Length; Noindex = $noindex }
}

$indexable = $pages | Where-Object { -not $_.Noindex -and $_.Title -ne '' }
"总页面: $($pages.Count) | 可索引: $($indexable.Count) | noindex: $(($pages | Where-Object Noindex).Count)"

"=== [1] 重复标题（可索引页）==="
$dupT = $indexable | Group-Object Title | Where-Object { $_.Count -gt 1 }
if ($dupT) { $dupT | ForEach-Object { "$($_.Count)x $($_.Name) -> $((($_.Group | ForEach-Object Path) -join ' '))" } } else { "PASS 无重复" }

"=== [2] 重复描述（可索引页）==="
$dupD = $indexable | Group-Object Desc | Where-Object { $_.Count -gt 1 }
if ($dupD) { $dupD | ForEach-Object { "$($_.Count)x descLen=$($_.Group[0].DescLen) -> $((($_.Group | ForEach-Object Path) -join ' '))" } } else { "PASS 无重复" }

"=== [3] 短标题 <15字符（可索引页）==="
$st = $indexable | Where-Object { $_.TitleLen -lt 15 }
if ($st) { $st | ForEach-Object { "$($_.Path) len=$($_.TitleLen) [$($_.Title)]" } } else { "PASS 无" }

"=== [4] 短描述 <70字符（可索引页）==="
$sd = $indexable | Where-Object { $_.DescLen -lt 70 }
if ($sd) { $sd | ForEach-Object { "$($_.Path) len=$($_.DescLen)" } } else { "PASS 无" }

"=== [5] 薄内容 <800字符（可索引页）==="
$tc = $indexable | Where-Object { $_.TextLen -lt 800 }
if ($tc) { $tc | Sort-Object TextLen | ForEach-Object { "$($_.Path) textLen=$($_.TextLen)" } } else { "PASS 无" }

$pages | Export-Csv "C:\Users\ZhuanZ\Projects\minglizyi\scripts\seo_scan_local_result.csv" -NoTypeInformation -Encoding UTF8
"=== 明细已导出 scripts\seo_scan_local_result.csv ==="
