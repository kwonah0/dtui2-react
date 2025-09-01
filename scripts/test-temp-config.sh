#!/bin/bash

# Test with temporary custom config file
echo "🧪 Testing with temporary custom config file"
echo "============================================"

# Create temporary config file
TEMP_CONFIG="/tmp/dtui-temp-config-$(date +%s).json"
cat > "$TEMP_CONFIG" << 'EOF'
{
  "ai": {
    "provider": "shell",
    "shell": {
      "command": "echo",
      "args": ["[TEMP_CUSTOM_FILE]:"],
      "template": "{command} {args} \"{prompt}\"",
      "timeout": 12000,
      "outputFormat": {
        "useCodeBlock": true,
        "codeBlockSyntax": "bash"
      }
    }
  }
}
EOF

echo "Created temporary config: $TEMP_CONFIG"
echo "Config contents:"
echo "$(cat $TEMP_CONFIG)"
echo ""
echo "Expected output: [TEMP_CUSTOM_FILE]: <your_message>"
echo "Look for: 'Loaded user config file: $TEMP_CONFIG'"
echo ""
echo "Press Ctrl+C to stop the app when done testing..."
echo ""

# Launch with temporary config
DTUI_USER_CONFIGFILE="$TEMP_CONFIG" npm run electron

# Clean up
echo ""
echo "Cleaning up temporary config file: $TEMP_CONFIG"
rm -f "$TEMP_CONFIG"
echo "✅ Cleanup completed"