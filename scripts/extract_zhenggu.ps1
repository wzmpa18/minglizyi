Add-Type -AssemblyName System.IO.Compression.FileSystem

# 中华非遗正骨资料提取：xlsx/docx -> md（去除黄氏/王琨/黃氏人名）
$srcDir = 'E:\中医仁普\正骨'
$outDir = 'C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7ee9cd6fc0b776ac94034b\minglizyi\docs\materials\zhenggu'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Get-XlsxText([string]$path) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
  try {
    $shared = @()
    $ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' } | Select-Object -First 1
    if ($ssEntry) {
      $sr = New-Object System.IO.StreamReader($ssEntry.Open(), [Text.Encoding]::UTF8)
      $ssXml = $sr.ReadToEnd(); $sr.Close()
      foreach ($si in [regex]::Matches($ssXml, '<si>(.*?)</si>', 'Singleline')) {
        $text = ([regex]::Matches($si.Groups[1].Value, '<t[^>]*>(.*?)</t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join ''
        $shared += [System.Net.WebUtility]::HtmlDecode($text)
      }
    }
    $lines = New-Object System.Collections.Generic.List[string]
    $sheetEntries = $zip.Entries | Where-Object { $_.FullName -match '^xl/worksheets/sheet\d+\.xml$' } | Sort-Object FullName
    foreach ($sheet in $sheetEntries) {
      $sr = New-Object System.IO.StreamReader($sheet.Open(), [Text.Encoding]::UTF8)
      $xml = $sr.ReadToEnd(); $sr.Close()
      $lines.Add("## " + $sheet.FullName)
      foreach ($row in [regex]::Matches($xml, '<row[^>]*>(.*?)</row>', 'Singleline')) {
        $cells = New-Object System.Collections.Generic.List[string]
        foreach ($c in [regex]::Matches($row.Groups[1].Value, '<c\b([^>]*)>(.*?)</c>', 'Singleline')) {
          $attrs = $c.Groups[1].Value
          $t = [regex]::Match($attrs, 't="(\w+)"').Groups[1].Value
          $body = $c.Groups[2].Value
          $v = [regex]::Match($body, '<v[^>]*>(.*?)</v>', 'Singleline').Groups[1].Value
          $is = ([regex]::Matches($body, '<t[^>]*>(.*?)</t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join ''
          $val = ''
          if ($t -eq 's' -and $v -ne '') { $idx = 0; [int]::TryParse($v, [ref]$idx) | Out-Null; if ($idx -lt $shared.Count) { $val = $shared[$idx] } }
          elseif ($is -ne '') { $val = $is }
          elseif ($v -ne '') { $val = $v }
          $cells.Add([System.Net.WebUtility]::HtmlDecode($val))
        }
        $line = ($cells -join ' | ').TrimEnd(' |')
        if ($line.Trim() -ne '') { $lines.Add($line) }
      }
    }
    return ($lines -join "`n")
  } finally { $zip.Dispose() }
}

function Get-DocxText([string]$path) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' } | Select-Object -First 1
    $sr = New-Object System.IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
    $xml = $sr.ReadToEnd(); $sr.Close()
    $paras = foreach ($p in [regex]::Matches($xml, '<w:p[ >](.*?)</w:p>', 'Singleline')) {
      $t = ([regex]::Matches($p.Groups[1].Value, '<w:t[^>]*>(.*?)</w:t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join ''
      [System.Net.WebUtility]::HtmlDecode($t)
    }
    return (($paras | Where-Object { $_.Trim() -ne '' }) -join "`n")
  } finally { $zip.Dispose() }
}

$map = [ordered]@{
  '正骨完整补充.docx'                                = '中华非遗正骨·完整补充'
  '王琨膝关节半脱位的轻手法复位(2)(1)(3).xlsx'          = '中华非遗正骨·膝关节半脱位轻手法复位'
  '真性肩周炎(6).xlsx'                              = '中华非遗正骨·真性肩周炎'
  '胸椎精讲(1).xlsx'                                = '中华非遗正骨·胸椎精讲'
  '腰椎病(2).xlsx'                                  = '中华非遗正骨·腰椎病'
  '颈椎精讲.xlsx'                                   = '中华非遗正骨·颈椎精讲'
  '黃氏肘关节精讲(2).xlsx'                            = '中华非遗正骨·肘关节精讲'
  '黄氏假性肩周炎正骨(1)(1)(1).xlsx'                    = '中华非遗正骨·假性肩周炎正骨'
  '黄氏正骨之腕关节(1)(2)(1).xlsx'                      = '中华非遗正骨·腕关节'
  '黄氏正骨之踝关节４.５日.xlsx'                        = '中华非遗正骨·踝关节'
  '黄氏正骨之锁骨.xlsx'                               = '中华非遗正骨·锁骨'
  '黄氏正骨之颅骨.xlsx'                               = '中华非遗正骨·颅骨'
  '黄氏正骨之颞合关节与骶尾关节.xlsx'                     = '中华非遗正骨·颞颌关节与骶尾关节'
  '黄氏正骨之骨盆（3月30日）.xlsx'                      = '中华非遗正骨·骨盆'
  '黄氏正骨之髋关节公益课与线下课总结.xlsx'                 = '中华非遗正骨·髋关节'
}

$total = 0
foreach ($kv in $map.GetEnumerator()) {
  $src = Join-Path $srcDir $kv.Key
  if (-not (Test-Path $src)) { Write-Output "MISS: $($kv.Key)"; continue }
  $raw = if ($kv.Key -like '*.xlsx') { Get-XlsxText $src } else { Get-DocxText $src }
  # 去除人名（黄氏/黃氏/王琨及其变体）
  $clean = $raw -replace '[黃黄]氏', '' -replace '王琨', '' -replace '黄氏', ''
  $clean = $clean -replace "`n{3,}", "`n`n"
  $out = Join-Path $outDir ($kv.Value + '.md')
  $header = "# $($kv.Value)`n`n> 中华非遗正骨内部传承资料（疼痛类诊断与手法解决依据）`n`n"
  [System.IO.File]::WriteAllText($out, $header + $clean, [Text.Encoding]::UTF8)
  $chars = $clean.Length
  $total++
  Write-Output ("OK: {0} => {1} chars" -f $kv.Value, $chars)
}
Write-Output "TOTAL=$total"
