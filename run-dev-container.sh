#!/usr/bin/env bash
set -euo pipefail

# Launch an interactive Node container with this project mounted.
# By default, this uses your existing SQLite DB files in ./database.

PROJECT_DIR="$PWD"
NODE_IMAGE="${NODE_IMAGE:-node:lts}"
NODE_CONTAINER_NAME="${NODE_CONTAINER_NAME:-recyclerie-node-dev}"
DOCKER_NETWORK="${DOCKER_NETWORK:-recyclerie-dev-net}"

usage() {
  cat <<'EOF'
Usage:
  ./run-dev-container.sh [--extract-arrivals-csv [output-file]]

Options:
  -h, --help        Show this help
  --extract-arrivals-csv [file]
                    Run the arrivals CSV export script in container.
                    Default output file: arrivals.csv

Environment overrides:
  NODE_IMAGE, NODE_CONTAINER_NAME, DOCKER_NETWORK
EOF
}

RUN_EXTRACT_ARRIVALS_CSV=false
EXTRACT_OUTPUT_FILE="arrivals.csv"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --extract-arrivals-csv)
      RUN_EXTRACT_ARRIVALS_CSV=true
      if [[ $# -gt 1 && "$2" != -* ]]; then
        EXTRACT_OUTPUT_FILE="$2"
        shift
      fi
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
BOOTSTRAP_COMMAND="npm install && npx tsc"


if docker ps --format '{{.Names}}' | grep -Fx "$NODE_CONTAINER_NAME" >/dev/null 2>&1; then
  echo "A container named '$NODE_CONTAINER_NAME' is already running."
  echo "Stop it first, or set NODE_CONTAINER_NAME to another name."
  exit 1
fi

if [[ "$RUN_EXTRACT_ARRIVALS_CSV" == true ]]; then
  docker run --rm -it \
    --name "$NODE_CONTAINER_NAME" \
    --network "$DOCKER_NETWORK" \
    -w /workspace \
    -v "$PROJECT_DIR:/workspace" \
    "${NODE_ENV_VARS[@]}" \
    "$NODE_IMAGE" \
    bash -lc "$BOOTSTRAP_COMMAND && node dist/extract-arrival.js \"$EXTRACT_OUTPUT_FILE\""
  exit 0
fi

docker run --rm -it \
  --name "$NODE_CONTAINER_NAME" \
  --network "$DOCKER_NETWORK" \
  -w /workspace \
  -v "$PROJECT_DIR:/workspace" \
  "${NODE_ENV_VARS[@]}" \
  "$NODE_IMAGE" \
  bash
  #bash -lc "$BOOTSTRAP_COMMAND && exec bash"
