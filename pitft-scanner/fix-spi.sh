#!/bin/bash
# Script to enable SPI on Raspberry Pi

echo "Checking SPI configuration..."

# Check if SPI is enabled in config.txt
if grep -q "^dtparam=spi=on" /boot/config.txt 2>/dev/null || grep -q "^dtparam=spi=on" /boot/firmware/config.txt 2>/dev/null; then
    echo "✅ SPI is enabled in config.txt"
else
    echo "⚠️  SPI not found in config.txt"
    echo ""
    echo "To enable SPI:"
    echo "1. Run: sudo raspi-config"
    echo "2. Go to: Interface Options -> SPI -> Enable"
    echo "3. Reboot: sudo reboot"
    echo ""
    echo "OR manually add to /boot/config.txt:"
    echo "  dtparam=spi=on"
fi

# Check for SPI devices
if ls /dev/spi* 2>/dev/null; then
    echo "✅ SPI devices found:"
    ls -la /dev/spi*
else
    echo "❌ No SPI devices found"
    echo "SPI needs to be enabled and system rebooted"
fi

# Check Python version
echo ""
echo "Python version: $(python3 --version)"
if python3 --version | grep -q "3.1[3-9]"; then
    echo "⚠️  Python 3.13+ detected - RPi.GPIO may not work"
    echo "   Consider using Adafruit CircuitPython library instead"
fi

