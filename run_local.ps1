# run_local.ps1 - One-command local runner for Yojana Sathi (Docker-free fallback)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Yojana Sathi Services (Local Development Mode) " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"

# Check Python and Node
Write-Host "[1/5] Verifying environment dependencies..." -ForegroundColor Yellow
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Error "Python not found! Please ensure Python 3.11+ is installed."
    exit 1
}

# Start Eligibility Service (Port 8001)
Write-Host "[2/5] Starting Eligibility Service on port 8001..." -ForegroundColor Yellow
$pEligibility = Start-Process python -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8001" -WorkingDirectory "$PSScriptRoot\services\eligibility" -PassThru

# Start Document Service (Port 8002)
Write-Host "[3/5] Starting Document Service on port 8002..." -ForegroundColor Yellow
$pDocument = Start-Process python -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8002" -WorkingDirectory "$PSScriptRoot\services\document" -PassThru

# Start Gateway Service (Port 8000)
Write-Host "[4/5] Starting Gateway Service on port 8000..." -ForegroundColor Yellow
$pGateway = Start-Process python -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$PSScriptRoot\services\gateway" -PassThru

# Start Frontend (Port 5173)
Write-Host "[5/5] Starting Vite React Frontend on port 5173..." -ForegroundColor Yellow
$pFrontend = Start-Process npm -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " All 4 services started successfully!" -ForegroundColor Green
Write-Host " Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host " Gateway:     http://localhost:8000/health" -ForegroundColor White
Write-Host " Eligibility: http://localhost:8001/health" -ForegroundColor White
Write-Host " Document:    http://localhost:8002/health" -ForegroundColor White
Write-Host " Press Ctrl+C in this window or close it to stop services." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host "Shutting down background services..." -ForegroundColor Yellow
    Stop-Process -Id $pEligibility.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $pDocument.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $pGateway.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $pFrontend.Id -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}
