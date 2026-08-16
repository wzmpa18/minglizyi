Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead('E:\中医仁普\正骨\颈椎精讲.xlsx')
$z.Entries | Select-Object FullName, Length | Format-Table -AutoSize
# 抽查 drawing 内容
$draw = $z.Entries | Where-Object { $_.FullName -like '*drawing*' -or $_.FullName -like '*chart*' } | Select-Object -First 3
foreach ($e in $draw) {
  Write-Output "=== $($e.FullName) ==="
  $sr = New-Object System.IO.StreamReader($e.Open(), [Text.Encoding]::UTF8)
  $x = $sr.ReadToEnd(); $sr.Close()
  Write-Output $x.Substring(0, [Math]::Min(1500, $x.Length))
}
$z.Dispose()
