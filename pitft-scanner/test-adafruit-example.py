#!/usr/bin/env python3
"""
Test using Adafruit's exact example code for Mini PiTFT 135x240
"""

import board
import digitalio
from PIL import Image, ImageDraw, ImageFont
import adafruit_rgb_display.st7789 as st7789

# Configuration for Mini PiTFT 135x240
cs_pin = digitalio.DigitalInOut(board.CE0)
dc_pin = digitalio.DigitalInOut(board.D24)
reset_pin = digitalio.DigitalInOut(board.D25)
backlight = digitalio.DigitalInOut(board.D18)

# Configuration for CS and DC pins (these are correct for Mini PiTFT)
spi = board.SPI()

# Create the ST7789 display:
display = st7789.ST7789(
    spi,
    rotation=90,  # 90 degree rotation for Mini PiTFT
    width=135,
    height=240,
    x_offset=53,
    y_offset=40,
    cs=cs_pin,
    dc=dc_pin,
    rst=reset_pin,
    baudrate=24000000,
)

# Turn on the backlight
backlight.switch_to_output()
backlight.value = True

print("Display initialized!")
print("Showing test colors...")

# Create blank image for drawing
width = display.width
height = display.height
image = Image.new("RGB", (width, height))

# Get drawing object
draw = ImageDraw.Draw(image)

# Draw a black filled box to clear the image
draw.rectangle((0, 0, width, height), outline=0, fill=(0, 0, 0))

# Test colors
colors = [
    ("RED", (255, 0, 0)),
    ("GREEN", (0, 255, 0)),
    ("BLUE", (0, 0, 255)),
    ("WHITE", (255, 255, 255)),
]

for color_name, rgb in colors:
    print(f"Showing {color_name}...")
    # Fill screen with color
    draw.rectangle((0, 0, width, height), outline=0, fill=rgb)
    
    # Display image
    display.image(image)
    
    import time
    time.sleep(3)

print("Test complete!")
print("Did you see colors?")

