$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Venv = Join-Path $Root ".desktop-venv"

Set-Location $Root

if (-Not (Test-Path $Venv)) {
  python -m venv $Venv
}

$Activate = Join-Path $Venv "Scripts\Activate.ps1"
. $Activate

pip install --upgrade pip
pip install "pyinstaller>=6.5" "$Root[dev]"

pyinstaller "$Root/app/desktop/server.py" `
  --name parking-backend `
  --clean `
  --noconfirm `
  --collect-submodules app `
  --collect-submodules sqlmodel `
  --collect-submodules alembic `
  --collect-data app `
  --hidden-import uvicorn `
  --hidden-import sqlmodel `
  --hidden-import alembic `
  --paths $Root

Write-Host "Binary available under $Root/dist/parking-backend/"
