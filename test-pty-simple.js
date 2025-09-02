#!/usr/bin/env node

// Simple direct test of node-pty with ls command
const pty = require('@homebridge/node-pty-prebuilt-multiarch');

console.log('🧪 Simple node-pty test with ls command...');

const shellSession = pty.spawn('/bin/bash', [], {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor'
  }
});

let allOutput = '';
let commandSent = false;

shellSession.onData((data) => {
  allOutput += data;
  console.log('[PTY]', JSON.stringify(data));
  
  // Wait for shell prompt, then send command
  if (!commandSent && (data.includes('$') || data.includes('#'))) {
    console.log('🚀 Shell prompt detected, sending ls command...');
    commandSent = true;
    setTimeout(() => {
      shellSession.write('ls -la\n');
    }, 500);
  }
});

shellSession.onExit((exitInfo) => {
  console.log('📊 PTY exited with:', exitInfo);
  console.log('📊 Total output length:', allOutput.length);
  console.log('📊 Output contains package.json:', allOutput.includes('package.json'));
  console.log('📊 Output contains src:', allOutput.includes('src'));
});

// Kill after 8 seconds
setTimeout(() => {
  console.log('🔄 Killing PTY...');
  shellSession.write('exit\n');
  setTimeout(() => shellSession.kill(), 1000);
}, 8000);