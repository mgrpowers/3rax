#!/usr/bin/env python3
"""
Test display using framebuffer (if available)
Many Mini PiTFT setups use /dev/fb1 instead of direct SPI
Works better with MoOde/KMS setups
"""

import sys
import os
import struct
import time
from PIL import Image

print("Testing Mini PiTFT via Framebuffer...")
print("=" * 60)

# Check for framebuffer device
fb_device = None
fb_devices = []
for fb in ['/dev/fb0', '/dev/fb1', '/dev/fb2']:
    if os.path.exists(fb):
        fb_devices.append(fb)
        print(f"✅ Found framebuffer: {fb}")

if not fb_devices:
    print("❌ No framebuffer devices found")
    print("Try: ls -la /dev/fb*")
    print("If no framebuffer, use direct SPI method instead")
    sys.exit(1)

# Try fb1 first (usually the secondary display), then fb0
for fb in ['/dev/fb1', '/dev/fb0', '/dev/fb2']:
    if fb in fb_devices:
        fb_device = fb
        print(f"Using: {fb_device}")
        break

try:
    # Open framebuffer
    fb = open(fb_device, 'rb+')
    
    # Read framebuffer info (if available)
    try:
        # Try to get framebuffer info
        import fcntl
        FBIOGET_VSCREENINFO = 0x4600
        
        # This is a simplified version - actual implementation varies
        print("Reading framebuffer info...")
    except:
        pass
    
    # For Mini PiTFT 135x240, assume RGB565 format
    width = 135
    height = 240
    bytes_per_pixel = 2  # RGB565
    
    print(f"Display size: {width}x{height}")
    print(f"Bytes per pixel: {bytes_per_pixel}")
    
    def rgb565(r, g, b):
        """Convert RGB to RGB565 format"""
        return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
    
    def write_image(img):
        """Write PIL Image to framebuffer"""
        # Convert image to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize to display size
        img = img.resize((width, height))
        
        # Create framebuffer buffer
        fb_data = bytearray(width * height * bytes_per_pixel)
        
        pixels = img.load()
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                pixel = rgb565(r, g, b)
                offset = (y * width + x) * bytes_per_pixel
                fb_data[offset] = pixel & 0xFF
                fb_data[offset + 1] = (pixel >> 8) & 0xFF
        
        # Write to framebuffer
        fb.seek(0)
        fb.write(fb_data)
        fb.flush()
    
    # Test 1: Red screen
    print("\nTest 1: Red screen...")
    img = Image.new('RGB', (width, height), color='red')
    write_image(img)
    print("✅ Red screen sent (waiting 2 seconds...)")
    time.sleep(2)
    
    # Test 2: White screen
    print("Test 2: White screen...")
    img = Image.new('RGB', (width, height), color='white')
    write_image(img)
    print("✅ White screen sent (waiting 2 seconds...)")
    time.sleep(2)
    
    # Test 3: Text
    print("Test 3: Text display...")
    img = Image.new('RGB', (width, height), color='black')
    from PIL import ImageDraw, ImageFont
    
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
    except:
        font = ImageFont.load_default()
    
    draw.text((10, 50), "FRAMEBUFFER", fill='white', font=font)
    draw.text((10, 80), "TEST OK!", fill='white', font=font)
    draw.rectangle([0, 0, width-1, height-1], outline='white', width=2)
    
    write_image(img)
    print("✅ Text sent (waiting 5 seconds...)")
    time.sleep(5)
    
    fb.close()
    print("\n✅ Framebuffer test complete!")
    print("If you saw the screens change, framebuffer is working!")
    
except PermissionError:
    print(f"\n❌ Permission denied accessing {fb_device}")
    print("Try running with: sudo python3 test-display-framebuffer.py")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

