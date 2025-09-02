#!/usr/bin/env node

// Test the execute-command-with-output handler directly
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing shell output capture...');

// Launch Electron with test mode
const electronProcess = spawn('electron', [path.join(__dirname, 'electron/main.js')], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    ELECTRON_DISABLE_GPU: '1'
  }
});

let output = '';

electronProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('[ELECTRON STDOUT]', text.trim());
});

electronProcess.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('[ELECTRON STDERR]', text.trim());
});

electronProcess.on('close', (code) => {
  console.log(`\n📊 Electron process exited with code: ${code}`);
  console.log('📊 Full output length:', output.length);
  
  // Check for node-pty loading
  const hasPtyLoad = output.includes('node-pty loaded successfully');
  const hasShellSession = output.includes('Shell agent test result');
  
  console.log('✅ node-pty loaded:', hasPtyLoad);
  console.log('✅ Shell session working:', hasShellSession);
});

// Kill after 10 seconds
setTimeout(() => {
  console.log('🔄 Killing Electron process...');
  electronProcess.kill();
}, 10000);