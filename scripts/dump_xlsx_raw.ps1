Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead('E:\中医仁普\正骨\颈椎精讲.xlsx')
foreach ($name in @('xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml')) {
  $e = $z.Entries | Where-Object { $_.FullName -eq $name }
  Write-Output "===== $name ====="
  $sr = New-Object System.IO.StreamReader($e.Open(), [Text.Encoding]::UTF8)
  $x = $sr.ReadToEnd(); $sr.Close()
  Write-Output $x.Substring(0, [Math]::Min(2000, $x.Length))
}
$z.Dispose()
