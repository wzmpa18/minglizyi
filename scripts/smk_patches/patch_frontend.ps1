$ErrorActionPreference = 'Stop'
# v25.0.40 社交×营销绑定 前端5文件补丁
# F1 inviteApi.ts(LF) / F2 membership(CRLF) / F3 BatchNumberMatching(CRLF)
# F4 inviteStore(CRLF+BOM) / F5 chat ClientPage(CRLF)
$base = "C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi"
$pd = "$base\scripts\smk_patches"
$utf8 = [System.Text.Encoding]::UTF8
$enc8NoBom = New-Object System.Text.UTF8Encoding($false)
$enc8Bom = New-Object System.Text.UTF8Encoding($true)

function LoadPayload([string]$name, [string]$eol) {
  $t = [System.IO.File]::ReadAllText("$pd\$name", $utf8)
  $t = $t -replace "`r`n", "`n"
  if ($eol -eq 'CRLF') { $t = $t -replace "`n", "`r`n" }
  return $t
}

function Apply([string]$content, [string]$anchor, [string]$payload, [string]$mode, [string]$label) {
  $count = [regex]::Matches($content, [regex]::Escape($anchor)).Count
  if ($count -ne 1) { throw "[$label] anchor count = $count (expect 1)" }
  switch ($mode) {
    'before'  { return $content.Replace($anchor, $payload + $anchor) }
    'after'   { return $content.Replace($anchor, $anchor + $payload) }
    'replace' { return $content.Replace($anchor, $payload) }
    default   { throw "[$label] unknown mode $mode" }
  }
}

# ============ F1: inviteApi.ts（LF、无BOM）新增 reportConsumptionRebate ============
$f = "$base\src\lib\inviteApi.ts"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f1_anchor.txt' 'LF') (LoadPayload 'f1_insert.txt' 'LF') 'after' 'F1-inviteApi'
[System.IO.File]::WriteAllText($f, $c, $enc8NoBom)
Write-Output ("F1 inviteApi.ts: {0} -> {1} chars (+{2})" -f $orig, $c.Length, ($c.Length - $orig))

# ============ F2: membership/page.tsx（CRLF、无BOM）返佣改服务端上报 ============
$f = "$base\src\app\membership\page.tsx"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f2a_old.txt' 'CRLF') (LoadPayload 'f2a_new.txt' 'CRLF') 'replace' 'F2a-import-auth'
$c = Apply $c (LoadPayload 'f2b_old.txt' 'CRLF') (LoadPayload 'f2b_new.txt' 'CRLF') 'replace' 'F2b-import-rebate'
$c = Apply $c (LoadPayload 'f2c_old.txt' 'CRLF') (LoadPayload 'f2c_new.txt' 'CRLF') 'replace' 'F2c-rebate-call'
[System.IO.File]::WriteAllText($f, $c, $enc8NoBom)
Write-Output ("F2 membership/page.tsx: {0} -> {1} chars ({2})" -f $orig, $c.Length, ($c.Length - $orig))

# ============ F3: BatchNumberMatching.tsx（CRLF、无BOM）同上 ============
$f = "$base\src\components\BatchNumberMatching.tsx"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f2b_old.txt' 'CRLF') (LoadPayload 'f2b_new.txt' 'CRLF') 'replace' 'F3a-import-rebate'
$c = Apply $c (LoadPayload 'f3b_old.txt' 'CRLF') (LoadPayload 'f3b_new.txt' 'CRLF') 'replace' 'F3b-rebate-call'
[System.IO.File]::WriteAllText($f, $c, $enc8NoBom)
Write-Output ("F3 BatchNumberMatching.tsx: {0} -> {1} chars ({2})" -f $orig, $c.Length, ($c.Length - $orig))

# ============ F4: inviteStore.ts（CRLF、有BOM）删除本地返佣死代码 ============
$f = "$base\src\lib\inviteStore.ts"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f4a_old.txt' 'CRLF') '' 'replace' 'F4a-iface-del'
$c = Apply $c (LoadPayload 'f4b_old.txt' 'CRLF') '' 'replace' 'F4b-const-del'
$marker = "// ==================== 消费返佣（二级分销 30% 分成） ===================="
$mCount = [regex]::Matches($c, [regex]::Escape($marker)).Count
if ($mCount -ne 1) { throw "[F4c] marker count = $mCount (expect 1)" }
$idx = $c.IndexOf($marker)
$c = $c.Substring(0, $idx).TrimEnd("`r", "`n") + "`r`n"
[System.IO.File]::WriteAllText($f, $c, $enc8Bom)
Write-Output ("F4 inviteStore.ts: {0} -> {1} chars ({2})" -f $orig, $c.Length, ($c.Length - $orig))

# ============ F5: chat ClientPage.tsx（CRLF、无BOM）邀请分享入口 ============
$f = "$base\src\app\friends\chat\[id]\ClientPage.tsx"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f5a_old.txt' 'CRLF') (LoadPayload 'f5a_new.txt' 'CRLF') 'replace' 'F5a-sendrefactor'
$c = Apply $c (LoadPayload 'f5b_anchor.txt' 'CRLF') (LoadPayload 'f5b_insert.txt' 'CRLF') 'after' 'F5b-share-btn'
[System.IO.File]::WriteAllText($f, $c, $enc8NoBom)
Write-Output ("F5 chat ClientPage.tsx: {0} -> {1} chars (+{2})" -f $orig, $c.Length, ($c.Length - $orig))

Write-Output "ALL FRONTEND PATCHES APPLIED"
