#!/bin/bash

# Test with environment variables only
echo "🚀 Testing with environment variables only"
echo "=========================================="

echo "Environment variables:"
echo "  DTUI_CFG__ai__shell__command=echo"
echo "  DTUI_CFG__ai__shell__args='[\"[ENV_VARS_ONLY]:\"]'"
echo "  DTUI_CFG__ai__shell__template='{command} {args} \"{prompt}\"'"
echo ""
echo "Expected output: [ENV_VARS_ONLY]: <your_message>"
echo "Look for: 'No DTUI_USER_CONFIGFILE specified, skipping user config file stage'"
echo ""
echo "Press Ctrl+C to stop the app when done testing..."
echo ""

# Launch with environment variables only
DTUI_CFG__ai__shell__command=echo \
DTUI_CFG__ai__shell__args='["[ENV_VARS_ONLY]:"]' \
DTUI_CFG__ai__shell__template='{command} {args} "{prompt}"' \
npm run electron