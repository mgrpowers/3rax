#!/usr/bin/env python3
"""
USB Scanner Service for Raspberry Pi
Reads from Zebra DS2208 (or any HID barcode scanner) via evdev
and publishes scans to NATS.
"""

import sys
import asyncio
import json
import logging
from datetime import datetime
from typing import Optional
import os

try:
    from nats.aio.client import Client as NATS
except ImportError:
    print("ERROR: nats-py not installed")
    print("Install with: pip install nats-py")
    sys.exit(1)

try:
    import evdev
    from evdev import InputDevice, categorize, ecodes
except ImportError:
    print("ERROR: evdev not installed")
    print("Install with: pip install evdev")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
NATS_URL = os.getenv('NATS_URL', 'nats://localhost:4222')
NATS_SUBJECT = os.getenv('NATS_SUBJECT', 'scanner.scans')
SCANNER_ID = os.getenv('SCANNER_ID', 'rpi-scanner-01')
# Set to a specific /dev/input/eventX path, or leave empty to auto-detect
SCANNER_DEVICE = os.getenv('SCANNER_DEVICE', '')

# evdev key code to character mapping
# KEY_* codes map to their character equivalents
KEY_MAP = {
    ecodes.KEY_1: ('1', '!'), ecodes.KEY_2: ('2', '@'), ecodes.KEY_3: ('3', '#'),
    ecodes.KEY_4: ('4', '$'), ecodes.KEY_5: ('5', '%'), ecodes.KEY_6: ('6', '^'),
    ecodes.KEY_7: ('7', '&'), ecodes.KEY_8: ('8', '*'), ecodes.KEY_9: ('9', '('),
    ecodes.KEY_0: ('0', ')'),
    ecodes.KEY_A: ('a', 'A'), ecodes.KEY_B: ('b', 'B'), ecodes.KEY_C: ('c', 'C'),
    ecodes.KEY_D: ('d', 'D'), ecodes.KEY_E: ('e', 'E'), ecodes.KEY_F: ('f', 'F'),
    ecodes.KEY_G: ('g', 'G'), ecodes.KEY_H: ('h', 'H'), ecodes.KEY_I: ('i', 'I'),
    ecodes.KEY_J: ('j', 'J'), ecodes.KEY_K: ('k', 'K'), ecodes.KEY_L: ('l', 'L'),
    ecodes.KEY_M: ('m', 'M'), ecodes.KEY_N: ('n', 'N'), ecodes.KEY_O: ('o', 'O'),
    ecodes.KEY_P: ('p', 'P'), ecodes.KEY_Q: ('q', 'Q'), ecodes.KEY_R: ('r', 'R'),
    ecodes.KEY_S: ('s', 'S'), ecodes.KEY_T: ('t', 'T'), ecodes.KEY_U: ('u', 'U'),
    ecodes.KEY_V: ('v', 'V'), ecodes.KEY_W: ('w', 'W'), ecodes.KEY_X: ('x', 'X'),
    ecodes.KEY_Y: ('y', 'Y'), ecodes.KEY_Z: ('z', 'Z'),
    ecodes.KEY_MINUS: ('-', '_'), ecodes.KEY_EQUAL: ('=', '+'),
    ecodes.KEY_LEFTBRACE: ('[', '{'), ecodes.KEY_RIGHTBRACE: (']', '}'),
    ecodes.KEY_SEMICOLON: (';', ':'), ecodes.KEY_APOSTROPHE: ("'", '"'),
    ecodes.KEY_GRAVE: ('`', '~'), ecodes.KEY_BACKSLASH: ('\\', '|'),
    ecodes.KEY_COMMA: (',', '<'), ecodes.KEY_DOT: ('.', '>'),
    ecodes.KEY_SLASH: ('/', '?'), ecodes.KEY_SPACE: (' ', ' '),
    ecodes.KEY_TAB: ('\t', '\t'),
}


def find_scanner_device() -> Optional[str]:
    """Auto-detect the Zebra DS2208 scanner from /dev/input/ devices."""
    devices = [evdev.InputDevice(path) for path in evdev.list_devices()]
    
    for device in devices:
        name_lower = device.name.lower()
        # Zebra DS2208 typically shows up with "Zebra" or "Symbol" in the name
        # (Symbol was acquired by Zebra Technologies)
        if any(keyword in name_lower for keyword in ['zebra', 'symbol', 'ds2208', 'barcode', 'scanner']):
            logger.info(f"Found scanner: {device.name} at {device.path}")
            return device.path
    
    # If no known scanner found, list all devices for debugging
    logger.warning("No Zebra/Symbol scanner auto-detected. Available devices:")
    for device in devices:
        caps = device.capabilities(verbose=True)
        has_keys = any('EV_KEY' in str(c) for c in caps)
        logger.warning(f"  {device.path}: {device.name} (phys={device.phys}, has_keys={has_keys})")
    
    # Fall back to the last device that has key events (likely the scanner)
    for device in reversed(devices):
        caps = device.capabilities()
        if ecodes.EV_KEY in caps:
            logger.info(f"Falling back to: {device.name} at {device.path}")
            return device.path
    
    return None


class ScannerService:
    def __init__(self):
        self.nc = NATS()
        self.running = False
        self.response_subject = f"scanner.response.{SCANNER_ID}"
        self.device: Optional[InputDevice] = None
        self.buffer = ''
        self.shift_held = False
        
    async def connect_nats(self):
        """Connect to NATS server"""
        try:
            await self.nc.connect(NATS_URL)
            logger.info(f"Connected to NATS at {NATS_URL}")
            
            # Subscribe to responses
            await self._subscribe_responses()
            
            return True
        except Exception as e:
            logger.error(f"Failed to connect to NATS: {e}")
            return False
    
    async def _subscribe_responses(self):
        """Subscribe to response messages from backend"""
        sub = await self.nc.subscribe(self.response_subject)
        
        async def handle_responses():
            async for msg in sub:
                try:
                    response = json.loads(msg.data.decode())
                    self._handle_response(response)
                except Exception as e:
                    logger.error(f"Error handling response: {e}")
        
        # Run in background
        asyncio.create_task(handle_responses())
        logger.info(f"Subscribed to responses: {self.response_subject}")
    
    def _handle_response(self, response: dict):
        """Handle response from backend"""
        if response.get('success'):
            operation = response.get('operation', 'transaction')
            if operation == 'checkin':
                item_name = response.get('item', {}).get('name', 'Item')
                bin_name = response.get('bin', {}).get('name', 'Bin')
                quantity = response.get('quantity', 1)
                logger.info(f"CHECK-IN: {item_name} -> {bin_name} (qty: {quantity})")
            elif operation == 'checkout':
                item_name = response.get('transaction', {}).get('item', {}).get('name', 'Item')
                bin_name = response.get('transaction', {}).get('bin', {}).get('name', 'Bin')
                remaining = response.get('remainingQuantity', 0)
                logger.info(f"CHECK-OUT: {item_name} <- {bin_name} (remaining: {remaining})")
        else:
            error = response.get('error', 'Unknown error')
            logger.error(f"TRANSACTION FAILED: {error}")
    
    async def publish_scan(self, scan_data: str):
        """Publish scan data to NATS"""
        try:
            message = {
                'scannerId': SCANNER_ID,
                'scanData': scan_data,
                'timestamp': datetime.utcnow().isoformat(),
                'type': self._detect_scan_type(scan_data)
            }
            
            payload = json.dumps(message).encode()
            await self.nc.publish(NATS_SUBJECT, payload)
            logger.info(f"Published scan: {scan_data[:80]}")
            
        except Exception as e:
            logger.error(f"Failed to publish scan: {e}")
    
    def _detect_scan_type(self, data: str) -> str:
        """Try to detect the type of scan"""
        try:
            parsed = json.loads(data)
            if 'type' in parsed:
                return parsed['type']
        except:
            pass
        
        # Simple heuristics
        if data.startswith('{') and data.endswith('}'):
            return 'json'
        elif len(data) == 13 and data.isdigit():
            return 'ean13'
        elif len(data) == 12 and data.isdigit():
            return 'upc'
        else:
            return 'unknown'
    
    def _open_device(self) -> bool:
        """Open the scanner input device."""
        device_path = SCANNER_DEVICE or find_scanner_device()
        
        if not device_path:
            logger.error("No scanner device found!")
            logger.error("List devices with: python3 -c \"import evdev; [print(d.path, d.name) for d in [evdev.InputDevice(p) for p in evdev.list_devices()]]\"")
            return False
        
        try:
            self.device = InputDevice(device_path)
            # Grab exclusive access so scans don't leak into the terminal
            self.device.grab()
            logger.info(f"Opened scanner: {self.device.name} ({device_path})")
            logger.info(f"Grabbed exclusive access to device")
            return True
        except PermissionError:
            logger.error(f"Permission denied for {device_path}")
            logger.error("Run as root or add a udev rule:")
            logger.error('  echo \'SUBSYSTEM=="input", ATTRS{{idVendor}}=="05e0", MODE="0666"\' | sudo tee /etc/udev/rules.d/99-scanner.rules')
            logger.error("  sudo udevadm control --reload-rules && sudo udevadm trigger")
            return False
        except Exception as e:
            logger.error(f"Failed to open device {device_path}: {e}")
            return False

    async def read_scanner_input(self):
        """Read input events from the USB scanner via evdev."""
        if not self.device:
            logger.error("No device opened")
            return

        logger.info("Listening for scans...")
        
        while self.running:
            try:
                async for event in self.device.async_read_loop():
                    if event.type != ecodes.EV_KEY:
                        continue
                    
                    key_event = categorize(event)
                    
                    # Track shift state
                    if key_event.scancode in (ecodes.KEY_LEFTSHIFT, ecodes.KEY_RIGHTSHIFT):
                        self.shift_held = key_event.keystate in (key_event.key_down, key_event.key_hold)
                        continue
                    
                    # Only process key-down events
                    if key_event.keystate != key_event.key_down:
                        continue
                    
                    # Enter key = end of scan
                    if key_event.scancode == ecodes.KEY_ENTER:
                        if self.buffer:
                            scan_data = self.buffer
                            self.buffer = ''
                            logger.info(f"Scanned: {scan_data}")
                            await self.publish_scan(scan_data)
                        continue
                    
                    # Map key code to character
                    if key_event.scancode in KEY_MAP:
                        char_pair = KEY_MAP[key_event.scancode]
                        char = char_pair[1] if self.shift_held else char_pair[0]
                        self.buffer += char
                        
            except OSError as e:
                logger.error(f"Device read error: {e}")
                logger.info("Scanner may have been disconnected. Waiting to reconnect...")
                self.device = None
                
                # Try to reconnect
                while self.running:
                    await asyncio.sleep(3)
                    if self._open_device():
                        logger.info("Scanner reconnected!")
                        break
                        
            except Exception as e:
                logger.error(f"Error reading scanner input: {e}")
                await asyncio.sleep(1)
    
    async def run(self):
        """Main run loop"""
        logger.info("=" * 60)
        logger.info("USB Scanner Service Starting")
        logger.info(f"  Device: Zebra DS2208 (evdev)")
        logger.info(f"  NATS URL: {NATS_URL}")
        logger.info(f"  NATS Subject: {NATS_SUBJECT}")
        logger.info(f"  Scanner ID: {SCANNER_ID}")
        if SCANNER_DEVICE:
            logger.info(f"  Device Path: {SCANNER_DEVICE}")
        else:
            logger.info(f"  Device Path: auto-detect")
        logger.info("=" * 60)
        
        # Connect to NATS
        if not await self.connect_nats():
            logger.error("Failed to connect to NATS. Exiting.")
            return
        
        # Open scanner device
        if not self._open_device():
            logger.error("Failed to open scanner device. Exiting.")
            await self.nc.close()
            return
        
        self.running = True
        
        try:
            await self.read_scanner_input()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.running = False
            if self.device:
                try:
                    self.device.ungrab()
                except:
                    pass
            await self.nc.close()
            logger.info("Scanner service stopped")


async def main():
    """Main entry point"""
    service = ScannerService()
    await service.run()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        sys.exit(0)
