#!/usr/bin/env python3
"""
Bright test - fill entire screen with bright colors to verify display
"""

import sys
import time
from PIL import Image

try:
    import board
    import digitalio
    from adafruit_rgb_display import st7789
    
    print("Initializing display...")
    
    # Use CS=None (worked in previous test)
    cs_pin = None
    dc_pin = digitalio.DigitalInOut(board.D24)
    reset_pin = digitalio.DigitalInOut(board.D25)
    
    # Backlight - try multiple methods
    print("Enabling backlight...")
    try:
        backlight = digitalio.DigitalInOut(board.D18)
        backlight.switch_to_output()
        backlight.value = True
        print("✅ Backlight ON (GPIO 18)")
    except Exception as e:
        print(f"⚠️  Backlight GPIO 18 failed: {e}")
    
    spi = board.SPI()
    display = st7789.ST7789(spi, cs=cs_pin, dc=dc_pin, rst=reset_pin, width=135, height=240, rotation=0)
    
    print("✅ Display initialized!")
    print("")
    print("=" * 50)
    print("BRIGHT COLOR TEST")
    print("=" * 50)
    print("Watch the display - you should see colors change!")
    print("")
    
    colors = [
        ("RED", (255, 0, 0)),
        ("GREEN", (0, 255, 0)),
        ("BLUE", (0, 0, 255)),
        ("WHITE", (255, 255, 255)),
        ("YELLOW", (255, 255, 0)),
        ("CYAN", (0, 255, 255)),
        ("MAGENTA", (255, 0, 255)),
        ("BLACK", (0, 0, 0)),
    ]
    
    for color_name, rgb in colors:
        print(f"Showing {color_name} (5 seconds)...")
        img = Image.new('RGB', (135, 240), color=rgb)
        display.image(img)
        time.sleep(5)
    
    print("")
    print("=" * 50)
    print("Test complete!")
    print("Did you see ANY colors change on the display?")
    print("If yes, the display works! If no, check:")
    print("  1. Display connections")
    print("  2. Backlight (might need different GPIO)")
    print("  3. Power supply")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

