$ErrorActionPreference = "Continue"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$dest = "C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi\docs\materials\yixue_import\extracted"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

function Extract-Docx($srcPath, $outPath) {
  try {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($srcPath)
    try {
      $entry = $zip.GetEntry("word/document.xml")
      if ($null -eq $entry) { Write-Output "FAIL(no document.xml): $srcPath"; return }
      $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
      $xml = $reader.ReadToEnd()
      $reader.Close()
      # 段落转换 + 去标签
      $text = $xml -replace '<w:p [^>]*>', "`n" -replace '<w:p>', "`n" -replace '<w:br[^>]*/>', "`n" -replace '<[^>]+>', ''
      $text = [System.Net.WebUtility]::HtmlDecode($text)
      $text = $text -replace "`r", ''
      $text = $text -replace "(?m)^[ \t]+", '' -replace "(?m)[ \t]+$", ''
      $text = $text -replace "(?s)\n{3,}", "`n`n"
      [System.IO.File]::WriteAllText($outPath, $text.Trim(), (New-Object System.Text.UTF8Encoding($false)))
      Write-Output ("OK(docx): {0} ({1:N0} chars)" -f (Split-Path $outPath -Leaf), $text.Length)
    } finally { $zip.Dispose() }
  } catch { Write-Output "FAIL(docx): $srcPath -> $($_.Exception.Message)" }
}

function Extract-DocBinary($srcPath, $outPath) {
  try {
    $bytes = [System.IO.File]::ReadAllBytes($srcPath)
    # OLE2 .doc：正文以 UTF-16LE 存储。按偶数偏移整体解码后过滤 CJK/常用符号连续段
    $sb = New-Object System.Text.StringBuilder
    $i = 0
    $n = $bytes.Length
    $buf = New-Object System.Text.StringBuilder
    while ($i + 1 -lt $n) {
      $code = $bytes[$i] -bor ($bytes[$i + 1] -shl 8)
      $ch = [char]$code
      $isCjk = ($code -ge 0x4E00 -and $code -le 0x9FFF) -or ($code -ge 0x3000 -and $code -le 0x303F) -or ($code -ge 0xFF00 -and $code -le 0xFFEF)
      $isCommon = ($code -ge 0x20 -and $code -le 0x7E)
      $isNewline = ($code -eq 0x0D -or $code -eq 0x0A -or $code -eq 0x0B)
      if ($isCjk) { [void]$buf.Append($ch) }
      elseif ($isCommon) { [void]$buf.Append($ch) }
      elseif ($isNewline) { [void]$buf.Append("`n") }
      else {
        if ($buf.Length -gt 0) {
          $s = $buf.ToString()
          # 只保留含 CJK 的有效段（过滤二进制噪声）
          $cjkCount = [regex]::Matches($s, '[\u4e00-\u9fff]').Count
          if ($cjkCount -ge 4) { [void]$sb.AppendLine($s.Trim()) }
          $buf.Clear() | Out-Null
        }
        if ($isNewline -and $sb.Length -gt 0) { }
      }
      $i += 2
    }
    if ($buf.Length -gt 0) {
      $s = $buf.ToString()
      $cjkCount = [regex]::Matches($s, '[\u4e00-\u9fff]').Count
      if ($cjkCount -ge 4) { [void]$sb.AppendLine($s.Trim()) }
    }
    $text = $sb.ToString() -replace "(?m)^[ \t]+", ''
    $text = $text -replace "(?s)\n{3,}", "`n`n"
    [System.IO.File]::WriteAllText($outPath, $text.Trim(), (New-Object System.Text.UTF8Encoding($false)))
    Write-Output ("OK(doc): {0} ({1:N0} chars)" -f (Split-Path $outPath -Leaf), $text.Length)
  } catch { Write-Output "FAIL(doc): $srcPath -> $($_.Exception.Message)" }
}

$e = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件"

# docx（ZIP+XML 可靠提取）
Extract-Docx "$e\《道传小六壬完整版》.docx" (Join-Path $dest "xiaoliuren_daochuan.txt")
Extract-Docx "$e\七政四余入门学习心得整理.docx" (Join-Path $dest "qizheng_siyu.txt")
Extract-Docx "$e\天纪笔记jeff个人整理.docx" (Join-Path $dest "tianji_notes.txt")

# doc（OLE2 UTF-16LE 粗提取）
Extract-DocBinary "c:\Users\ZhuanZ\.trae-cn\attachments\6a7ee9cd6fc0b776ac94034e\1f29f28b-2f63-42fc-980f-621167f9b70f_7e4728de-931a-47ac-bd45-1c63a11a5ef6_倪海夏《神农本草经》完整版——可直接打印.doc" (Join-Path $dest "shennong_bencao.md")
Extract-DocBinary "$e\易经推命批法V20170928.doc" (Join-Path $dest "yijing_tuiming.txt")
Extract-DocBinary "$e\地脉道听课笔记.doc" (Join-Path $dest "dimaidao.txt")

Write-Output "ALL_DONE"
