$ErrorActionPreference = "Continue"
$dest = "C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi\docs\materials\yixue_import\extracted"
$gbk = [System.Text.Encoding]::GetEncoding(936)

function Extract-DocGBK($srcPath, $outPath) {
  try {
    $bytes = [System.IO.File]::ReadAllBytes($srcPath)
    $text = $gbk.GetString($bytes)
    # 提取含 CJK 的连续段：允许 CJK、全角标点、ASCII 可见字符、空白
    $ms = [regex]::Matches($text, '[\u4e00-\u9fff\u3000-\u303f\uff00-\uffefA-Za-z0-9，。、；：''""（）《》！？\-\+\/\%\.\,\s]{8,}')
    $sb = New-Object System.Text.StringBuilder
    foreach ($m in $ms) {
      $s = $m.Value.Trim()
      $cjkCount = [regex]::Matches($s, '[\u4e00-\u9fff]').Count
      if ($cjkCount -ge 6) { [void]$sb.AppendLine($s) }
    }
    $out = $sb.ToString() -replace "`r", ''
    $out = $out -replace "(?s)\n{3,}", "`n`n"
    [System.IO.File]::WriteAllText($outPath, $out.Trim(), (New-Object System.Text.UTF8Encoding($false)))
    Write-Output ("OK(gbk): {0} ({1:N0} chars)" -f (Split-Path $outPath -Leaf), $out.Length)
  } catch { Write-Output "FAIL: $srcPath -> $($_.Exception.Message)" }
}

$e = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件"
Extract-DocGBK "c:\Users\ZhuanZ\.trae-cn\attachments\6a7ee9cd6fc0b776ac94034e\1f29f28b-2f63-42fc-980f-621167f9b70f_7e4728de-931a-47ac-bd45-1c63a11a5ef6_倪海夏《神农本草经》完整版——可直接打印.doc" (Join-Path $dest "shennong_bencao.md")
Extract-DocGBK "$e\易经推命批法V20170928.doc" (Join-Path $dest "yijing_tuiming.txt")
Extract-DocGBK "$e\地脉道听课笔记.doc" (Join-Path $dest "dimaidao.txt")
Write-Output "ALL_DONE"
