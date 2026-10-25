param(
  [Parameter(Mandatory=$true)][string]$InputPdf,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [int]$FirstPage=1,
  [int]$LastPage=1,
  [string]$Language='zh-Hans-CN'
)
# Run with Windows PowerShell 5.1: static document OCR, no desktop capture/control.
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -eq 'Core'){throw 'Use powershell.exe for the Windows OCR API'}
$env:PSModulePath=(Join-Path $PSHOME 'Modules')+';'+$env:PSModulePath
Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop
$source=Get-Item -LiteralPath $InputPdf
if($source.Extension -ne '.pdf' -or $FirstPage -lt 1 -or $LastPage -lt $FirstPage){throw 'Invalid document/page range'}
$sourceHash=(Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$script:asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
 $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function AwaitResult($operation,[type]$resultType){
 $task=$script:asTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
 $task.GetAwaiter().GetResult()
}
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new($Language))
if(-not $engine){throw 'Requested OCR language is not installed'}
$renderer=(Get-Command pdftoppm.exe -ErrorAction Stop).Source
for($number=$FirstPage;$number -le $LastPage;$number++){
 $prefix=Join-Path $OutputDirectory ('page-'+$number.ToString('D4'))
 & $renderer -f $number -l $number -scale-to 2400 -png -singlefile $source.FullName $prefix
 if($LASTEXITCODE -ne 0){throw ('PDF render failed at page '+$number)}
 $image=$prefix+'.png'
 $file=AwaitResult ([Windows.Storage.StorageFile]::GetFileFromPathAsync($image)) ([Windows.Storage.StorageFile])
 $stream=AwaitResult ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
 try{
  $decoder=AwaitResult ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap=AwaitResult ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  try{
   $ocr=AwaitResult ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
   # Retain geometry: vertical editions must be reconstructed and compared with
   # their page images, never imported in the OCR engine's horizontal order.
   $lines=@($ocr.Lines | ForEach-Object {[ordered]@{text=$_.Text;words=@($_.Words | ForEach-Object {
    [ordered]@{text=$_.Text;x=$_.BoundingRect.X;y=$_.BoundingRect.Y;width=$_.BoundingRect.Width;height=$_.BoundingRect.Height}
   })}})
   [ordered]@{source=$source.FullName;sourceSha256=$sourceHash;pdfPage=$number;language=$Language;engine='Windows.Media.Ocr';text=$ocr.Text;lines=$lines;reviewState='OCR_UNREVIEWED';pageImage=$image} |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath ($prefix+'.json') -Encoding UTF8
   Write-Output ('OCR page '+$number+': '+$ocr.Text.Length+' characters; not yet reviewed')
  }finally{$bitmap.Dispose()}
 }finally{$stream.Dispose()}
}
if((Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash -ne $sourceHash){throw 'Source changed during OCR'}
