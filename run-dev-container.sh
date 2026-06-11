#!/usr/bin/env bash
set -euo pipefail

# Isolated Node dev environment.
#
# Host mounts (only these touch the host filesystem):
#   - project source  → /workspace          (edit code on host, run in container)
#   - database/       → /workspace/database (SQLite files — only host data that changes)
#   - .env            → /workspace/.env     (read-only)
#
# Everything else stays in Docker named volumes (no node_modules / dist on host):
#   - node_modules, dist, npm cache

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
DATABASE_DIR="${DATABASE_DIR:-$PROJECT_DIR/database}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"

NODE_IMAGE="${NODE_IMAGE:-node:lts-bookworm-slim}"
CONTAINER_NAME="${CONTAINER_NAME:-recyclerie-dev}"
DOCKER_NETWORK="${DOCKER_NETWORK:-recyclerie-dev-net}"
VOLUME_PREFIX="${VOLUME_PREFIX:-recyclerie-dev}"
HOST_PORT="${HOST_PORT:-5000}"
CONTAINER_PORT="${CONTAINER_PORT:-5000}"

NODE_MODULES_VOLUME="${VOLUME_PREFIX}-node-modules"
DIST_VOLUME="${VOLUME_PREFIX}-dist"
NPM_CACHE_VOLUME="${VOLUME_PREFIX}-npm-cache"

usage() {
  cat <<EOF
Usage:
  ./run-dev-container.sh [command]

Commands:
  shell       Interactive shell (default). Runs npm install inside container if needed.
  dev         npm run dev with port ${HOST_PORT} → container ${CONTAINER_PORT}
  run <cmd>   Run a one-off command in a fresh container (e.g. run npm test)
  stop        Stop and remove the named dev container
  clean       Remove dev named volumes (node_modules, dist, npm cache in Docker only)

Environment overrides:
  PROJECT_DIR, DATABASE_DIR, ENV_FILE
  NODE_IMAGE, CONTAINER_NAME, DOCKER_NETWORK, VOLUME_PREFIX
  HOST_PORT, CONTAINER_PORT

Examples:
  ./run-dev-container.sh
  ./run-dev-container.sh dev
  ./run-dev-container.sh run npx sequelize-cli db:migrate
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required but not found in PATH." >&2
    exit 1
  fi
}

ensure_network() {
  if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    docker network create "$DOCKER_NETWORK" >/dev/null
  fi
}

ensure_database_dir() {
  mkdir -p "$DATABASE_DIR"
}

check_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Warning: .env not found at $ENV_FILE (container will start without it)." >&2
    ENV_MOUNT=()
  else
    ENV_MOUNT=(-v "$ENV_FILE:/workspace/.env:ro")
  fi
}

# Common docker run flags: isolated deps, only project + db + .env on host.
docker_run_args() {
  check_env_file
  ensure_database_dir

  DOCKER_RUN_ARGS=(
    --network "$DOCKER_NETWORK"
    -w /workspace
    -e NODE_ENV=development
    -e HOME=/tmp
    -v "$PROJECT_DIR:/workspace"
    -v "$DATABASE_DIR:/workspace/database"
    "${ENV_MOUNT[@]}"
    -v "$NODE_MODULES_VOLUME:/workspace/node_modules"
    -v "$DIST_VOLUME:/workspace/dist"
    -v "$NPM_CACHE_VOLUME:/root/.npm"
  )
}

bootstrap() {
  cat <<'EOS'
set -e
if [ ! -d node_modules/.bin ]; then
  echo "→ npm install (container volume, not on host)..."
  npm install
fi
EOS
}

run_interactive() {
  local name="$1"
  shift
  docker run --rm -it \
    --name "$name" \
    "${DOCKER_RUN_ARGS[@]}" \
    "$@" \
    "$NODE_IMAGE" \
    bash -lc "$(bootstrap)
exec bash"
}

run_dev_server() {
  docker run --rm -it \
    --name "$CONTAINER_NAME" \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    "${DOCKER_RUN_ARGS[@]}" \
    -e "PORT=${CONTAINER_PORT}" \
    "$NODE_IMAGE" \
    bash -lc "$(bootstrap)
echo \"→ dev server on http://localhost:${HOST_PORT}\"
exec npm run dev"
}

run_one_off() {
  docker run --rm -it \
    "${DOCKER_RUN_ARGS[@]}" \
    "$NODE_IMAGE" \
    bash -lc "$(bootstrap)
exec \"\$@\"" -- "$@"
}

stop_container() {
  if docker ps -a --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
    echo "Removed container: $CONTAINER_NAME"
  else
    echo "No container named: $CONTAINER_NAME"
  fi
}

clean_volumes() {
  stop_container
  for vol in "$NODE_MODULES_VOLUME" "$DIST_VOLUME" "$NPM_CACHE_VOLUME"; do
    if docker volume inspect "$vol" >/dev/null 2>&1; then
      docker volume rm "$vol" >/dev/null
      echo "Removed volume: $vol"
    fi
  done
}

main() {
  local cmd="${1:-shell}"
  shift || true

  require_docker
  ensure_network
  docker_run_args

  case "$cmd" in
    -h|--help|help)
      usage
      ;;
    shell)
      if docker ps --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
        echo "Container '$CONTAINER_NAME' is already running. Use: docker exec -it $CONTAINER_NAME bash" >&2
        exit 1
      fi
      run_interactive "$CONTAINER_NAME"
      ;;
    dev)
      if docker ps --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
        echo "Container '$CONTAINER_NAME' is already running." >&2
        exit 1
      fi
      run_dev_server
      ;;
    run)
      if [[ $# -eq 0 ]]; then
        echo "Usage: ./run-dev-container.sh run <command...>" >&2
        exit 1
      fi
      run_one_off "$@"
      ;;
    stop)
      stop_container
      ;;
    clean)
      clean_volumes
      ;;
    *)
      echo "Unknown command: $cmd" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
