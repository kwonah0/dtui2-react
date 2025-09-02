#!/usr/bin/env node

// Test PTY shell command execution
const { app, BrowserWindow, ipcMain } = require('electron');

// Import main.js handlers
require('./electron/main.js');

async function testPtyShell() {
  await app.whenReady();
  
  console.log('🧪 Testing PTY shell command execution...');
  
  try {
    // Simulate the IPC call that would happen when user types !ls
    const result = await require('electron').ipcMain.emit('execute-shell-command', {}, 'ls --color=always');
    console.log('✅ execute-shell-command result:', result);
  } catch (error) {
    console.error('❌ execute-shell-command failed:', error);
  }
  
  setTimeout(() => {
    app.quit();
  }, 2000);
}

testPtyShell();