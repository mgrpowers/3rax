# Raspberry Pi USB Scanner Setup

This is a simplified scanner service that reads from a USB barcode/QR scanner and publishes scan events to NATS for processing by the 3rax backend.

## Architecture

```
USB Scanner → Raspberry Pi → NATS → 3rax Backend → Database
                  ↓                      ↓
               scanner.py           natsService.ts
```

## Requirements

### Hardware
- Raspberry Pi (any model with USB port)
- USB Barcode/QR Scanner (keyboard wedge type)
- Network connection to NATS server

### Software
- Python 3.7+
- NATS Server
- Node.js (for backend)

## Setup

### 1. Install NATS Server

On your server (can be the same machine as backend):

```bash
# Using Docker (recommended)
docker run -d --name nats -p 4222:4222 nats:latest

# Or install natively
# macOS:
brew install nats-server

# Linux:
curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.7/nats-server-v2.10.7-linux-amd64.tar.gz -o nats-server.tar.gz
tar -xzf nats-server.tar.gz
sudo mv nats-server-v2.10.7-linux-amd64/nats-server /usr/local/bin/
```

Start NATS:
```bash
nats-server
```

### 2. Setup Raspberry Pi Scanner

On your Raspberry Pi:

```bash
# Navigate to scanner directory
cd /path/to/3rax/pitft-scanner

# Install Python dependencies
pip3 install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env with your settings
nano .env
```

Configure `.env`:
```bash
# NATS Server URL (replace with your server IP)
NATS_URL=nats://192.168.1.100:4222

# NATS subject for scan events
NATS_SUBJECT=scanner.scans

# Unique ID for this scanner
SCANNER_ID=rpi-scanner-01
```

### 3. Configure Backend

In your backend `.env`:

```bash
# Add NATS configuration
NATS_URL=nats://localhost:4222
NATS_SUBJECT=scanner.scans
```

## Usage

### Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3001
Connecting to NATS...
✅ Connected to NATS at nats://localhost:4222
📡 Subscribed to scanner.scans
Scanner event listener active
```

### Start the Scanner Service

On the Raspberry Pi:

```bash
cd pitft-scanner
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

### Scanning Workflow

1. **Scan an Item QR Code**
   - Scanner sends the QR code data
   - Service publishes to NATS
   - Backend receives and waits for bin scan

2. **Scan a Bin QR Code** (check-in or check-out)
   - Scanner sends the bin QR code
   - Service publishes to NATS
   - Backend processes the transaction
   - Response is sent back to scanner

3. **View Results**
   - Scanner logs show transaction status
   - Backend logs show database updates
   - Frontend shows updated inventory

## Testing

### Test Scanner Input

```bash
# Manually type or paste QR data and press Enter
echo "TEST-ITEM-001" | python3 scanner.py
```

### Test with Mock Data

```bash
# Test item scan
echo '{"type":"item","qrCode":"TEST-ITEM-001"}' | python3 scanner.py

# Test bin check-in
echo '{"type":"bin","id":"bin-uuid-here","operation":"checkin"}' | python3 scanner.py
```

## Systemd Service (Auto-start)

Create `/etc/systemd/system/scanner.service`:

```ini
[Unit]
Description=3rax USB Scanner Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/3rax/pitft-scanner
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/python3 /home/pi/3rax/pitft-scanner/scanner.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable scanner.service
sudo systemctl start scanner.service
sudo systemctl status scanner.service
```

View logs:
```bash
sudo journalctl -u scanner.service -f
```

## QR Code Formats

### Item QR Code
Simple string:
```
ITEM-12345
```

Or JSON format:
```json
{
  "type": "item",
  "qrCode": "ITEM-12345"
}
```

### Bin QR Code (Check-in)
```json
{
  "type": "bin",
  "id": "bin-uuid-from-database",
  "operation": "checkin"
}
```

### Bin QR Code (Check-out)
```json
{
  "type": "bin",
  "id": "bin-uuid-from-database",
  "operation": "checkout"
}
```

## Troubleshooting

### Scanner not detected

```bash
# Check USB devices
lsusb

# Check input devices
ls -l /dev/input/by-id/

# Test scanner manually
cat /dev/input/by-id/usb-*-kbd
# (scan something, you should see output)
```

### NATS connection failed

```bash
# Check NATS server is running
nc -zv <nats-server-ip> 4222

# Check firewall
sudo ufw allow 4222

# Test NATS connection
telnet <nats-server-ip> 4222
```

### Scans not processing

1. Check backend logs - is it receiving scans?
2. Check scanner logs - is it publishing?
3. Verify NATS subject matches in both services
4. Check database - do items/bins exist?

## Multiple Scanners

To run multiple scanners, give each a unique `SCANNER_ID` in `.env`:

```bash
# Scanner 1
SCANNER_ID=warehouse-scanner-01

# Scanner 2
SCANNER_ID=warehouse-scanner-02
```

Each scanner will receive its own responses on its own subject.

## Performance

- The scanner service is lightweight (~10-20MB RAM)
- NATS has very low latency (<1ms typically)
- Can handle hundreds of scans per second
- Scales horizontally by adding more scanners

## Security Notes

1. **Network**: NATS should be on a private network or use TLS
2. **Authentication**: Consider adding NATS authentication in production
3. **Validation**: Backend validates all scans before processing

## Next Steps

- Add audio/visual feedback on scanner device
- Implement offline queue for network outages
- Add scan history/logging to database
- Create admin dashboard for scanner management
