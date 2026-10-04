# run_local.ps1 - One-command local runner: unified backend (port 8000) + Next.js frontend (port 5173).
#
# Run from the repo root, either by right-click -> "Run with PowerShell" or:
#   powershell -ExecutionPolicy Bypass -File .\run_local.ps1
# Press Ctrl+C in this window to stop both services.

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'
$BackendLog = Join-Path $Root 'backend.dev.log'
$BackendErrLog = Join-Path $Root 'backend.dev.err.log'
$FrontendLog = Join-Path $Root 'frontend.dev.log'
$FrontendErrLog = Join-Path $Root 'frontend.dev.err.log'

function Fail($msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

function Get-PortOwner($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    try {
        return (Get-Process -Id $conn.OwningProcess -ErrorAction Stop).ProcessName
    } catch {
        return "PID $($conn.OwningProcess)"
    }
}

function Stop-Tree($proc, $label) {
    if ($proc -and -not $proc.HasExited) {
        # taskkill /T kills the whole process tree (uvicorn --reload spawns a child
        # server process that Stop-Process alone would orphan, permanently holding the port).
        Start-Process 'taskkill' -ArgumentList '/PID', $proc.Id, '/T', '/F' -NoNewWindow -Wait -ErrorAction SilentlyContinue | Out-Null
        Write-Host "  stopped $label" -ForegroundColor DarkGray
    }
}

function Wait-Http($url, $timeoutSec, $label) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        } catch {
            # 5xx while compiling/booting counts as "process alive, keep waiting" only
            # if the exception carries a response; otherwise keep polling.
            if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) { return $true }
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Show-Tail($path, $label) {
    if (Test-Path $path) {
        Write-Host "--- last lines of $label ($path) ---" -ForegroundColor Yellow
        Get-Content $path -Tail 25 -ErrorAction SilentlyContinue
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Yojana Sathi (Unified Backend + Frontend) " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"

# [1/5] Toolchain ------------------------------------------------------------
Write-Host "[1/5] Checking toolchain..." -ForegroundColor Yellow
$Python = $null
$PyArgs = @()
$cmd = Get-Command python -ErrorAction SilentlyContinue
if ($cmd) {
    $Python = $cmd.Source
} else {
    $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if (-not $PyLauncher) { Fail 'Python not found. Install Python 3.11+ (python.org) and re-run.' }
    $Python = $PyLauncher.Source
    $PyArgs = @('-3')
}
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) { Fail 'npm/Node.js not found. Install Node.js 18+ (nodejs.org) and re-run.' }
$Npm = $npmCmd.Source
$nodeVer = (& node --version) 2>$null
Write-Host "  python: $Python $((& $Python @PyArgs --version) 2>&1)" -ForegroundColor DarkGray
Write-Host "  node: $nodeVer | npm: $((& $Npm --version) 2>$null)" -ForegroundColor DarkGray

# [2/5] Ports -----------------------------------------------------------------
Write-Host "[2/5] Checking ports..." -ForegroundColor Yellow
$owner8000 = Get-PortOwner 8000
$owner5173 = Get-PortOwner 5173
if ($owner8000) { Fail "Port 8000 is already in use by '$owner8000'. Stop that process first (it may be an orphaned backend from an earlier run)." }
if ($owner5173) { Fail "Port 5173 is already in use by '$owner5173'. Stop that process first (it may be an orphaned 'next dev' from an earlier run)." }
Write-Host "  ports 8000 and 5173 are free" -ForegroundColor DarkGray

# [3/5] Dependencies ------------------------------------------------------------
Write-Host "[3/5] Checking dependencies..." -ForegroundColor Yellow
& $Python @PyArgs -c "import fastapi, uvicorn, httpx, pydantic" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  installing backend requirements..." -ForegroundColor Yellow
    & $Python @PyArgs -m pip install -r (Join-Path $BackendDir 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { Fail 'pip install failed. See output above.' }
} else {
    Write-Host "  backend packages OK" -ForegroundColor DarkGray
}
if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
    Write-Host "  node_modules missing - running npm install (one-time, may take a few minutes)..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    try {
        & $Npm install
        if ($LASTEXITCODE -ne 0) { Fail 'npm install failed. See output above.' }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "  node_modules present" -ForegroundColor DarkGray
}

# [4/5] Start services (logs go to files so crashes stay visible) ----------------
Write-Host "[4/5] Starting services..." -ForegroundColor Yellow
$pBackend = Start-Process -FilePath $Python `
    -ArgumentList ($PyArgs + @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000', '--reload')) `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErrLog -PassThru
# NOTE: npm is a .cmd shim - it must be launched via cmd /c, otherwise
# Start-Process fails silently and the frontend never starts.
$pFrontend = Start-Process -FilePath 'cmd' `
    -ArgumentList '/c', 'npm', 'run', 'dev' `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $FrontendLog -RedirectStandardError $FrontendErrLog -PassThru

# [5/5] Readiness ------------------------------------------------------------------
Write-Host "[5/5] Waiting for services to answer..." -ForegroundColor Yellow
$backendUp = Wait-Http 'http://127.0.0.1:8000/health' 60 'backend'
if (-not $backendUp) {
    Write-Host "Backend did not answer on :8000." -ForegroundColor Red
    Show-Tail $BackendErrLog 'backend errors'
    Show-Tail $BackendLog 'backend output'
    Stop-Tree $pFrontend 'frontend'
    Fail 'Backend failed to start. Fix the error above and re-run.'
}
Write-Host "  backend OK  -> http://localhost:8000/health" -ForegroundColor Green

$frontendUp = Wait-Http 'http://127.0.0.1:5173/' 180 'frontend'
if (-not $frontendUp) {
    Write-Host "Frontend did not answer on :5173." -ForegroundColor Red
    Show-Tail $FrontendErrLog 'frontend errors'
    Show-Tail $FrontendLog 'frontend output'
    Stop-Tree $pBackend 'backend'
    Stop-Tree $pFrontend 'frontend'
    Fail 'Frontend failed to start. Fix the error above and re-run.'
}
Write-Host "  frontend OK -> http://localhost:5173" -ForegroundColor Green

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " All components are up!" -ForegroundColor Green
Write-Host " Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host " Unified API: http://localhost:8000/health" -ForegroundColor White
Write-Host " API docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host " Logs: backend.dev.log / frontend.dev.log (repo root)" -ForegroundColor DarkGray
Write-Host " Press Ctrl+C in this window to stop everything." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($pBackend.HasExited) { Fail 'Backend process exited unexpectedly. See backend.dev.err.log.' }
        if ($pFrontend.HasExited) { Fail 'Frontend process exited unexpectedly. See frontend.dev.err.log.' }
    }
} finally {
    Write-Host "Shutting down background services..." -ForegroundColor Yellow
    Stop-Tree $pBackend 'backend'
    Stop-Tree $pFrontend 'frontend'
    Write-Host "All services stopped." -ForegroundColor Green
}
