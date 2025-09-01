#!/bin/bash

# DTUI2 Configuration Priority Testing Script
# Tests the 3-stage priority system: Environment > User Config File > Built-in Defaults

echo "🧪 DTUI2 Configuration Priority Test Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function show_menu() {
    echo "Select test scenario:"
    echo ""
    echo "${BLUE}1.${NC} Environment variables only (skip user config file)"
    echo "   ${YELLOW}DTUI_CFG__ai__shell__args='[\"[ENV_ONLY]:\"]\' npm run electron${NC}"
    echo ""
    echo "${BLUE}2.${NC} User config file + Environment override"  
    echo "   ${YELLOW}DTUI_USER_CONFIGFILE=dtui-hpc.json DTUI_CFG__ai__shell__command=echo npm run electron${NC}"
    echo ""
    echo "${BLUE}3.${NC} Built-in defaults only (no env vars, no user config)"
    echo "   ${YELLOW}npm run electron${NC}"
    echo ""
    echo "${BLUE}4.${NC} Custom user config file + Environment override"
    echo "   Creates temporary config file with custom settings"
    echo ""
    echo "${BLUE}5.${NC} Show current configuration (without launching app)"
    echo ""
    echo "${BLUE}q.${NC} Quit"
    echo ""
}

function test_env_only() {
    echo "${GREEN}🚀 Testing: Environment variables only${NC}"
    echo "Expected: Should skip user config file stage and use env vars"
    echo "Look for: 'No DTUI_USER_CONFIGFILE specified, skipping user config file stage'"
    echo "Expected output: [ENV_ONLY]: <your_message>"
    echo ""
    echo "Press Ctrl+C to stop the app when done testing..."
    echo ""
    
    DTUI_CFG__ai__shell__command=echo \
    DTUI_CFG__ai__shell__args='["[ENV_ONLY]:"]' \
    DTUI_CFG__ai__shell__template='{command} {args} "{prompt}"' \
    npm run electron
}

function test_user_config_with_env() {
    echo "${GREEN}🚀 Testing: User config file + Environment override${NC}"
    echo "Expected: Should load dtui-hpc.json, then override with env vars"  
    echo "Look for: 'Loaded user config file: dtui-hpc.json'"
    echo "Expected output: [HPC+ENV]: <your_message>"
    echo ""
    echo "Press Ctrl+C to stop the app when done testing..."
    echo ""
    
    DTUI_USER_CONFIGFILE=dtui-hpc.json \
    DTUI_CFG__ai__shell__command=echo \
    DTUI_CFG__ai__shell__args='["[HPC+ENV]:"]' \
    DTUI_CFG__ai__shell__template='{command} {args} "{prompt}"' \
    npm run electron
}

function test_defaults_only() {
    echo "${GREEN}🚀 Testing: Built-in defaults only${NC}"
    echo "Expected: Should use only built-in defaults"
    echo "Look for: 'No DTUI_USER_CONFIGFILE specified, skipping user config file stage'"
    echo "Expected output: [DTUI-SHELL]: <your_message>"
    echo ""
    echo "Press Ctrl+C to stop the app when done testing..."
    echo ""
    
    npm run electron
}

function test_custom_user_config() {
    echo "${GREEN}🚀 Testing: Custom user config file + Environment override${NC}"
    
    # Create temporary user config file
    TEMP_CONFIG="/tmp/dtui-test-$(date +%s).json"
    cat > "$TEMP_CONFIG" << 'EOF'
{
  "ai": {
    "provider": "shell",
    "shell": {
      "command": "printf",
      "args": ["[CUSTOM_USER_FILE]: %s\\n"],
      "template": "{command} {args}",
      "timeout": 8000,
      "outputFormat": {
        "useCodeBlock": true,
        "codeBlockSyntax": "bash"
      }
    }
  }
}
EOF
    
    echo "Created temporary config file: $TEMP_CONFIG"
    echo "Config contents:"
    echo "${YELLOW}$(cat $TEMP_CONFIG)${NC}"
    echo ""
    echo "Expected: Should load custom config, then override args with env var"
    echo "Look for: 'Loaded user config file: $TEMP_CONFIG'"
    echo "Expected output: [CUSTOM_OVERRIDE]: <your_message>"
    echo ""
    echo "Press Ctrl+C to stop the app when done testing..."
    echo ""
    
    DTUI_USER_CONFIGFILE="$TEMP_CONFIG" \
    DTUI_CFG__ai__shell__args='["[CUSTOM_OVERRIDE]:"]' \
    npm run electron
    
    # Clean up
    rm -f "$TEMP_CONFIG"
    echo ""
    echo "Cleaned up temporary config file: $TEMP_CONFIG"
}

function show_current_config() {
    echo "${GREEN}📋 Current Configuration Analysis${NC}"
    echo ""
    
    echo "${BLUE}Environment Variables (DTUI_CFG__*):${NC}"
    env | grep "^DTUI_CFG__" || echo "  None set"
    echo ""
    
    echo "${BLUE}User Config File Environment Variable:${NC}"
    if [ -n "$DTUI_USER_CONFIGFILE" ]; then
        echo "  DTUI_USER_CONFIGFILE=$DTUI_USER_CONFIGFILE"
        if [ -f "$DTUI_USER_CONFIGFILE" ]; then
            echo "  ${GREEN}✅ File exists${NC}"
        else
            echo "  ${RED}❌ File does not exist${NC}"
        fi
    else
        echo "  Not set (user config file stage will be skipped)"
    fi
    echo ""
    
    echo "${BLUE}Built-in Config Files:${NC}"
    if [ -f "dtui.json" ]; then
        echo "  dtui.json: ${GREEN}✅ exists${NC}"
    else
        echo "  dtui.json: ${RED}❌ missing${NC}"
    fi
    
    if [ -f "dtui-hpc.json" ]; then
        echo "  dtui-hpc.json: ${GREEN}✅ exists${NC}"
    else
        echo "  dtui-hpc.json: ${RED}❌ missing${NC}"
    fi
    echo ""
    
    echo "${BLUE}Priority Order:${NC}"
    echo "  1. Environment variables (DTUI_CFG__*) - ${YELLOW}Highest Priority${NC}"
    echo "  2. User config file (DTUI_USER_CONFIGFILE) - ${YELLOW}Medium Priority${NC}"
    echo "  3. Built-in defaults - ${YELLOW}Lowest Priority${NC}"
}

# Main loop
while true; do
    echo ""
    show_menu
    echo -n "Enter your choice (1-5, q): "
    read choice
    echo ""
    
    case $choice in
        1)
            test_env_only
            ;;
        2)
            test_user_config_with_env
            ;;
        3)
            test_defaults_only
            ;;
        4)
            test_custom_user_config
            ;;
        5)
            show_current_config
            ;;
        q|Q)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "${RED}❌ Invalid choice. Please select 1-5 or q.${NC}"
            ;;
    esac
    
    echo ""
    echo "Press Enter to return to menu..."
    read
done