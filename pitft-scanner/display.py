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
            
            print("[DEBUG] Attempting Adafruit display initialization...", file=sys.stderr)
            
            # Try CS=None (some PiTFTs tie CS), then CE0, then CE1 to avoid "GPIO busy"
            cs_candidates = [None, getattr(board, "CE0", None), getattr(board, "CE1", None)]
            cs_candidates = [c for c in cs_candidates if c is None or c is not None]
            dc_pin_id = getattr(board, "D24", None)
            rst_pin_id = getattr(board, "D25", None)
            
            print(f"[DEBUG] CS candidates: {cs_candidates}, DC={dc_pin_id}, RST={rst_pin_id}", file=sys.stderr)
            
            last_error = None
            for cs_candidate in cs_candidates:
                try:
                    print(f"[DEBUG] Trying CS={cs_candidate}...", file=sys.stderr)
                    cs_pin = digitalio.DigitalInOut(cs_candidate) if cs_candidate is not None else None
                    dc_pin = digitalio.DigitalInOut(dc_pin_id)
                    reset_pin = digitalio.DigitalInOut(rst_pin_id)
                    
                    # Configure reset pin as output for hardware reset
                    reset_pin.switch_to_output()
                    
                    # Hardware reset - pulse reset pin low then high
                    print("[DEBUG] Performing hardware reset...", file=sys.stderr)
                    reset_pin.switch_to_output()
                    reset_pin.value = False
                    time.sleep(0.05)  # Longer reset pulse
                    reset_pin.value = True
                    time.sleep(0.1)  # Longer wait after reset
                    
                    # Try to control backlight (GPIO 18)
                    backlight_pin = None
                    try:
                        backlight_pin = digitalio.DigitalInOut(getattr(board, "D18"))
                        backlight_pin.switch_to_output()
                        backlight_pin.value = True  # Turn on backlight
                        print("[DEBUG] Backlight enabled on GPIO 18", file=sys.stderr)
                    except Exception as e:
                        print(f"[DEBUG] Backlight control failed (may not be needed): {e}", file=sys.stderr)
                        pass  # Backlight control optional
                    
                    # Create display
                    print("[DEBUG] Creating SPI interface...", file=sys.stderr)
                    spi_interface = board.SPI()
                    print("[DEBUG] Creating ST7789 display...", file=sys.stderr)
                    
                    # Mini PiTFT 135x240 standard rotation is 90 degrees
                    print("[DEBUG] Creating ST7789 display with rotation=90 (standard for Mini PiTFT)...", file=sys.stderr)
                    device = adafruit_st7789.ST7789(
                        spi_interface,
                        cs=cs_pin,
                        dc=dc_pin,
                        rst=reset_pin,
                        width=width,
                        height=height,
                        rotation=90,  # 90 degrees is standard for Mini PiTFT 135x240
                        baudrate=24000000  # Explicit baudrate
                    )
                    print("[DEBUG] Display object created", file=sys.stderr)
                    print(f"[DEBUG] Display initialized successfully with CS={cs_candidate}", file=sys.stderr)
                    
                    # Send a test pattern immediately to verify communication
                    print("[DEBUG] Sending test pattern (bright red screen)...", file=sys.stderr)
                    test_img = Image.new('RGB', (width, height), color='red')
                    device.image(test_img)
                    time.sleep(0.2)
                    print("[DEBUG] Test pattern sent - you should see RED screen", file=sys.stderr)
                    
                    # Try to wake display if it's in sleep mode
                    try:
                        # Some displays need explicit wake command
                        device._write(0x29)  # Display ON command
                        time.sleep(0.1)
                    except:
                        pass
                    # Success, break out
                    last_error = None
                    break
                except Exception as e:
                    last_error = e
                    print(f"[DEBUG] Failed with CS={cs_candidate}: {e}", file=sys.stderr)
                    # Clean up pins if partially initialized
                    try:
                        if cs_pin:
                            cs_pin.deinit()
                    except Exception:
                        pass
                    try:
                        dc_pin.deinit()
                    except Exception:
                        pass
                    try:
                        reset_pin.deinit()
                    except Exception:
                        pass
                    try:
                        if backlight_pin:
                            backlight_pin.deinit()
                    except Exception:
                        pass
                    continue
            
            if device is None:
                raise Exception(f"Adafruit initialization failed: {last_error}")
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
        
        print(f"[DEBUG] Sending image to display ({width}x{height})...", file=sys.stderr)
        print(f"[DEBUG] Image mode: {img.mode}, size: {img.size}", file=sys.stderr)
        
        if LUMA_AVAILABLE:
            device.display(img)
            print("[DEBUG] Image sent via luma.lcd library", file=sys.stderr)
        elif ADAFRUIT_AVAILABLE:
            # Ensure image is in RGB mode
            if img.mode != 'RGB':
                print(f"[DEBUG] Converting image from {img.mode} to RGB", file=sys.stderr)
                img = img.convert('RGB')
            device.image(img)
            print("[DEBUG] Image sent via Adafruit library", file=sys.stderr)
            # Force display refresh
            try:
                device.refresh()
            except:
                pass
        
        # Small delay to ensure display updates and stays visible
        time.sleep(0.3)
        print("[DEBUG] Display update complete", file=sys.stderr)
        
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
