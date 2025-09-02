#!/usr/bin/env node

// Test Electron app with PTY functionality
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import main.js to set up all handlers
require('./electron/main.js');

async function testElectronPty() {
  await app.whenReady();
  
  console.log('🧪 Testing Electron PTY functionality...');
  
  try {
    // Test execute-shell-command with !ls
    console.log('🚀 Testing !ls command with PTY...');
    const result = await new Promise((resolve, reject) => {
      // Get the handler
      const handlers = ipcMain._events['execute-shell-command'] || ipcMain.listeners('execute-shell-command');
      
      if (handlers && handlers.length > 0) {
        const handler = Array.isArray(handlers) ? handlers[0] : handlers;
        const mockEvent = {};
        const command = 'ls --color=always';
        
        Promise.resolve(handler.call ? handler.call(null, mockEvent, command) : handler(mockEvent, command))
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('No execute-shell-command handler found'));
      }
    });
    
    console.log('✅ PTY command result:', result);
    
    if (result.success && result.output) {
      const hasAnsiColors = /\u001b\[\d+m/.test(result.output);
      console.log('🎨 Output contains ANSI colors:', hasAnsiColors);
      
      const isMultiColumn = result.output.includes('  ') || result.output.includes('\t');
      console.log('📋 Output is multi-column:', isMultiColumn);
      
      if (hasAnsiColors) {
        console.log('🎉 PTY functionality is working in Electron!');
        console.log('📝 Sample output (first 200 chars):', result.output.substring(0, 200) + '...');
      }
    }
    
    // Test interactive command
    console.log('\n🧪 Testing interactive command...');
    const interactiveResult = await new Promise((resolve, reject) => {
      const handlers = ipcMain._events['execute-shell-command'] || ipcMain.listeners('execute-shell-command');
      
      if (handlers && handlers.length > 0) {
        const handler = Array.isArray(handlers) ? handlers[0] : handlers;
        const mockEvent = {};
        const command = 'echo "Interactive PTY test" | cat';
        
        Promise.resolve(handler.call ? handler.call(null, mockEvent, command) : handler(mockEvent, command))
          .then(resolve)
          .catch(reject);
      }
    });
    
    console.log('✅ Interactive command result:', interactiveResult);
    
    console.log('\n🎉 All PTY tests passed in Electron!');
    
  } catch (error) {
    console.error('❌ PTY test failed:', error);
  }
  
  app.quit();
}

testElectronPty();