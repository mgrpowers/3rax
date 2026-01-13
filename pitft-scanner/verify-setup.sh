#!/bin/bash
# Quick verification script after enabling SPI

echo "Verifying SPI and Display Setup..."
echo "=================================="
echo ""

# Check SPI devices
echo "1. Checking SPI devices..."
if ls /dev/spi* 2>/dev/null; then
    echo "   ✅ SPI devices found:"
    ls -la /dev/spi* | sed 's/^/      /'
else
    echo "   ❌ No SPI devices found"
    echo "   SPI may not be enabled properly"
    exit 1
fi

echo ""

# Check Python version
echo "2. Python version:"
python3 --version | sed 's/^/   /'

echo ""

# Check display libraries
echo "3. Checking display libraries..."
if python3 -c "import board; import digitalio; from adafruit_rgb_display import st7789" 2>/dev/null; then
    echo "   ✅ Adafruit CircuitPython library installed"
    LIBRARY="adafruit"
elif python3 -c "from luma.core.interface.serial import spi; from luma.lcd.device import st7789" 2>/dev/null; then
    echo "   ✅ luma.lcd library installed"
    LIBRARY="luma"
else
    echo "   ❌ No display library found"
    echo "   Install: sudo pip3 install --break-system-packages adafruit-circuitpython-st7789 adafruit-blinka"
    exit 1
fi

echo ""

# Test display
echo "4. Testing display..."
if sudo python3 display.py "Test" 2>&1 | grep -q "Display error"; then
    echo "   ❌ Display test failed"
    echo "   Check error messages above"
    exit 1
else
    echo "   ✅ Display test passed"
    echo "   You should see 'Test' on the display!"
fi

echo ""
echo "=================================="
echo "✅ Setup verified! Display should be working."
echo ""
echo "To start the scanner service:"
echo "  cd pitft-scanner"
echo "  npm start"

