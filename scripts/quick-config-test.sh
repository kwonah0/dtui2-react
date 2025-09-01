#!/bin/bash

# Quick Configuration Test - The two scenarios you just tested

echo "🚀 Quick DTUI2 Configuration Priority Tests"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "${GREEN}Test 1: Environment Variables Only${NC}"
echo "${YELLOW}DTUI_CFG__ai__shell__args='[\"[ENV_ONLY]:\"]\' npm run electron${NC}"
echo "Expected: Skip user config file, use env vars only"
echo "Look for: 'No DTUI_USER_CONFIGFILE specified, skipping user config file stage'"
echo ""
DTUI_CFG__ai__shell__command=echo \
DTUI_CFG__ai__shell__args='["[ENV_ONLY]:"]' \
DTUI_CFG__ai__shell__template='{command} {args} "{prompt}"' \
npm run electron

echo ""
echo "Press Enter to continue to Test 2..."
read

echo ""
echo "${GREEN}Test 2: User Config File + Environment Override${NC}" 
echo "${YELLOW}DTUI_USER_CONFIGFILE=dtui-hpc.json DTUI_CFG__ai__shell__args='[\"[USER+ENV]:\"]\' npm run electron${NC}"
echo "Expected: Load dtui-hpc.json, then override with env vars"
echo "Look for: 'Loaded user config file: dtui-hpc.json'"
echo ""
DTUI_USER_CONFIGFILE=dtui-hpc.json \
DTUI_CFG__ai__shell__command=echo \
DTUI_CFG__ai__shell__args='["[USER+ENV]:"]' \
DTUI_CFG__ai__shell__template='{command} {args} "{prompt}"' \
npm run electron

echo ""
echo "✅ Both tests completed!"