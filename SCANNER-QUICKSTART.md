# Scanner Quick Start Guide

This guide will get you up and running with the USB scanner system in 5 minutes.

## Prerequisites

- Raspberry Pi with Raspbian/Raspberry Pi OS
- USB Barcode/QR Scanner
- Network connectivity
- 3rax backend already running

## Quick Setup

### 1. Install NATS Server

On your backend server (or any machine accessible from the Pi):

```bash
# Using Docker (easiest)
docker run -d --name nats -p 4222:4222 nats:latest

# Check it's running
docker ps | grep nats
```

### 2. Setup Raspberry Pi

On your Raspberry Pi:

```bash
# Clone or copy the project
cd /home/pi
# (assuming you already have the code)

# Navigate to scanner directory
cd 3rax/pitft-scanner

# Run installer
./install.sh

# Edit configuration
nano .env
```

Update `.env`:
```bash
NATS_URL=nats://YOUR-SERVER-IP:4222  # Change to your server IP
NATS_SUBJECT=scanner.scans
SCANNER_ID=rpi-scanner-01            # Give it a unique name
```

### 3. Update Backend

On your backend server:

```bash
cd backend

# .env should already have NATS config added
# If not, add these lines:
echo "NATS_URL=nats://localhost:4222" >> .env
echo "NATS_SUBJECT=scanner.scans" >> .env

# Restart backend
npm run dev
```

### 4. Test It

On Raspberry Pi:

```bash
cd /home/pi/3rax/pitft-scanner
python3 scanner.py
```

You should see:
```
============================================================
USB Scanner Service Starting
============================================================
NATS URL: nats://192.168.1.100:4222
NATS Subject: scanner.scans
Scanner ID: rpi-scanner-01
============================================================
Connected to NATS at nats://192.168.1.100:4222
Subscribed to responses: scanner.response.rpi-scanner-01
Starting scanner input reader...
Scan a barcode or QR code to test...
```

On backend, you should see:
```
✅ Connected to NATS at nats://localhost:4222
📡 Subscribed to scanner.scans
Scanner event listener active
```

### 5. Scan Something!

1. Create a test item in the 3rax frontend
2. Print/display the item QR code
3. Scan it with your USB scanner
4. Scanner should log: `📱 Scan received: ...`
5. Create a bin QR code and scan it
6. Backend should process the transaction!

## Install as Service (Optional)

To make the scanner start automatically on boot:

```bash
sudo ./install-service.sh
```

## Troubleshooting

### "Failed to connect to NATS"

Check NATS is running and accessible:
```bash
# From Raspberry Pi, test connection to NATS server
nc -zv YOUR-SERVER-IP 4222

# If connection refused, check firewall:
sudo ufw allow 4222  # On server
```

### Scanner not responding

Test the scanner manually:
```bash
# Check USB device is detected
lsusb

# Test scanner input (press Ctrl+C to exit)
cat > /dev/null
# (scan something, you should see it appear)
```

### Scans not processing

1. Check backend logs - look for NATS messages
2. Verify items/bins exist in database
3. Check QR code format matches expected format

## Next Steps

- Read full docs: `SCANNER-SETUP.md`
- Configure multiple scanners
- Set up systemd service for auto-start
- Monitor with `journalctl -u 3rax-scanner -f`

## Architecture

```
┌─────────────────┐
│  USB Scanner    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Raspberry Pi   │─────→│  NATS Server │←─────│  3rax Backend   │
│  scanner.py     │      │  (Port 4222) │      │  natsService.ts │
└─────────────────┘      └──────────────┘      └────────┬────────┘
                                                          │
                                                          ↓
                                                  ┌───────────────┐
                                                  │   PostgreSQL  │
                                                  └───────────────┘
```

## Key Features

✅ Real-time scanning and processing  
✅ Automatic reconnection on network issues  
✅ Transaction feedback to scanner  
✅ Support for multiple concurrent scanners  
✅ Lightweight and fast (~1ms latency)  
✅ Easy to deploy and maintain  

## Support

For detailed documentation, see `SCANNER-SETUP.md`
