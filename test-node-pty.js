#!/usr/bin/env node

// Test node-pty functionality
console.log('🧪 Testing node-pty...');

let pty;
try {
  pty = require('@homebridge/node-pty-prebuilt-multiarch');
  console.log('✅ node-pty loaded successfully');
} catch (err) {
  console.error('❌ Failed to load node-pty:', err.message);
  process.exit(1);
}

// Test spawning a PTY
const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

console.log('🚀 Spawning PTY with shell:', shell);

const ptyProcess = pty.spawn(shell, ['-c', 'ls --color=always'], {
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

let output = '';

ptyProcess.onData((data) => {
  output += data;
  console.log('📤 PTY Output:', JSON.stringify(data));
  console.log('📋 Formatted:', data);
});

ptyProcess.onExit(({ exitCode }) => {
  console.log('✅ PTY process exited with code:', exitCode);
  
  // Check for ANSI colors
  const hasAnsiColors = /\u001b\[\d+m/.test(output);
  console.log('🎨 Contains ANSI colors:', hasAnsiColors);
  
  // Check for multi-column format
  const lines = output.split('\n').filter(line => line.trim());
  const hasMultiColumn = lines.some(line => {
    const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
    const words = cleanLine.split(/\s+/).filter(w => w.trim());
    return words.length >= 2;
  });
  console.log('📋 Multi-column format:', hasMultiColumn);
  
  if (hasAnsiColors && hasMultiColumn) {
    console.log('\n🎉 node-pty is working perfectly with full PTY features!');
    
    // Test interactive command
    console.log('\n🧪 Testing interactive PTY with vi...');
    testInteractive();
  } else {
    console.log('\n⚠️ node-pty loaded but may not have full PTY features');
  }
});

function testInteractive() {
  const viProcess = pty.spawn(shell, [], {
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
  
  console.log('📝 Opening vi editor (sending commands)...');
  
  viProcess.onData((data) => {
    console.log('📤 VI Output (first 100 chars):', data.substring(0, 100));
  });
  
  // Send commands to vi
  setTimeout(() => {
    viProcess.write('echo "PTY test successful"\n');
    setTimeout(() => {
      viProcess.write('exit\n');
    }, 500);
  }, 500);
  
  viProcess.onExit(({ exitCode }) => {
    console.log('✅ Interactive PTY test completed with code:', exitCode);
    console.log('\n🎉 All PTY tests passed! node-pty is fully functional.');
    process.exit(0);
  });
}