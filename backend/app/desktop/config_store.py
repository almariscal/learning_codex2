from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.desktop import CONFIG_NAMESPACE

CONFIG_DIR = Path.home() / f".{CONFIG_NAMESPACE}" / "desktop"
CONFIG_FILE = CONFIG_DIR / "config.json"
DEFAULT_DATA_DIR = Path.home() / f".{CONFIG_NAMESPACE}" / "data"


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_config() -> dict[str, Any]:
    if not CONFIG_FILE.exists():
        return {}

    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_config(payload: dict[str, Any]) -> None:
    _ensure_dir(CONFIG_DIR)
    CONFIG_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def resolve_data_dir(override: str | None = None) -> Path:
    """
    Determine the directory that should store persistent data for the backend.

    Priority:
    1. Explicit `override` argument.
    2. Previously stored value inside `config.json`.
    3. Default path under ~/.parking-allocator/data
    """

    if override:
        path = Path(override).expanduser().resolve()
        _ensure_dir(path)
        save_config({**load_config(), "data_dir": str(path)})
        return path

    stored = load_config().get("data_dir")
    if stored:
        path = Path(stored).expanduser().resolve()
        _ensure_dir(path)
        return path

    _ensure_dir(DEFAULT_DATA_DIR)
    save_config({"data_dir": str(DEFAULT_DATA_DIR.resolve())})
    return DEFAULT_DATA_DIR.resolve()
