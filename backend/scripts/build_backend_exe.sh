#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PATH="${ROOT_DIR}/.desktop-venv"

cd "${ROOT_DIR}"

python3 -m venv "${VENV_PATH}"
source "${VENV_PATH}/bin/activate"
pip install --upgrade pip
pip install "pyinstaller>=6.5" "${ROOT_DIR}[dev]"

pyinstaller "${ROOT_DIR}/app/desktop/server.py" \
  --name parking-backend \
  --clean \
  --noconfirm \
  --collect-submodules app \
  --collect-submodules sqlmodel \
  --collect-submodules alembic \
  --collect-data app \
  --hidden-import "uvicorn" \
  --hidden-import "sqlmodel" \
  --hidden-import "alembic" \
  --paths "${ROOT_DIR}"

echo "Binary available under ${ROOT_DIR}/dist/parking-backend/"
