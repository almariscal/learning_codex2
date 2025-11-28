#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="parking-appimage-builder"
ARTIFACT_DIR="${ROOT_DIR}/dist/appimage"

docker build -f "${ROOT_DIR}/docker/appimage.Dockerfile" -t "${IMAGE_NAME}" "${ROOT_DIR}"

CONTAINER_ID="$(docker create "${IMAGE_NAME}")"
mkdir -p "${ARTIFACT_DIR}"
docker cp "${CONTAINER_ID}:/artifacts/." "${ARTIFACT_DIR}"
docker rm "${CONTAINER_ID}" > /dev/null

echo "AppImage files copied to ${ARTIFACT_DIR}"
