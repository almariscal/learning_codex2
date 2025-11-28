from __future__ import annotations

import argparse
import logging
import os
import socket
import sys
from contextlib import closing
from pathlib import Path

import uvicorn

from app.desktop.config_store import resolve_data_dir

LOGGER = logging.getLogger("parking.desktop.server")
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 0  # 0 allows us to pick a free port automatically.


def _pick_port(preferred: int | None) -> int:
    if preferred:
        return preferred

    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("", 0))
        return sock.getsockname()[1]


def _setup_logging(log_file: Path | None) -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        handlers.append(file_handler)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=handlers,
    )


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start the Parking Allocator backend for the desktop app.",
    )
    parser.add_argument("--host", default=DEFAULT_HOST, help="Host/IP for the local server.")
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help="Port for the API server. Defaults to an ephemeral free port.",
    )
    parser.add_argument(
        "--data-dir",
        help="Directory used to store the local database and exported files.",
    )
    parser.add_argument(
        "--log-file",
        help="Optional path for a log file. Logs always stream to stdout as well.",
    )
    parser.add_argument(
        "--print-endpoint",
        action="store_true",
        help="Write the final host:port combination to stdout for the desktop shell.",
    )
    return parser.parse_args(argv)


def _reload_settings_with_data_dir(data_dir: Path) -> None:
    os.environ["PARKING_DATA_DIR"] = str(data_dir)
    os.environ["DATA_DIR"] = str(data_dir)
    from app.core import config as core_config

    core_config.reload_settings()
    LOGGER.info("Using data directory: %s", data_dir)


def run(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)
    log_file = Path(args.log_file).expanduser() if args.log_file else None
    _setup_logging(log_file)

    data_dir = resolve_data_dir(args.data_dir)
    _reload_settings_with_data_dir(data_dir)

    port = _pick_port(args.port)
    host = args.host or DEFAULT_HOST

    if args.print_endpoint:
        print(f"{host}:{port}", flush=True)

    LOGGER.info("Starting backend on %s:%s", host, port)
    uvicorn.run("app.main:app", host=host, port=port, reload=False, log_config=None)


def main() -> None:
    run(sys.argv[1:])


if __name__ == "__main__":
    main()
