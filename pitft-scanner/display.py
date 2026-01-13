#!/usr/bin/env python3
"""
Display script for Adafruit Mini PiTFT 135x240
This script handles displaying text on the Mini PiTFT screen
"""

import sys
import argparse
import time
from PIL import Image, ImageDraw, ImageFont

# Try multiple display libraries
LUMA_AVAILABLE = False
ADAFRUIT_AVAILABLE = False

# Try Adafruit first (often works better with newer Python/Raspberry Pi OS)
try:
    import board
    import digitalio
    from adafruit_rgb_display import st7789 as adafruit_st7789
    ADAFRUIT_AVAILABLE = True
except ImportError:
    ADAFRUIT_AVAILABLE = False
    try:
        from luma.core.interface.serial import spi
        from luma.lcd.device import st7789 as luma_st7789
        LUMA_AVAILABLE = True
    except ImportError:
        LUMA_AVAILABLE = False

if not LUMA_AVAILABLE and not ADAFRUIT_AVAILABLE:
    print("Warning: No display library available. Install with:", file=sys.stderr)
    print("  sudo pip3 install --break-system-packages luma.lcd", file=sys.stderr)
    print("  OR: sudo pip3 install --break-system-packages adafruit-circuitpython-st7789 adafruit-blinka", file=sys.stderr)

# Check for SPI devices
import os
spi_devices = [d for d in os.listdir('/dev') if d.startswith('spi')]
if not spi_devices:
    print("Warning: No SPI devices found in /dev/. SPI may not be enabled.", file=sys.stderr)
    print("  Enable SPI: sudo raspi-config -> Interface Options -> SPI -> Enable", file=sys.stderr)
    print("  Then reboot: sudo reboot", file=sys.stderr)

def display_text(text, width=135, height=240):
    """Display text on Mini PiTFT display"""
    
    # Fallback to console if no display library available
    if not LUMA_AVAILABLE and not ADAFRUIT_AVAILABLE:
        print(f"[DISPLAY] {text}")
        return
    
    try:
        device = None
        
        if ADAFRUIT_AVAILABLE:
            # Use Adafruit CircuitPython library (often works better with newer Python/Raspberry Pi OS)
            import board
            import digitalio
            
            # Configure CS and DC pins
            cs_pin = digitalio.DigitalInOut(board.CE0)
            dc_pin = digitalio.DigitalInOut(board.D24)
            reset_pin = digitalio.DigitalInOut(board.D25)
            
            # Try to control backlight (GPIO 18)
            try:
                backlight_pin = digitalio.DigitalInOut(board.D18)
                backlight_pin.switch_to_output()
                backlight_pin.value = True  # Turn on backlight
            except:
                pass  # Backlight control optional
            
            # Create display
            spi_interface = board.SPI()
            device = adafruit_st7789.ST7789(
                spi_interface,
                cs=cs_pin,
                dc=dc_pin,
                rst=reset_pin,
                width=width,
                height=height,
                rotation=0
            )
        elif LUMA_AVAILABLE:
            # Use luma.lcd library with SPI interface (fallback)
            # Mini PiTFT uses SPI, not GPIO LCD interface
            # SPI pins: SPI0, CS=CE0 (GPIO 8), DC=GPIO 24, RST=GPIO 25
            # Backlight: GPIO 18 (optional, but helps visibility)
            
            # Try to control backlight (requires GPIO access)
            try:
                import RPi.GPIO as GPIO
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(18, GPIO.OUT)
                GPIO.output(18, GPIO.HIGH)  # Turn on backlight
            except Exception as e:
                # GPIO access might require sudo - that's OK, continue anyway
                pass
            
            # Initialize SPI interface - this requires GPIO access for DC/RST pins
            # If running without sudo, this will fail with "Cannot determine SOC peripheral base address"
            try:
                serial = spi(port=0, device=0, gpio_DC=24, gpio_RST=25)
                device = luma_st7789(serial, width=width, height=height, rotate=0)
            except RuntimeError as e:
                if "Cannot determine SOC peripheral base address" in str(e):
                    raise Exception(
                        "GPIO access issue. Try:\n"
                        "  1. Install Adafruit library: sudo pip3 install --break-system-packages adafruit-circuitpython-st7789\n"
                        "  2. OR use gpiod: sudo apt-get install python3-libgpiod\n"
                        "  3. OR check Python version compatibility with RPi.GPIO"
                    )
                raise
            # Use Adafruit CircuitPython library
            import board
            import digitalio
            
            # Configure CS and DC pins
            cs_pin = digitalio.DigitalInOut(board.CE0)
            dc_pin = digitalio.DigitalInOut(board.D24)
            reset_pin = digitalio.DigitalInOut(board.D25)
            
            # Create display
            spi_interface = board.SPI()
            device = adafruit_st7789.ST7789(
                spi_interface,
                cs=cs_pin,
                dc=dc_pin,
                rst=reset_pin,
                width=width,
                height=height,
                rotation=0
            )
        
        if not device:
            raise Exception("Failed to initialize display device")
        
        # Create image with black background
        img = Image.new('RGB', (width, height), color='black')
        draw = ImageDraw.Draw(img)
        
        # Try to load a font
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
            small_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
        except:
            font = ImageFont.load_default()
            small_font = font
        
        # Split text into lines
        lines = text.split('\n')
        y = 5
        max_lines = min(10, len(lines))
        
        for i, line in enumerate(lines[:max_lines]):
            # Word wrap if line is too long
            max_chars = 15  # Approximate characters per line for 135px width
            if len(line) > max_chars:
                words = line.split(' ')
                current_line = ''
                for word in words:
                    if len(current_line + word) < max_chars:
                        current_line += word + ' '
                    else:
                        if current_line:
                            draw.text((5, y), current_line.strip(), fill='white', font=font)
                            y += 18
                        current_line = word + ' '
                if current_line:
                    draw.text((5, y), current_line.strip(), fill='white', font=font)
                    y += 18
            else:
                draw.text((5, y), line, fill='white', font=font)
                y += 18
            
            if y > height - 20:
                break
        
        if LUMA_AVAILABLE:
            device.display(img)
        elif ADAFRUIT_AVAILABLE:
            device.image(img)
        
        # Small delay to ensure display updates and stays visible
        time.sleep(0.1)
        
    except Exception as e:
        print(f"Display error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        print(f"[DISPLAY] {text}")  # Fallback to console

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Display text on Mini PiTFT')
    parser.add_argument('text', nargs='*', help='Text to display')
    parser.add_argument('--width', type=int, default=135, help='Display width')
    parser.add_argument('--height', type=int, default=240, help='Display height')
    
    args = parser.parse_args()
    text = ' '.join(args.text) if args.text else sys.stdin.read()
    
    display_text(text.strip(), args.width, args.height)
