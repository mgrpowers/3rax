#!/bin/bash
# Install scanner as systemd service

set -e

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_FILE="/etc/systemd/system/3rax-scanner.service"

echo "Installing scanner service..."

# Create systemd service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=3rax USB Scanner Service
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$SCRIPT_DIR
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/python3 $SCRIPT_DIR/scanner.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable 3rax-scanner.service

echo ""
echo "✅ Service installed successfully!"
echo ""
echo "Commands:"
echo "  Start:   sudo systemctl start 3rax-scanner"
echo "  Stop:    sudo systemctl stop 3rax-scanner"
echo "  Status:  sudo systemctl status 3rax-scanner"
echo "  Logs:    sudo journalctl -u 3rax-scanner -f"
echo ""
echo "The service will start automatically on boot."
echo ""
read -p "Start the service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start 3rax-scanner
    echo "Service started!"
    sleep 2
    systemctl status 3rax-scanner
fi
