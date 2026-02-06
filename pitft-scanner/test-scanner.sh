#!/bin/bash
# Test script for scanner service
# This simulates scanner input by piping test data

echo "================================"
echo "Scanner Service Test"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "Run: cp .env.example .env"
    exit 1
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs)

echo "Configuration:"
echo "  NATS URL: $NATS_URL"
echo "  Subject: $NATS_SUBJECT"
echo "  Scanner ID: $SCANNER_ID"
echo ""

# Test 1: Simple item scan
echo "Test 1: Item scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST-ITEM-001" | python3 scanner.py &
PID=$!
sleep 2
kill $PID 2>/dev/null
echo ""

# Test 2: JSON item scan
echo "Test 2: JSON item scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo '{"type":"item","qrCode":"TEST-ITEM-002"}' | python3 scanner.py &
PID=$!
sleep 2
kill $PID 2>/dev/null
echo ""

# Test 3: Bin check-in scan
echo "Test 3: Bin check-in scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo '{"type":"bin","id":"test-bin-123","operation":"checkin"}' | python3 scanner.py &
PID=$!
sleep 2
kill $PID 2>/dev/null
echo ""

echo "================================"
echo "Tests complete!"
echo "================================"
echo ""
echo "If you saw 'Connected to NATS' messages, the scanner is working correctly."
echo ""
echo "To run the scanner normally:"
echo "  python3 scanner.py"
echo ""
