$ErrorActionPreference = 'Stop'
$base = "C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi"
$f = "$base\src\lib\backend\register_routes.js"
$pd = "$base\scripts\smk_patches"
$enc8 = New-Object System.Text.UTF8Encoding($false)
$utf8 = [System.Text.Encoding]::UTF8

function LoadPayload([string]$name) {
  return ([System.IO.File]::ReadAllText("$pd\$name", $utf8) -replace "(?<!`r)`n", "`r`n")
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

$origContent = [System.IO.File]::ReadAllText($f, $utf8); $content = $origContent
$origLen = $content.Length

# P1: consumption_rebates 表
$a1 = (LoadPayload 'a1.txt')
$p1 = (LoadPayload 'p1_table.txt').TrimEnd("`r`n")
$content = Apply $content $a1 ($p1 + "`r`n`r`n") 'before' 'P1-table'

# P2: rebateRate + grantConsumptionRebate + autoFriendOnInviteBind
$a2 = (LoadPayload 'a2.txt')
$p2 = (LoadPayload 'p2_funcs.txt').TrimEnd("`r`n")
$content = Apply $content $a2 ($p2 + "`r`n") 'before' 'P2-funcs'

# P3: bindInviteAndReward 绑定成功后自动互加好友
$a3 = (LoadPayload 'a3.txt')
$p3 = "`r`n" + ((LoadPayload 'p3_autofriend.txt').TrimEnd("`r`n"))
$content = Apply $content $a3 $p3 'after' 'P3-autofriend'

# P4: POST /invite/consumption-rebate 路由
$a4 = (LoadPayload 'a4.txt')
$p4 = (LoadPayload 'p4_route.txt').TrimEnd("`r`n")
$content = Apply $content $a4 ($p4 + "`r`n`r`n") 'before' 'P4-route'

# P5a2: overview 增加返佣查询与统计
$a5 = (LoadPayload 'a5.txt')
$p5a = (LoadPayload 'p5a2_query_stats.txt').TrimEnd("`r`n")
$content = Apply $content $a5 $p5a 'after' 'P5a-rebates-query'

# P5b2: totalRewardPoints 合并返佣
$a6 = (LoadPayload 'a6.txt')
$p5b = (LoadPayload 'p5b2_total_line.txt')
$content = Apply $content $a6 $p5b 'replace' 'P5b-total'

# P5c: rewards 响应合并返佣明细
$a7 = (LoadPayload 'p5c_old.txt').TrimEnd("`r`n")
$p5c = (LoadPayload 'p5c_new.txt').TrimEnd("`r`n")
$content = Apply $content $a7 $p5c 'replace' 'P5c-map'

# P5d: 积分流水类型标签补充
$a8 = (LoadPayload 'p5d_old.txt').TrimEnd("`r`n")
$p5d = (LoadPayload 'p5d_new.txt').TrimEnd("`r`n")
$content = Apply $content $a8 $p5d 'replace' 'P5d-labels'

[System.IO.File]::WriteAllText($f, $content, $enc8)
Write-Output ("PATCH APPLIED: {0} -> {1} chars (+{2})" -f $origLen, $content.Length, ($content.Length - $origLen))