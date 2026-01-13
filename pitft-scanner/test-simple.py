#!/usr/bin/env python3
"""
Simple test - just fill screen with colors to verify display works
"""

import sys
import time
from PIL import Image

try:
    import board
    import digitalio
    from adafruit_rgb_display import st7789
    
    print("Initializing display...")
    
    # Try CE0 first
    cs_pin = digitalio.DigitalInOut(board.CE0)
    dc_pin = digitalio.DigitalInOut(board.D24)
    reset_pin = digitalio.DigitalInOut(board.D25)
    
    # Backlight
    try:
        backlight = digitalio.DigitalInOut(board.D18)
        backlight.switch_to_output()
        backlight.value = True
        print("Backlight ON")
    except:
        print("Backlight control failed (continuing anyway)")
    
    spi = board.SPI()
    display = st7789.ST7789(spi, cs=cs_pin, dc=dc_pin, rst=reset_pin, width=135, height=240, rotation=0)
    
    print("Display initialized!")
    print("Testing colors...")
    
    # Test 1: RED
    print("RED screen (3 seconds)...")
    img = Image.new('RGB', (135, 240), color='red')
    display.image(img)
    time.sleep(3)
    
    # Test 2: WHITE
    print("WHITE screen (3 seconds)...")
    img = Image.new('RGB', (135, 240), color='white')
    display.image(img)
    time.sleep(3)
    
    # Test 3: BLUE
    print("BLUE screen (3 seconds)...")
    img = Image.new('RGB', (135, 240), color='blue')
    display.image(img)
    time.sleep(3)
    
    # Test 4: BLACK
    print("BLACK screen (3 seconds)...")
    img = Image.new('RGB', (135, 240), color='black')
    display.image(img)
    time.sleep(3)
    
    print("Test complete!")
    print("Did you see the colors change on the display?")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

