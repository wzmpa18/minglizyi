Add-Type -AssemblyName System.IO.Compression.FileSystem
$files = Get-ChildItem 'E:\中医仁普\正骨\*.xlsx'
foreach ($f in $files) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($f.FullName)
  $media = @($z.Entries | Where-Object { $_.FullName -like 'xl/media/*' })
  $sumKB = [math]::Round(($media | Measure-Object Length -Sum).Sum / 1KB, 0)
  Write-Output ("{0} | images={1} | total={2}KB" -f $f.Name, $media.Count, $sumKB)
  $z.Dispose()
}
