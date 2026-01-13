#!/usr/bin/env python3
"""
Raw SPI test - verify SPI communication is actually working
"""

import sys
import time
import board
import digitalio
from PIL import Image

try:
    from adafruit_rgb_display import st7789
    
    print("=" * 60)
    print("RAW SPI COMMUNICATION TEST")
    print("=" * 60)
    print()
    
    # Setup pins
    print("Setting up GPIO pins...")
    cs_pin = None  # Try without CS first
    dc_pin = digitalio.DigitalInOut(board.D24)
    reset_pin = digitalio.DigitalInOut(board.D25)
    
    # Hardware reset
    print("Performing hardware reset...")
    reset_pin.switch_to_output()
    reset_pin.value = False
    time.sleep(0.01)
    reset_pin.value = True
    time.sleep(0.05)
    
    # Backlight
    print("Enabling backlight...")
    try:
        backlight = digitalio.DigitalInOut(board.D18)
        backlight.switch_to_output()
        backlight.value = True
        print("✅ Backlight ON")
    except Exception as e:
        print(f"⚠️  Backlight failed: {e}")
    
    # SPI
    print("Initializing SPI...")
    spi = board.SPI()
    print(f"SPI object: {spi}")
    
    # Display
    print("Creating display object...")
    display = st7789.ST7789(
        spi,
        cs=cs_pin,
        dc=dc_pin,
        rst=reset_pin,
        width=135,
        height=240,
        rotation=0,
        baudrate=24000000  # Explicit baudrate
    )
    print("✅ Display object created")
    
    # Try to send display ON command directly
    print("\nSending display commands...")
    try:
        # Display ON
        display._write(0x29)
        time.sleep(0.1)
        print("✅ Display ON command sent")
    except Exception as e:
        print(f"⚠️  Display ON command failed: {e}")
    
    # Test 1: Fill with bright white
    print("\nTest 1: Bright WHITE screen...")
    img = Image.new('RGB', (135, 240), color=(255, 255, 255))
    display.image(img)
    print("✅ White image sent")
    print("   Do you see WHITE? (waiting 3 seconds...)")
    time.sleep(3)
    
    # Test 2: Fill with bright red
    print("\nTest 2: Bright RED screen...")
    img = Image.new('RGB', (135, 240), color=(255, 0, 0))
    display.image(img)
    print("✅ Red image sent")
    print("   Do you see RED? (waiting 3 seconds...)")
    time.sleep(3)
    
    # Test 3: Check SPI activity
    print("\nTest 3: Checking SPI communication...")
    print("   If you have a logic analyzer or oscilloscope,")
    print("   check SPI pins (MOSI, SCLK) for activity")
    
    # Test 4: Try with CS pin
    print("\nTest 4: Trying with CS pin (CE0)...")
    try:
        cs_pin2 = digitalio.DigitalInOut(board.CE0)
        display2 = st7789.ST7789(
            spi,
            cs=cs_pin2,
            dc=dc_pin,
            rst=reset_pin,
            width=135,
            height=240,
            rotation=0,
            baudrate=24000000
        )
        img = Image.new('RGB', (135, 240), color=(0, 255, 0))
        display2.image(img)
        print("✅ Green image sent with CS pin")
        print("   Do you see GREEN? (waiting 3 seconds...)")
        time.sleep(3)
    except Exception as e:
        print(f"⚠️  CS pin test failed: {e}")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print("\nIf you don't see ANY colors:")
    print("1. Check SPI connections (MOSI, SCLK, CS, DC, RST)")
    print("2. Verify display model matches (ST7789 135x240)")
    print("3. Check power supply (3.3V and GND)")
    print("4. Try different CS pin or CS=None")
    print("5. Display might need different initialization")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

