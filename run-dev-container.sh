#!/usr/bin/env bash
set -euo pipefail

# Launch an interactive Node container with this project mounted.
# By default, this uses your existing SQLite DB files in ./database.
# Add --with-postgres if you also want a PostgreSQL container.

PROJECT_DIR="$PWD"
NODE_IMAGE="${NODE_IMAGE:-node:lts}"
NODE_CONTAINER_NAME="${NODE_CONTAINER_NAME:-recyclerie-node-dev}"
DOCKER_NETWORK="${DOCKER_NETWORK:-recyclerie-dev-net}"
WITH_POSTGRES=0

usage() {
  cat <<'EOF'
Usage:
  ./run-dev-container.sh [--with-postgres]

Options:
  --with-postgres   Start a PostgreSQL container and set DB_URL for Node
  -h, --help        Show this help

Environment overrides:
  NODE_IMAGE, NODE_CONTAINER_NAME, DOCKER_NETWORK
  POSTGRES_CONTAINER_NAME, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_PORT
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-postgres)
      WITH_POSTGRES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not found in PATH."
  exit 1
fi

if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  docker network create "$DOCKER_NETWORK" >/dev/null
fi

NODE_ENV_VARS=()


if docker ps --format '{{.Names}}' | grep -Fx "$NODE_CONTAINER_NAME" >/dev/null 2>&1; then
  echo "A container named '$NODE_CONTAINER_NAME' is already running."
  echo "Stop it first, or set NODE_CONTAINER_NAME to another name."
  exit 1
fi

docker run --rm -it \
  --name "$NODE_CONTAINER_NAME" \
  --network "$DOCKER_NETWORK" \
  -w /workspace \
  -p 5000:5000 \
  -v "$PROJECT_DIR:/workspace" \
  "${NODE_ENV_VARS[@]}" \
  "$NODE_IMAGE" \
  bash'
