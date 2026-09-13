Set-Location "C:\Users\ZhuanZ\Projects\minglizyi"
$ErrorActionPreference = "Stop"

Write-Host "[Build] Step 1: Temporarily moving API routes..."
if (Test-Path "src/app/api") {
  Move-Item "src/app/api" "src/app/_api_disabled"
  Write-Host "API routes moved to _api_disabled"
}

try {
  Write-Host "[Build] Step 2: Building Next.js static export..."
  $ErrorActionPreference = "Continue"
  & npm.cmd run build *> "build_v25.0.85.log"
  $code = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  Get-Content "build_v25.0.85.log" -Tail 25
  if ($code -ne 0) { throw "next build failed with exit $code" }
} finally {
  Write-Host "[Build] Step 3: Restoring API routes..."
  if (Test-Path "src/app/_api_disabled") {
    Move-Item "src/app/_api_disabled" "src/app/api"
    Write-Host "API routes restored"
  }
}

Write-Host "[Build] Step 4: Verifying output..."
if (Test-Path "out/index.html") {
  Write-Host "[Build] SUCCESS: out/index.html exists"
  Get-ChildItem "out" | Select-Object -First 8 -ExpandProperty Name
} else {
  Write-Host "[Build] ERROR: out/index.html not found!"
  exit 1
}
