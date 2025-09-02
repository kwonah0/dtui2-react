#!/usr/bin/env node

// Direct test of the PTY functionality in main.js without UI
const { ipcMain } = require('electron');

// Mock Electron app and main window for testing
const mockApp = {
  whenReady: () => Promise.resolve(),
  on: () => {},
  quit: () => process.exit(0)
};

const mockMainWindow = {
  webContents: {
    send: (channel, data) => {
      console.log('📤 IPC Send:', channel, data);
    }
  }
};

// Override electron modules
const electronMock = {
  app: mockApp,
  BrowserWindow: class {
    constructor() { return mockMainWindow; }
  },
  ipcMain,
  dialog: {}
};

// Mock require to return our electron mock
const originalRequire = require;
require = function(id) {
  if (id === 'electron') {
    return electronMock;
  }
  return originalRequire.apply(this, arguments);
};

// Now import main.js which will set up the IPC handlers
console.log('🧪 Loading main.js...');
require('./electron/main.js');

console.log('🧪 Testing execute-shell-command handler...');

async function testPtyShellCommand() {
  try {
    // Test the IPC handler directly
    const result = await new Promise((resolve, reject) => {
      // Simulate IPC call
      const mockEvent = {};
      const command = 'ls --color=always';
      
      console.log('🚀 Calling execute-shell-command with:', command);
      
      // Get the handler
      const handlers = ipcMain._events['execute-shell-command'] || ipcMain.listeners('execute-shell-command');
      
      if (handlers && handlers.length > 0) {
        const handler = Array.isArray(handlers) ? handlers[0] : handlers;
        
        // Call the handler
        Promise.resolve(handler.call ? handler.call(null, mockEvent, command) : handler(mockEvent, command))
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('No execute-shell-command handler found'));
      }
    });
    
    console.log('✅ execute-shell-command result:', result);
    
    // Check if the result indicates PTY formatting
    if (result.success && result.output) {
      const hasAnsiColors = /\u001b\[\d+m/.test(result.output);
      console.log('🎨 Output contains ANSI colors:', hasAnsiColors);
      
      const isMultiColumn = result.output.includes('  ') || result.output.includes('\t');
      console.log('📋 Output is multi-column:', isMultiColumn);
      
      if (hasAnsiColors && isMultiColumn) {
        console.log('🎉 PTY formatting is working correctly!');
        console.log('📝 Sample output:', result.output.substring(0, 200) + '...');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testPtyShellCommand().then(success => {
  console.log(success ? '🎉 PTY test PASSED' : '❌ PTY test FAILED');
  process.exit(success ? 0 : 1);
});

// Restore original require
require = originalRequire;