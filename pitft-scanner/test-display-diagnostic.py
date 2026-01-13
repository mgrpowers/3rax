#!/usr/bin/env python3
"""
Diagnostic script for Mini PiTFT display
Checks SPI, GPIO, and tries different display configurations
"""

import sys
import subprocess
import time
from PIL import Image, ImageDraw, ImageFont

print("=" * 60)
print("Mini PiTFT Display Diagnostic Tool")
print("=" * 60)

# Check 1: SPI enabled?
print("\n1. Checking SPI...")
try:
    result = subprocess.run(['lsmod'], capture_output=True, text=True)
    if 'spi_bcm' in result.stdout or 'spidev' in result.stdout:
        print("   ✅ SPI modules loaded")
    else:
        print("   ⚠️  SPI modules not found in lsmod")
        print("   Try: sudo raspi-config -> Interface Options -> SPI -> Enable")
    
    # Check /dev/spidev
    result = subprocess.run(['ls', '/dev/spi*'], capture_output=True, text=True)
    if result.returncode == 0 and result.stdout.strip():
        print(f"   ✅ SPI devices found: {result.stdout.strip()}")
    else:
        print("   ❌ No SPI devices found in /dev/")
except Exception as e:
    print(f"   ⚠️  Could not check SPI: {e}")

# Check 2: Libraries installed?
print("\n2. Checking display libraries...")
LUMA_AVAILABLE = False
ADAFRUIT_AVAILABLE = False

try:
    from luma.core.interface.serial import spi
    from luma.lcd.device import st7789 as luma_st7789
    LUMA_AVAILABLE = True
    print("   ✅ luma.lcd library found")
except ImportError as e:
    print(f"   ❌ luma.lcd not available: {e}")
    print("   Install: sudo pip3 install --break-system-packages luma.lcd")

try:
    import board
    import digitalio
    from adafruit_rgb_display import st7789 as adafruit_st7789
    ADAFRUIT_AVAILABLE = True
    print("   ✅ Adafruit CircuitPython library found")
except ImportError:
    print("   ⚠️  Adafruit library not available (optional)")

if not LUMA_AVAILABLE and not ADAFRUIT_AVAILABLE:
    print("\n❌ No display libraries available!")
    print("Install: sudo pip3 install --break-system-packages luma.lcd")
    sys.exit(1)

# Check 3: GPIO access
print("\n3. Checking GPIO access...")
try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    print("   ✅ RPi.GPIO available")
    GPIO.cleanup()
except ImportError:
    print("   ⚠️  RPi.GPIO not available (may need: sudo pip3 install RPi.GPIO)")
except Exception as e:
    print(f"   ⚠️  GPIO check failed: {e}")

# Check 4: Try to initialize display
print("\n4. Attempting display initialization...")
device = None
init_method = None

if LUMA_AVAILABLE:
    print("   Trying luma.lcd with SPI...")
    try:
        # Try different SPI configurations
        configs = [
            {"port": 0, "device": 0, "dc": 24, "rst": 25},
            {"port": 0, "device": 0, "dc": 25, "rst": 24},  # Swapped
            {"port": 0, "device": 0, "dc": 24, "rst": 25, "backlight": 18},
        ]
        
        for i, config in enumerate(configs):
            try:
                print(f"   Attempt {i+1}: SPI port={config['port']}, device={config['device']}, DC={config['dc']}, RST={config['rst']}")
                serial = spi(
                    port=config['port'], 
                    device=config['device'], 
                    gpio_DC=config['dc'], 
                    gpio_RST=config['rst']
                )
                device = luma_st7789(serial, width=135, height=240, rotate=0)
                init_method = "luma"
                print(f"   ✅ Display initialized successfully!")
                print(f"   Using: SPI port={config['port']}, device={config['device']}, DC={config['dc']}, RST={config['rst']}")
                break
            except Exception as e:
                print(f"   ❌ Failed: {e}")
                if device:
                    device = None
    except Exception as e:
        print(f"   ❌ luma.lcd initialization failed: {e}")
        import traceback
        traceback.print_exc()

if not device and ADAFRUIT_AVAILABLE:
    print("\n   Trying Adafruit CircuitPython...")
    try:
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
        init_method = "adafruit"
        print("   ✅ Display initialized with Adafruit!")
    except Exception as e:
        print(f"   ❌ Adafruit initialization failed: {e}")
        import traceback
        traceback.print_exc()

if not device:
    print("\n❌ Could not initialize display!")
    print("\nTroubleshooting steps:")
    print("1. Enable SPI: sudo raspi-config -> Interface Options -> SPI")
    print("2. Reboot after enabling SPI")
    print("3. Check display connections")
    print("4. Verify GPIO pins match your wiring")
    print("5. Try: sudo pip3 install --break-system-packages luma.lcd")
    sys.exit(1)

# Test 5: Try to display something
print("\n5. Testing display output...")
try:
    # Create test image
    img = Image.new('RGB', (135, 240), color='red')
    
    if init_method == "luma":
        print("   Sending image via luma.lcd...")
        device.display(img)
    elif init_method == "adafruit":
        print("   Sending image via Adafruit...")
        device.image(img)
    
    print("   ✅ Image sent to display")
    print("   Do you see a RED screen? (waiting 3 seconds...)")
    time.sleep(3)
    
    # Try white
    img = Image.new('RGB', (135, 240), color='white')
    if init_method == "luma":
        device.display(img)
    elif init_method == "adafruit":
        device.image(img)
    print("   ✅ Sent WHITE screen")
    print("   Do you see a WHITE screen? (waiting 3 seconds...)")
    time.sleep(3)
    
    # Try text
    img = Image.new('RGB', (135, 240), color='black')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
    except:
        font = ImageFont.load_default()
    
    draw.text((10, 50), "TEST", fill='white', font=font)
    draw.text((10, 80), "12345", fill='white', font=font)
    draw.rectangle([0, 0, 134, 239], outline='white', width=2)
    
    if init_method == "luma":
        device.display(img)
    elif init_method == "adafruit":
        device.image(img)
    
    print("   ✅ Sent TEXT image")
    print("   Do you see 'TEST' and '12345'? (waiting 5 seconds...)")
    time.sleep(5)
    
    print("\n✅ Display test complete!")
    print("\nIf you saw the screens change, the display is working!")
    print("If not, check:")
    print("  - Display backlight (might need GPIO 18)")
    print("  - Display connections")
    print("  - SPI is enabled and working")
    
except Exception as e:
    print(f"\n❌ Display test failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)

