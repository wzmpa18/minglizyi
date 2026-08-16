# 清洗正骨 md：去纯数字行（图片锚点残留）、空 sheet 头、多余空行
$dir = 'C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi\docs\materials\zhenggu'
$total = 0
Get-ChildItem "$dir\*.md" | ForEach-Object {
  $lines = [System.IO.File]::ReadAllLines($_.FullName, [Text.Encoding]::UTF8)
  $kept = New-Object System.Collections.Generic.List[string]
  $pendingHeader = $null
  foreach ($ln in $lines) {
    $t = $ln.Trim()
    if ($t -match '^## xl/worksheets/') { $pendingHeader = $t; continue }
    if ($t -eq '') { if ($kept.Count -gt 0 -and $kept[$kept.Count - 1] -ne '') { $kept.Add('') }; continue }
    if ($t -match '^\d{1,3}$') { continue }
    if ($t -match '^\d{1,3} \| \d{1,3}$') { continue }
    if ($pendingHeader) { $kept.Add($pendingHeader); $pendingHeader = $null }
    $kept.Add($ln.TrimEnd())
  }
  while ($kept.Count -gt 0 -and $kept[$kept.Count - 1] -eq '') { $kept.RemoveAt($kept.Count - 1) }
  $body = ($kept -join "`r`n")
  $body = $body -replace '\s*## xl/worksheets/sheet\d+\.xml\s*', "`r`n"
  $body = $body -replace "`r`n{3,}", "`r`n`r`n"
  [System.IO.File]::WriteAllText($_.FullName, $body, (New-Object System.Text.UTF8Encoding $true))
  $total++
  Write-Output ("{0} => {1} chars" -f $_.Name, $body.Length)
}
Write-Output "CLEANED=$total"
