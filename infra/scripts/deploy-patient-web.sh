#!/usr/bin/env bash
set -euo pipefail

DOMAIN="bina-flutter.mehtea.ir"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="${REPO_ROOT}/apps/patient-app"
BUILD_DIR="${APP_DIR}/build/web"
WEB_ROOT="/var/www/${DOMAIN}"
NGINX_SRC="${REPO_ROOT}/infra/nginx/${DOMAIN}.conf"
NGINX_AVAIL="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

PROFILE="demo"
DO_BUILD=false
for arg in "$@"; do
  case "${arg}" in
    --profile=demo) PROFILE="demo" ;;
    --profile=prod) PROFILE="prod" ;;
    --build) DO_BUILD=true ;;
    *)
      echo "Unknown argument: ${arg}. Supported: --profile=demo|prod [--build]" >&2
      exit 1
      ;;
  esac
done

if [[ "${PROFILE}" == "demo" ]]; then
  DART_DEFINES=(
    --dart-define=BINA_DATA_MODE=mock
    --dart-define=ENABLE_WAVE3_RESULTS=true
    --dart-define=ENABLE_WAVE4_TESTS=true
    --dart-define=ENABLE_WEB_LAB_MODE=true
    --dart-define=ENABLE_ONBOARDING=true
    --dart-define=ALLOW_DEMO_PREVIEW=true
    --dart-define=ENABLE_PREVIEW_HARNESS=true
  )
else
  DART_DEFINES=(
    --dart-define=BINA_DATA_MODE=live
    --dart-define=ENABLE_WAVE3_RESULTS=false
    --dart-define=ENABLE_WAVE4_TESTS=false
    --dart-define=ENABLE_WEB_LAB_MODE=false
    --dart-define=ENABLE_ONBOARDING=true
    --dart-define=ALLOW_DEMO_PREVIEW=false
    --dart-define=ENABLE_PREVIEW_HARNESS=false
  )
fi

if [[ "${DO_BUILD}" == "true" ]]; then
  echo "[0/4] Checking host resources and building Flutter Web (${PROFILE} profile)..."
  bash "${REPO_ROOT}/infra/scripts/check-resources.sh"
  FLUTTER_BIN="$(command -v flutter || echo "/home/${SUDO_USER:-mahdi}/development/flutter/bin/flutter")"
  BUILD_CMD="cd '${APP_DIR}' && '${FLUTTER_BIN}' build web --release --no-wasm-dry-run ${DART_DEFINES[*]}"
  if [[ -n "${SUDO_USER:-}" ]]; then
    su - "${SUDO_USER}" -c "${BUILD_CMD}"
  else
    bash -c "${BUILD_CMD}"
  fi
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo to sync nginx webroot: sudo bash $0 --profile=${PROFILE}" >&2
  exit 1
fi

if [[ ! -f "${BUILD_DIR}/index.html" ]]; then
  echo "ERROR: ${BUILD_DIR}/index.html not found. Build Flutter web first:" >&2
  echo "  (cd apps/patient-app && flutter build web --release --no-wasm-dry-run ${DART_DEFINES[*]})" >&2
  exit 1
fi

echo "[1/4] Syncing Flutter Web bundle to ${WEB_ROOT}..."
mkdir -p "${WEB_ROOT}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${BUILD_DIR}/" "${WEB_ROOT}/"
else
  rm -rf "${WEB_ROOT:?}/"*
  cp -a "${BUILD_DIR}/." "${WEB_ROOT}/"
fi
chown -R www-data:www-data "${WEB_ROOT}"
chmod -R a+rX "${WEB_ROOT}"

echo "[2/4] Installing nginx site config ${NGINX_AVAIL}..."
if [[ ! -f "${NGINX_AVAIL}" ]]; then
  cp "${NGINX_SRC}" "${NGINX_AVAIL}"
else
  echo "  Keeping existing ${NGINX_AVAIL} (remove it first if you want to overwrite Certbot SSL directives)."
fi
ln -sfn "${NGINX_AVAIL}" "${NGINX_ENABLED}"

echo "[3/4] Testing and reloading nginx..."
nginx -t
systemctl reload nginx

if [[ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
  echo "[4/4] Issuing HTTPS certificate with Certbot for ${DOMAIN}..."
  certbot --nginx -d "${DOMAIN}" --redirect --non-interactive --agree-tos --register-unsafely-without-email || \
    echo "NOTE: Certbot needs manual email/interaction. Run: sudo certbot --nginx -d ${DOMAIN} --redirect"
else
  echo "[4/4] Existing Let's Encrypt certificate found for ${DOMAIN}."
fi

echo "DONE: https://${DOMAIN} deployed from ${BUILD_DIR}"
