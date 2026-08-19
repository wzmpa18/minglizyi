$ErrorActionPreference = 'Stop'
# v25.0.40 frontend patch part 2: F4 inviteStore.ts + F5 chat ClientPage.tsx
# All non-ASCII content loaded from .txt via explicit UTF8 (script body is ASCII-only)
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

# ============ F4: inviteStore.ts (CRLF + BOM) remove local rebate dead code ============
$f = "$base\src\lib\inviteStore.ts"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f4a_old.txt' 'CRLF') '' 'replace' 'F4a-iface-del'
$c = Apply $c (LoadPayload 'f4b_old.txt' 'CRLF') '' 'replace' 'F4b-const-del'
$marker = (LoadPayload 'f4c_marker.txt' 'CRLF').TrimEnd("`r", "`n")
$mCount = [regex]::Matches($c, [regex]::Escape($marker)).Count
if ($mCount -ne 1) { throw "[F4c] marker count = $mCount (expect 1)" }
$idx = $c.IndexOf($marker)
$c = $c.Substring(0, $idx).TrimEnd("`r", "`n") + "`r`n"
[System.IO.File]::WriteAllText($f, $c, $enc8Bom)
Write-Output ("F4 inviteStore.ts: {0} -> {1} chars ({2})" -f $orig, $c.Length, ($c.Length - $orig))

# ============ F5: chat ClientPage.tsx (CRLF, no BOM) invite share entry ============
$f = "$base\src\app\friends\chat\[id]\ClientPage.tsx"
$c = [System.IO.File]::ReadAllText($f, $utf8); $orig = $c.Length
$c = Apply $c (LoadPayload 'f5a_old.txt' 'CRLF') (LoadPayload 'f5a_new.txt' 'CRLF') 'replace' 'F5a-sendrefactor'
$c = Apply $c (LoadPayload 'f5b_anchor.txt' 'CRLF') (LoadPayload 'f5b_insert.txt' 'CRLF') 'after' 'F5b-share-btn'
[System.IO.File]::WriteAllText($f, $c, $enc8NoBom)
Write-Output ("F5 chat ClientPage.tsx: {0} -> {1} chars (+{2})" -f $orig, $c.Length, ($c.Length - $orig))

Write-Output "FRONTEND PART2 PATCHES APPLIED"
