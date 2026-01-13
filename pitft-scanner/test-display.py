#!/usr/bin/env python3
"""
Simple test script to verify Mini PiTFT display is working
Run: python3 test-display.py
"""

import sys
import time
from PIL import Image, ImageDraw, ImageFont

print("Testing Mini PiTFT Display...")
print("=" * 50)

# Try to import display libraries
LUMA_AVAILABLE = False
ADAFRUIT_AVAILABLE = False

try:
    from luma.core.interface.serial import spi
    from luma.lcd.device import st7789 as luma_st7789
    LUMA_AVAILABLE = True
    print("✅ luma.lcd library found")
except ImportError as e:
    print(f"❌ luma.lcd not available: {e}")
    try:
        import board
        import digitalio
        from adafruit_rgb_display import st7789 as adafruit_st7789
        ADAFRUIT_AVAILABLE = True
        print("✅ Adafruit CircuitPython library found")
    except ImportError as e2:
        print(f"❌ Adafruit library not available: {e2}")

if not LUMA_AVAILABLE and not ADAFRUIT_AVAILABLE:
    print("\n⚠️  No display library available!")
    print("Install with: sudo pip3 install --break-system-packages luma.lcd")
    sys.exit(1)

print("\nInitializing display...")
device = None

try:
    if LUMA_AVAILABLE:
        print("Using luma.lcd with SPI interface...")
        print("  SPI port: 0, device: 0")
        print("  DC pin: GPIO 24")
        print("  RST pin: GPIO 25")
        serial = spi(port=0, device=0, gpio_DC=24, gpio_RST=25)
        device = luma_st7789(serial, width=135, height=240, rotate=0)
        print("✅ Display initialized with luma.lcd")
    elif ADAFRUIT_AVAILABLE:
        print("Using Adafruit CircuitPython library...")
        import board
        import digitalio
        
        cs_pin = digitalio.DigitalInOut(board.CE0)
        dc_pin = digitalio.DigitalInOut(board.D24)
        reset_pin = digitalio.DigitalInOut(board.D25)
        
        spi_interface = board.SPI()
        device = adafruit_st7789.ST7789(
            spi_interface,
            cs=cs_pin,
            dc=dc_pin,
            rst=reset_pin,
            width=135,
            height=240,
            rotation=0
        )
        print("✅ Display initialized with Adafruit library")
    
    if not device:
        raise Exception("Failed to create display device")
    
    print("\n" + "=" * 50)
    print("Display Test - You should see text on the screen!")
    print("=" * 50)
    
    # Test 1: Clear screen with black
    print("\nTest 1: Clearing screen (black)...")
    img = Image.new('RGB', (135, 240), color='black')
    if LUMA_AVAILABLE:
        device.display(img)
    elif ADAFRUIT_AVAILABLE:
        device.image(img)
    time.sleep(1)
    
    # Test 2: White screen
    print("Test 2: White screen...")
    img = Image.new('RGB', (135, 240), color='white')
    if LUMA_AVAILABLE:
        device.display(img)
    elif ADAFRUIT_AVAILABLE:
        device.image(img)
    time.sleep(1)
    
    # Test 3: Text display
    print("Test 3: Displaying text...")
    img = Image.new('RGB', (135, 240), color='black')
    draw = ImageDraw.Draw(img)
    
    # Try to load a font
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
        small_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    except:
        font = ImageFont.load_default()
        small_font = font
        print("  Using default font (DejaVu not found)")
    
    # Draw test text
    y = 10
    test_lines = [
        "PiTFT Test",
        "Display OK!",
        "Line 3",
        "Line 4",
        "Working!"
    ]
    
    for line in test_lines:
        draw.text((5, y), line, fill='white', font=font)
        y += 25
    
    # Draw a border
    draw.rectangle([0, 0, 134, 239], outline='white', width=2)
    
    if LUMA_AVAILABLE:
        device.display(img)
    elif ADAFRUIT_AVAILABLE:
        device.image(img)
    
    print("✅ Text displayed!")
    print("\nIf you see text on the display, it's working!")
    print("Press Ctrl+C to exit...")
    
    # Keep displaying for 30 seconds
    time.sleep(30)
    
except KeyboardInterrupt:
    print("\n\nTest interrupted by user")
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nTroubleshooting:")
    print("1. Check SPI is enabled: sudo raspi-config -> Interface Options -> SPI -> Enable")
    print("2. Check display is connected properly")
    print("3. Check GPIO pins match your wiring")
    print("4. Try: sudo pip3 install --break-system-packages luma.lcd")
    sys.exit(1)

print("\n✅ Test complete!")

