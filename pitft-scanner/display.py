#!/usr/bin/env python3
"""
Display script for Adafruit Mini PiTFT 135x240
This script handles displaying text on the Mini PiTFT screen
"""

import sys
import argparse
from PIL import Image, ImageDraw, ImageFont

# Try multiple display libraries
LUMA_AVAILABLE = False
ADAFRUIT_AVAILABLE = False

try:
    from luma.lcd.interface import lcd_gpio
    from luma.lcd.device import st7789
    LUMA_AVAILABLE = True
except ImportError:
    try:
        import board
        import digitalio
        from adafruit_rgb_display import st7789 as adafruit_st7789
        ADAFRUIT_AVAILABLE = True
    except ImportError:
        pass

if not LUMA_AVAILABLE and not ADAFRUIT_AVAILABLE:
    print("Warning: No display library available. Install with:", file=sys.stderr)
    print("  sudo pip3 install --break-system-packages luma.lcd", file=sys.stderr)
    print("  OR: sudo pip3 install --break-system-packages adafruit-circuitpython-st7789", file=sys.stderr)

def display_text(text, width=135, height=240):
    """Display text on Mini PiTFT display"""
    
    if not LUMA_AVAILABLE:
        print(f"[DISPLAY] {text}")
        return
    
    try:
        # Initialize display
        # GPIO pins for Mini PiTFT - adjust if using different wiring
        interface = lcd_gpio(
            gpio_LIGHT=18,  # Backlight
            gpio_RS=27,     # Register select
            gpio_RST=22     # Reset
        )
        device = st7789(interface, width=width, height=height, rotate=0)
        
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

