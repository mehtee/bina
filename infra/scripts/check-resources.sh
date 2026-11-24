#!/usr/bin/env bash
set -euo pipefail

CHECK_DOCKER=false
EVAL_MODE=false

for arg in "$@"; do
  case "$arg" in
    --docker)
      CHECK_DOCKER=true
      ;;
    --eval)
      EVAL_MODE=true
      ;;
    -h|--help)
      echo "Usage: check-resources.sh [--docker] [--eval]" >&2
      exit 0
      ;;
    *)
      echo "[RESOURCE-ERROR] Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

log_info() {
  if [[ "$EVAL_MODE" == "true" ]]; then
    echo "$*" >&2
  else
    echo "$*"
  fi
}

log_err() {
  echo "$*" >&2
}

if [[ -n "${BINA_TEST_AVAIL_MB:-}" ]]; then
  AVAIL_MB="$BINA_TEST_AVAIL_MB"
else
  AVAIL_MB="$(free -m | awk '/^Mem:/ {print $7}')"
fi

if [[ -n "${BINA_TEST_AVAIL_GB:-}" ]]; then
  AVAIL_GB="$BINA_TEST_AVAIL_GB"
else
  AVAIL_GB="$(df -BG / | awk 'NR==2 {gsub(/G$/, "", $4); print $4}')"
fi

if ! [[ "$AVAIL_MB" =~ ^[0-9]+$ ]] || ! [[ "$AVAIL_GB" =~ ^[0-9]+$ ]]; then
  log_err "[RESOURCE-ERROR] Could not parse host RAM (${AVAIL_MB:-unset} MiB) or disk (${AVAIL_GB:-unset} GiB)."
  exit 1
fi

if (( AVAIL_MB < 1024 )); then
  log_err "[RESOURCE-CRITICAL] Available RAM is ${AVAIL_MB} MiB (< 1024 MiB). STOP all builds/tests and reclaim memory."
  exit 1
fi

if (( AVAIL_GB < 3 )); then
  log_err "[DISK-CRITICAL] Available disk on / is ${AVAIL_GB} GiB (< 3 GiB). STOP all Docker builds/installs and reclaim safe cache."
  exit 1
fi

if (( AVAIL_MB < 2200 )); then
  BINA_RESOURCE_MODE="strict_serial"
  NODE_MEM_MB=1024
  BINA_MAX_WORKERS=1
else
  BINA_RESOURCE_MODE="capped"
  NODE_MEM_MB=1536
  BINA_MAX_WORKERS=2
fi

NODE_OPTIONS_VAL="--max-old-space-size=${NODE_MEM_MB}"

if (( AVAIL_GB < 6 )); then
  BINA_DISK_MODE="tight"
  log_err "[DISK-WARNING] Available disk on / is ${AVAIL_GB} GiB (3..5 GiB tight mode). Build images one at a time and prune untagged layers."
else
  BINA_DISK_MODE="ok"
fi

log_info "[PREFLIGHT-OK] avail_ram=${AVAIL_MB}MiB mode=${BINA_RESOURCE_MODE} workers=${BINA_MAX_WORKERS} avail_disk=${AVAIL_GB}GiB disk_mode=${BINA_DISK_MODE} NODE_OPTIONS=\"${NODE_OPTIONS_VAL}\""

if [[ "$CHECK_DOCKER" == "true" ]]; then
  if command -v docker >/dev/null 2>&1; then
    if [[ "$EVAL_MODE" == "true" ]]; then
      docker system df >&2
    else
      docker system df
    fi
  else
    log_err "[RESOURCE-WARN] docker CLI not found in PATH; skipping docker system df."
  fi
fi

if [[ "$EVAL_MODE" == "true" ]]; then
  echo "export BINA_RESOURCE_MODE=\"${BINA_RESOURCE_MODE}\""
  echo "export BINA_DISK_MODE=\"${BINA_DISK_MODE}\""
  echo "export NODE_OPTIONS=\"${NODE_OPTIONS_VAL}\""
  echo "export BINA_MAX_WORKERS=\"${BINA_MAX_WORKERS}\""
  echo "export BINA_AVAIL_MB=\"${AVAIL_MB}\""
  echo "export BINA_AVAIL_GB=\"${AVAIL_GB}\""
fi
