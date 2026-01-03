# CUPS Printing Setup

This guide explains how to set up CUPS (Common Unix Printing System) for printing QR code labels.

## Installation

### On Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install cups
```

### On Raspberry Pi OS:
```bash
sudo apt-get update
sudo apt-get install cups
```

## Configuration

### 1. Start CUPS Service

```bash
sudo systemctl start cups
sudo systemctl enable cups
```

### 2. Add User to lpadmin Group

```bash
sudo usermod -a -G lpadmin $USER
```

Log out and log back in for the group changes to take effect.

### 3. Access CUPS Web Interface

Open a web browser and navigate to:
```
http://localhost:631
```

Or from another machine on the network:
```
http://<raspberry-pi-ip>:631
```

### 4. Add Printer

1. Click on "Administration" tab
2. Click "Add Printer"
3. Select your printer connection type (USB, Network, etc.)
4. Follow the prompts to configure the printer
5. Install appropriate printer drivers if needed

### 5. Configure Label Printer Settings

For label printers, you may need to set custom paper sizes:

1. Go to "Administration" → "Manage Printers"
2. Select your printer
3. Click "Set Default Options"
4. Set paper size to match your labels (e.g., 1" x 1", 2" x 1")
5. Save settings

Alternatively, you can set paper size via command line:
```bash
lpoptions -p <printer-name> -o media=Custom.1x1in
```

## Testing

### List Printers
```bash
lpstat -p -d
```

### Print Test Page
```bash
echo "Test" | lp
```

### Print to Specific Printer
```bash
echo "Test" | lp -d <printer-name>
```

## Docker/Swarm Considerations

When running in Docker Swarm, you have several options for CUPS access:

### Option 1: Bind Mount CUPS Socket (Recommended for single-node printing)

In your docker-compose.yml:
```yaml
services:
  backend:
    volumes:
      - /var/run/cups/cups.sock:/var/run/cups/cups.sock:ro
```

Note: The container user must have permissions to access the socket.

### Option 2: Network Printing

If your printer is accessible over the network:
- No special configuration needed in Docker
- Ensure the printer is accessible from the container network
- Use the printer's IP address when adding it to CUPS

### Option 3: CUPS Service in Docker

Run CUPS as a separate service in your Docker Swarm:
- Share the CUPS socket via a volume
- Other services can connect to it

## Permissions

If you encounter permission errors:

1. Check CUPS socket permissions:
```bash
ls -l /var/run/cups/cups.sock
```

2. Add user to lp and lpadmin groups:
```bash
sudo usermod -a -G lp,lpadmin $USER
```

3. For Docker, you may need to run the container with appropriate user ID:
```yaml
services:
  backend:
    user: "1000:1000"  # Match your host user ID
```

## Troubleshooting

### Printer Not Found
- Verify printer is connected and powered on
- Check `lpstat -p -d` to see available printers
- Ensure CUPS service is running: `sudo systemctl status cups`

### Permission Denied
- Ensure user is in lpadmin group
- Check CUPS socket permissions
- Verify Docker container has access to CUPS socket

### Print Jobs Not Processing
- Check CUPS error log: `sudo tail -f /var/log/cups/error_log`
- Verify printer is not paused: `cupsenable <printer-name>`
- Check printer status: `lpstat -p <printer-name>`

## API Usage

The printing service can be used via the API:

### Print Bin QR Code
```bash
POST /api/bins/:binId/qr/print
{
  "printerName": "optional-printer-name",
  "labelSize": "1x1",
  "operation": "checkin"
}
```

### Print Item QR Code
```bash
POST /api/items/:itemId/qr/print
{
  "printerName": "optional-printer-name",
  "labelSize": "1x1"
}
```

If `printerName` is not provided, the system will use the default printer.

