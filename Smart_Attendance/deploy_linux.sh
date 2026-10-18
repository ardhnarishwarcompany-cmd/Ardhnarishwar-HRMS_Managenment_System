#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM — LINUX VPS DEPLOYMENT SCRIPT
#  Tested on Ubuntu 20.04 / 22.04 / 24.04 LTS & Debian 11 / 12
# ══════════════════════════════════════════════════════════════════════════════

set -e

echo "======================================================================"
echo "  🚀 Ardhnarishwar Global SaaS Attendance Platform - Linux VPS Deploy"
echo "======================================================================"

# 1. System packages
echo "[1/5] Updating packages and installing system libraries..."
sudo apt-get update -y
sudo apt-get install -y python3 python3-pip python3-venv nginx curl libgl1 libglib2.0-0

# 2. Virtual environment
echo "[2/5] Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 3. Environment configuration
echo "[3/5] Checking .env configuration..."
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "[!] Created .env from .env.production template. Please review database credentials."
fi

# 4. Create Systemd Service
echo "[4/5] Creating Systemd service for auto-start & process supervision..."
APP_DIR=$(pwd)
USER_NAME=$(whoami)

sudo bash -c "cat > /etc/systemd/system/ardhnarishwar-attendance.service <<EOF
[Unit]
Description=Ardhnarishwar Global Attendance WSGI Application
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$APP_DIR
Environment=\"PATH=$APP_DIR/.venv/bin\"
ExecStart=$APP_DIR/.venv/bin/gunicorn wsgi:application --bind 127.0.0.1:5000 --workers 4 --threads 2 --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable ardhnarishwar-attendance.service
sudo systemctl restart ardhnarishwar-attendance.service

# 5. Check status
echo "[5/5] Checking service status..."
sleep 2
sudo systemctl status ardhnarishwar-attendance.service --no-pager

echo ""
echo "======================================================================"
echo "  [✓] Ardhnarishwar Global Attendance is LIVE on 127.0.0.1:5000"
echo "  Health Check: curl http://127.0.0.1:5000/health"
echo "======================================================================"
