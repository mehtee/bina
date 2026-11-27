#!/usr/bin/env bash
set -euo pipefail

# Zero-extra-RAM static host-Nginx deployment for bina-dashboard.mehtea.ir
# Mirrors bina-flutter.mehtea.ir: serves pre-built static SPA via existing host Nginx (0 MB extra container/Node RAM).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE_DOMAIN="bina-dashboard.mehtea.ir"
WEB_ROOT="/var/www/${SITE_DOMAIN}"
NGINX_SRC="${REPO_ROOT}/infra/nginx/${SITE_DOMAIN}.conf"
NGINX_AVAIL="/etc/nginx/sites-available/${SITE_DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SITE_DOMAIN}"
BUILD_DIR="${REPO_ROOT}/apps/staff-web/build/client"
CERT_DIR="/etc/letsencrypt/live/${SITE_DOMAIN}"

if [[ ! -f "${BUILD_DIR}/index.html" ]]; then
  echo "ERROR: ${BUILD_DIR}/index.html not found. Run VITE_API_MODE=mock pnpm run build:staff-web first." >&2
  exit 1
fi

echo "==> Checking host RAM & disk before deploy..."
bash "${REPO_ROOT}/infra/scripts/check-resources.sh"

echo "==> Syncing static Staff Web bundle to ${WEB_ROOT} ..."
mkdir -p "${WEB_ROOT}"
rsync -a --delete "${BUILD_DIR}/" "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}"
chmod -R a+rX "${WEB_ROOT}"

if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "==> Existing TLS certificate found at ${CERT_DIR}; writing HTTPS-enabled Nginx config directly..."
  cat > "${NGINX_AVAIL}" <<EOF
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${SITE_DOMAIN};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root ${WEB_ROOT};
    index index.html;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        font/woff2
        image/svg+xml;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        try_files \$uri =404;
    }

    location ^~ /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${SITE_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
  ln -sfn "${NGINX_AVAIL}" "${NGINX_ENABLED}"
  nginx -t
  systemctl reload nginx
else
  echo "==> Installing initial HTTP Nginx config and provisioning Let's Encrypt TLS certificate..."
  cp "${NGINX_SRC}" "${NGINX_AVAIL}"
  ln -sfn "${NGINX_AVAIL}" "${NGINX_ENABLED}"
  nginx -t
  systemctl reload nginx
  certbot --nginx -d "${SITE_DOMAIN}" --redirect
  nginx -t
  systemctl reload nginx
fi

echo "==> Verifying live HTTPS endpoint ..."
sleep 1
curl -fsSI "https://${SITE_DOMAIN}/" | head -n 10
echo "DONE: https://${SITE_DOMAIN} is live (0 MB extra RAM — static host Nginx)."
