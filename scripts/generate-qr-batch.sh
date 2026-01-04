#!/bin/bash

# Generate a batch of QR codes for labeling cables/items
# Usage: ./scripts/generate-qr-batch.sh [count] [prefix]
# Example: ./scripts/generate-qr-batch.sh 20 cable

COUNT=${1:-10}
PREFIX=${2:-"item"}
API_URL=${API_URL:-"http://localhost:3001"}

echo "Generating batch of $COUNT QR codes with prefix '$PREFIX'..."
echo "API URL: $API_URL"

response=$(curl -s -X POST "$API_URL/api/qr/batch/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"count\": $COUNT,
    \"prefix\": \"$PREFIX\",
    \"twoPerLabel\": true
  }")

if [ $? -eq 0 ]; then
  batch_id=$(echo "$response" | grep -o '"batchId":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$batch_id" ]; then
    echo ""
    echo "✅ Batch generated successfully!"
    echo "Batch ID: $batch_id"
    echo ""
    echo "Response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
    echo "To print this batch, use:"
    echo "  curl -X POST $API_URL/api/qr/batch/print \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -d '{\"batchId\": \"$batch_id\", \"printerName\": \"YOUR_PRINTER\", \"labelSize\": \"avery5267\"}'"
    echo ""
    echo "To preview this batch, visit:"
    echo "  $API_URL/api/qr/batch/$batch_id/preview"
  else
    echo "❌ Error: Could not parse batch ID from response"
    echo "Response: $response"
    exit 1
  fi
else
  echo "❌ Error: Failed to generate batch"
  exit 1
fi

