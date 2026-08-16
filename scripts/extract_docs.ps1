$ErrorActionPreference = "Stop"
$dest = "C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi\docs\materials\yixue_import\extracted"
$files = @(
  @{ src = "c:\Users\ZhuanZ\.trae-cn\attachments\6a7ee9cd6fc0b776ac94034e\1f29f28b-2f63-42fc-980f-621167f9b70f_7e4728de-931a-47ac-bd45-1c63a11a5ef6_倪海夏《神农本草经》完整版——可直接打印.doc"; out = "shennong_bencao_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\《道传小六壬完整版》.docx"; out = "xiaoliuren_daochuan_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\七政四余入门学习心得整理.docx"; out = "qizheng_siyu_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\天纪笔记jeff个人整理.docx"; out = "tianji_notes_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\易经推命批法V20170928.doc"; out = "yijing_tuiming_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\地脉道听课笔记.doc"; out = "dimaidao_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\陈红平【干支命理】从入门到精通.pdf"; out = "ganzhi_mingli_pdf_raw.txt" },
  @{ src = "E:\八字命理类文档包括排盘方式电子版\整理出来的命理类核心文件\466-善天道-道家奇门预测术82集（从彩色版）.pdf"; out = "shantiandao_qimen_pdf_raw.txt" }
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

foreach ($f in $files) {
  $outPath = Join-Path $dest $f.out
  if (Test-Path $outPath) { Write-Output "SKIP(exists): $($f.out)"; continue }
  if (-not (Test-Path $f.src)) { Write-Output "MISSING: $($f.src)"; continue }
  try {
    Write-Output "EXTRACTING: $($f.out) ..."
    $doc = $word.Documents.Open($f.src, $false, $true)
    $doc.SaveAs2($outPath, 7)
    $doc.Close($false)
    $len = (Get-Item $outPath).Length
    Write-Output ("OK: {0} ({1:N0} bytes)" -f $f.out, $len)
  } catch {
    Write-Output "FAIL: $($f.out) -> $($_.Exception.Message)"
    try { $doc.Close($false) } catch {}
  }
}

$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Output "DONE"
