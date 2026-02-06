#!/bin/bash
# Installation script for Raspberry Pi Scanner Service

set -e

echo "================================"
echo "3rax Scanner Service Installer"
echo "================================"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Python version
echo "Checking Python version..."
python3 --version || {
    echo "❌ Python 3 not found. Please install Python 3.7 or later"
    exit 1
}

# Install pip if not present
if ! command -v pip3 &> /dev/null; then
    echo "Installing pip..."
    sudo apt-get update
    sudo apt-get install -y python3-pip
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your NATS server URL and scanner ID"
fi

# Make scanner.py executable
chmod +x scanner.py

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration:"
echo "   nano .env"
echo ""
echo "2. Test the scanner:"
echo "   python3 scanner.py"
echo ""
echo "3. (Optional) Install as systemd service:"
echo "   sudo ./install-service.sh"
echo ""
