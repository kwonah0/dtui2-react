#!/usr/bin/env node

// Direct test of shell command execution with PTY
const { spawn } = require('child_process');
const Convert = require('ansi-to-html');

const convert = new Convert({
  fg: '#fff',
  bg: '#000'
});

console.log('🧪 Testing PTY shell command execution directly...');

// Test the same script command that main.js uses
const usePtyEmulation = process.platform !== 'win32' && require('fs').existsSync('/usr/bin/script');
console.log('PTY emulation available:', usePtyEmulation);

if (usePtyEmulation) {
  console.log('🧪 Testing script command for PTY emulation...');
  
  const command = 'ls --color=always';
  const scriptCommand = `script -qc "${command.replace(/"/g, '\\"')}" /dev/null`;
  
  console.log('Executing:', scriptCommand);
  
  const testProcess = spawn(scriptCommand, [], { 
    shell: true,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      COLUMNS: '80',
      LINES: '24'
    },
    cwd: process.cwd()
  });
  
  let stdout = '';
  let stderr = '';
  
  testProcess.stdout.on('data', (data) => {
    const output = data.toString();
    stdout += output;
    console.log('📤 Raw stdout:', JSON.stringify(output));
    console.log('📤 Formatted stdout:', output);
  });
  
  testProcess.stderr.on('data', (data) => {
    const output = data.toString();
    stderr += output;
    console.log('📤 Raw stderr:', JSON.stringify(output));
  });
  
  testProcess.on('close', (code) => {
    console.log('✅ Process completed with code:', code);
    console.log('📊 Full stdout:', JSON.stringify(stdout));
    console.log('📊 Full stderr:', JSON.stringify(stderr));
    
    if (stdout) {
      console.log('🎨 ANSI to HTML conversion:');
      const htmlOutput = convert.toHtml(stdout);
      console.log(htmlOutput);
      
      // Check if we have ANSI color codes
      const hasAnsiColors = /\u001b\[\d+m/.test(stdout);
      console.log('🎨 Contains ANSI colors:', hasAnsiColors);
      
      // Check if output is multi-column (typical ls behavior)
      const lines = stdout.split('\n').filter(line => line.trim());
      const hasMultiColumn = lines.some(line => line.includes('  ') || line.includes('\t'));
      console.log('📋 Multi-column format detected:', hasMultiColumn);
    }
  });
} else {
  console.log('❌ PTY emulation not available on this platform');
}