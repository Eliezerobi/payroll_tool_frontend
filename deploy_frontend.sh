#!/usr/bin/env bash
set -euo pipefail

# -----------------------------
# SETTINGS (edit if needed)
# -----------------------------
FRONTEND_DIR="/var/payroll_tool/payroll-tool-frontend"
WEB_ROOT="/var/www/visits_paradigmops"
NGINX_SERVICE="nginx"

ts() { date '+%Y-%m-%d %H:%M:%S'; }

echo "$(ts) === Deploy frontend ==="

cd "$FRONTEND_DIR"

echo "$(ts) 1) Clean dist/"
rm -rf dist

echo "$(ts) 2) Build"
npm run build

echo "$(ts) 3) Replace web root"
sudo rm -rf "${WEB_ROOT:?}/"*
sudo cp -r dist/* "$WEB_ROOT/"

echo "$(ts) 4) Reload nginx"
sudo systemctl reload "$NGINX_SERVICE"

echo "$(ts) ✅ Done"
