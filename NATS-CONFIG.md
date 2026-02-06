# NATS Configuration

## NATS Server Details

**Address**: `192.168.50.118:4222`

This NATS server is used for real-time communication between the scanner service and the 3rax backend.

## Configuration Files

### Backend Configuration

**File**: `backend/.env`

```bash
NATS_URL=nats://192.168.50.118:4222
NATS_SUBJECT=scanner.scans
```

### Scanner Configuration (Raspberry Pi)

**File**: `pitft-scanner/.env`

```bash
NATS_URL=nats://192.168.50.118:4222
NATS_SUBJECT=scanner.scans
SCANNER_ID=rpi-scanner-01
```

**Note**: Change `SCANNER_ID` for each scanner device to ensure unique identification.

## Testing NATS Connection

### From Backend Server

```bash
# Test TCP connection
nc -zv 192.168.50.118 4222

# Or use telnet
telnet 192.168.50.118 4222
```

### From Raspberry Pi

```bash
# Test TCP connection
nc -zv 192.168.50.118 4222

# Start the scanner service (it will attempt to connect)
cd pitft-scanner
python3 scanner.py
```

You should see:
```
Connected to NATS at nats://192.168.50.118:4222
Subscribed to responses: scanner.response.rpi-scanner-01
```

### Backend Connection

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3001
Connecting to NATS...
✅ Connected to NATS at nats://192.168.50.118:4222
📡 Subscribed to scanner.scans
Scanner event listener active
```

## Troubleshooting

### Connection Refused

If you get "Connection refused":
1. Verify NATS server is running at 192.168.50.118
2. Check firewall rules allow port 4222
3. Ensure both backend and scanner can reach the NATS server

### Firewall Configuration

On the NATS server machine, allow incoming connections:

```bash
# Ubuntu/Debian
sudo ufw allow 4222/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=4222/tcp
sudo firewall-cmd --reload

# macOS
# Add firewall rule in System Preferences > Security & Privacy > Firewall
```

### Verify NATS Server Status

If you have access to the NATS server:

```bash
# Check if NATS is listening
netstat -tuln | grep 4222

# Or using lsof
lsof -i :4222

# Check NATS stats (if monitoring enabled)
curl http://192.168.50.118:8222/varz
```

## Network Architecture

```
┌─────────────────┐
│  Raspberry Pi   │
│  Scanner        │
│  192.168.50.x   │
└────────┬────────┘
         │
         ↓
┌─────────────────────┐
│  NATS Server        │
│  192.168.50.118     │
│  Port: 4222         │
└────────┬────────────┘
         │
         ↓
┌─────────────────┐
│  Backend Server │
│  192.168.50.x   │
│  Port: 3001     │
└─────────────────┘
```

## Message Flow

1. **Scanner → NATS**: Publishes scan events to `scanner.scans`
2. **NATS → Backend**: Backend consumes from `scanner.scans`
3. **Backend → NATS**: Publishes responses to `scanner.response.{scannerId}`
4. **NATS → Scanner**: Scanner receives transaction results

## Security Notes

- NATS server is currently running without authentication
- For production, consider enabling NATS authentication and TLS
- Ensure NATS server is only accessible on trusted network
- Consider using VPN if scanners are on different networks

## Adding Authentication (Optional)

If you want to secure your NATS server:

1. **Configure NATS with authentication** (`nats-server.conf`):
```
authorization {
  user: scanner
  password: your-secure-password
}
```

2. **Update connection strings**:
```bash
# Backend and Scanner .env
NATS_URL=nats://scanner:your-secure-password@192.168.50.118:4222
```

## Multiple Scanners

Each scanner should have a unique `SCANNER_ID`:

```bash
# Scanner 1
SCANNER_ID=warehouse-scanner-01

# Scanner 2  
SCANNER_ID=warehouse-scanner-02

# Scanner 3
SCANNER_ID=shipping-scanner-01
```

This ensures:
- Each scanner receives only its own responses
- Backend can track which scanner made which transaction
- Easy debugging and monitoring per device
