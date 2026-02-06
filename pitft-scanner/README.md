# Raspberry Pi USB Scanner Service

A lightweight Python service that reads from a USB barcode/QR scanner and publishes scan events to NATS for real-time processing by the 3rax inventory backend.

## Overview

This service simplifies inventory management by:
- Reading USB scanner input (keyboard wedge style)
- Publishing scan events to NATS message broker
- Receiving transaction results from the backend
- Supporting multiple concurrent scanners

## Quick Start

See [SCANNER-QUICKSTART.md](../SCANNER-QUICKSTART.md) for a 5-minute setup guide.

## Hardware Requirements

- Raspberry Pi (any model with USB port)
- USB Barcode/QR Scanner (keyboard wedge type)
- Network connection to NATS server

## Software Requirements

- Python 3.7+
- NATS Server (can run on separate machine)
- Internet connection for initial setup

## Installation

### Quick Install

```bash
./install.sh
```

### Manual Install

```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Create configuration
cp .env.example .env
nano .env
```

## Configuration

Edit `.env`:

```bash
# NATS Server URL (replace with your server IP)
NATS_URL=nats://192.168.1.100:4222

# NATS subject for scan events
NATS_SUBJECT=scanner.scans

# Unique ID for this scanner
SCANNER_ID=rpi-scanner-01
```

## Usage

### Run Manually

```bash
python3 scanner.py
```

### Install as System Service

```bash
sudo ./install-service.sh
```

Then manage with systemd:
```bash
sudo systemctl start 3rax-scanner
sudo systemctl status 3rax-scanner
sudo systemctl stop 3rax-scanner
sudo journalctl -u 3rax-scanner -f  # View logs
```

## Workflow

1. **Scan an Item** - USB scanner sends QR/barcode data
2. **Scan a Bin** - Scanner sends bin QR code
3. **Backend Processes** - Transaction is created in database
4. **Feedback** - Scanner receives success/error message

Order doesn't matter - you can scan item first or bin first.

## QR Code Formats

### Item QR Code
```
ITEM-12345
```

### Bin QR Code (Check-in)
```json
{"type":"bin","id":"bin-uuid","operation":"checkin"}
```

### Bin QR Code (Check-out)
```json
{"type":"bin","id":"bin-uuid","operation":"checkout"}
```

## Documentation

- **[SCANNER-QUICKSTART.md](../SCANNER-QUICKSTART.md)** - Get started in 5 minutes
- **[SCANNER-SETUP.md](SCANNER-SETUP.md)** - Detailed setup and configuration guide

## Architecture

```
USB Scanner → scanner.py → NATS → Backend → Database
                             ↓
                        Response Queue
```

## Features

✅ Lightweight (~10-20MB RAM)  
✅ Auto-reconnect on network issues  
✅ Real-time transaction feedback  
✅ Support for multiple scanners  
✅ Sub-millisecond latency  
✅ Easy to deploy and maintain  

## Legacy Files

The following files are from the previous TFT display implementation and can be ignored:
- `index.js` - Old Node.js scanner service
- `display.py` - TFT display driver
- `test-*.py` - Display testing scripts
- `fix-spi.sh` - SPI configuration for TFT

These are kept for reference but not used in the current NATS-based implementation.
