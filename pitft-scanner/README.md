# Raspberry Pi Scanner Service with Mini PiTFT Display

This service runs on a Raspberry Pi with a Mini PiTFT (135x240) display and USB scanner to handle item check-in/check-out operations.

## Hardware Requirements

- Raspberry Pi (any model)
- Adafruit Mini PiTFT - 135x240 Color TFT Add-on
- USB QR code scanner (appears as keyboard input)

## Software Requirements

- Node.js (v18+)
- Python 3 (for display library)
- pip3

## Setup

### 1. Install Display Library

For systems with externally-managed-environment protection, use the `--break-system-packages` flag:

```bash
sudo pip3 install --break-system-packages luma.lcd Pillow
```

Alternatively, install to user directory (no sudo required):

```bash
pip3 install --user luma.lcd Pillow
```

Note: If using `--user`, you may need to add `~/.local/bin` to your PATH.

### 2. Install Node.js Dependencies

```bash
cd pitft-scanner
npm install
```

### 3. Configure Environment

Create a `.env` file:

```env
API_URL=http://your-backend-ip:3001
SCANNER_INPUT_DEVICE=/dev/input/event0
DISPLAY_TYPE=st7789
DISPLAY_WIDTH=135
DISPLAY_HEIGHT=240
```

### 4. Run the Service

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Usage

1. Scan an item QR code or bin QR code (order doesn't matter)
2. The service will detect what was scanned and wait for the other
3. Once both are scanned, it will process the transaction
4. Status messages are displayed on the Mini PiTFT screen

## Status Messages

- "HDMI cable scanned... waiting for bin scan"
- "Cable checked back into bin x"
- "Error with bin" or "Cannot find item"
