#!/usr/bin/env python3
"""
Simple USB Scanner Service for Raspberry Pi
Reads from USB barcode scanner and publishes to NATS
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
    print("Install with: pip3 install nats-py")
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


class ScannerService:
    def __init__(self):
        self.nc = NATS()
        self.running = False
        self.response_subject = f"scanner.response.{SCANNER_ID}"
        
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
                logger.info(f"✅ CHECK-IN: {item_name} -> {bin_name} (qty: {quantity})")
            elif operation == 'checkout':
                item_name = response.get('transaction', {}).get('item', {}).get('name', 'Item')
                bin_name = response.get('transaction', {}).get('bin', {}).get('name', 'Bin')
                remaining = response.get('remainingQuantity', 0)
                logger.info(f"✅ CHECK-OUT: {item_name} <- {bin_name} (remaining: {remaining})")
        else:
            error = response.get('error', 'Unknown error')
            logger.error(f"❌ TRANSACTION FAILED: {error}")
    
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
            logger.info(f"Published scan: {scan_data[:50]}...")
            
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
    
    async def read_scanner_input(self):
        """Read input from USB scanner (keyboard input)"""
        logger.info("Starting scanner input reader...")
        logger.info("Scan a barcode or QR code to test...")
        
        # Use asyncio to read from stdin
        loop = asyncio.get_event_loop()
        
        while self.running:
            try:
                # Read a line from stdin (scanner sends data + Enter)
                line = await loop.run_in_executor(None, sys.stdin.readline)
                
                if not line:
                    # EOF reached
                    break
                
                scan_data = line.strip()
                if scan_data:
                    logger.info(f"Scanned: {scan_data}")
                    await self.publish_scan(scan_data)
                    
            except Exception as e:
                logger.error(f"Error reading scanner input: {e}")
                await asyncio.sleep(1)
    
    async def run(self):
        """Main run loop"""
        logger.info("=" * 60)
        logger.info("USB Scanner Service Starting")
        logger.info("=" * 60)
        logger.info(f"NATS URL: {NATS_URL}")
        logger.info(f"NATS Subject: {NATS_SUBJECT}")
        logger.info(f"Scanner ID: {SCANNER_ID}")
        logger.info("=" * 60)
        
        # Connect to NATS
        if not await self.connect_nats():
            logger.error("Failed to connect to NATS. Exiting.")
            return
        
        self.running = True
        
        try:
            # Start reading scanner input
            await self.read_scanner_input()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.running = False
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
