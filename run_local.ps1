
# run_local.ps1 - One-command local runner for Yojana Sathi (Docker-free fallback)
# Now runs the SINGLE unified backend (port 8000) + frontend (port 5173).
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Yojana Sathi (Unified Backend + Frontend) " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"

# Check Python and Node
Write-Host "[1/3] Verifying environment dependencies..." -ForegroundColor Yellow
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Error "Python not found! Please ensure Python 3.11+ is installed."
    exit 1
}

# Start Unified Backend (Port 8000)
Write-Host "[2/3] Starting Unified API on port 8000..." -ForegroundColor Yellow
$pBackend = Start-Process python -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory "$PSScriptRoot\backend" -PassThru

# Start Frontend (Port 5173)
Write-Host "[3/3] Starting Next.js Frontend on port 5173..." -ForegroundColor Yellow
$pFrontend = Start-Process npm -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Services started successfully!" -ForegroundColor Green
Write-Host " Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host " Unified API: http://localhost:8000/health" -ForegroundColor White
Write-Host " API docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host " Press Ctrl+C in this window or close it to stop services." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Host "Shutting down background services..." -ForegroundColor Yellow
    Stop-Process -Id $pBackend.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $pFrontend.Id -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}
