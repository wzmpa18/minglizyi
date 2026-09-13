$ErrorActionPreference = 'SilentlyContinue'
$base = "C:\Users\ZhuanZ\Projects\minglizyi"
[xml]$sm = Get-Content "$base\public\sitemap.xml"
$results = @()
$i = 0
foreach ($loc in $sm.urlset.url.loc) {
  $i++
  $path = $loc -replace 'https://yandaoguoxue\.yandao\.vip',''
  try {
    $r = Invoke-WebRequest -Uri $loc -UseBasicParsing -TimeoutSec 25
    $html = $r.Content
    $title = ''
    if ($html -match '(?s)<title[^>]*>(.*?)</title>') { $title = $Matches[1].Trim() }
    $desc = ''
    if ($html -match '(?s)<meta\s+name=["'']description["'']\s+content=["'']([^"'']*)["'']') { $desc = $Matches[1].Trim() }
    elseif ($html -match '(?s)<meta\s+content=["'']([^"'']*)["'']\s+name=["'']description["'']') { $desc = $Matches[1].Trim() }
    $text = $html -replace '(?s)<script.*?</script>',' ' -replace '(?s)<style.*?</style>',' ' -replace '(?s)<[^>]+>',' ' -replace '\s+',' '
    $results += [PSCustomObject]@{ Path=$path; Title=$title; TitleLen=$title.Length; DescLen=$desc.Length; Desc=$desc.Substring(0,[Math]::Min(60,$desc.Length)); TextLen=$text.Length; Status=$r.StatusCode }
  } catch {
    $results += [PSCustomObject]@{ Path=$path; Title="ERR"; TitleLen=0; DescLen=0; Desc=''; TextLen=0; Status=0 }
  }
  if ($i % 20 -eq 0) { Write-Output "progress: $i/$($sm.urlset.url.loc.Count)" }
}
$results | Export-Csv "$base\scripts\seo_scan_result.csv" -NoTypeInformation -Encoding UTF8
Write-Output "=== DONE $($results.Count) rows ==="
Write-Output "--- DUP_TITLES ---"
$results | Group-Object Title | Where-Object { $_.Count -gt 1 } | Sort-Object Count -Descending | ForEach-Object { "$($_.Count)x [$($_.Name)]" }
Write-Output "--- SHORT_TITLE(<10) ---"
$results | Where-Object { $_.TitleLen -lt 10 -and $_.TitleLen -gt 0 } | ForEach-Object { "$($_.Path) | $($_.TitleLen) | $($_.Title)" }
Write-Output "--- SHORT_DESC(<70) ---"
$results | Where-Object { $_.DescLen -lt 70 } | ForEach-Object { "$($_.Path) | $($_.DescLen)" }
Write-Output "--- NO_DESC_COUNT ---"
($results | Where-Object { $_.DescLen -eq 0 }).Count
Write-Output "--- THIN_CONTENT(<800) ---"
$results | Where-Object { $_.TextLen -lt 800 -and $_.Status -eq 200 } | ForEach-Object { "$($_.Path) | $($_.TextLen)" }
