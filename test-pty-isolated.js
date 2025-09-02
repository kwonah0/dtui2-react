#!/usr/bin/env node

// Isolated test of PTY functionality from main.js
const { spawn } = require('child_process');

console.log('🧪 Testing PTY emulation functionality in isolation...');

// Check if PTY emulation is available
const usePtyEmulation = process.platform !== 'win32' && require('fs').existsSync('/usr/bin/script');
console.log('PTY emulation available:', usePtyEmulation);

if (!usePtyEmulation) {
  console.log('❌ PTY emulation not available on this platform');
  process.exit(1);
}

// Test the exact same logic as in main.js execute-shell-command handler
function testExecuteShellCommand(command) {
  console.log('🚀🚀🚀 EXECUTE-SHELL-COMMAND CALLED WITH:', command);
  
  return new Promise((resolve) => {
    console.log('Using script command for PTY emulation');
    const scriptCommand = `script -qc "${command.replace(/"/g, '\\"')}" /dev/null`;
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
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.log('📤 Raw output chunk:', JSON.stringify(dataStr));
    });
    
    testProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.log('📤 Stderr chunk:', JSON.stringify(dataStr));
    });
    
    testProcess.on('close', (code) => {
      console.log('PTY shell command completed with code:', code);
      
      // Clean up script command artifacts
      output = output.replace(/Script started.*\r?\n/, '');
      output = output.replace(/Script done.*\r?\n/, '');
      
      console.log('📊 Final cleaned output length:', output.length);
      console.log('📊 Final output (first 300 chars):', output.substring(0, 300));
      
      resolve({
        success: code === 0,
        message: 'PTY shell command executed',
        exitCode: code,
        output: output.trim()
      });
    });
    
    testProcess.on('error', (err) => {
      console.error('PTY shell command error:', err);
      resolve({
        success: false,
        message: 'PTY shell command failed: ' + err.message,
        exitCode: -1,
        output: ''
      });
    });
  });
}

async function runTest() {
  console.log('\n🧪 Testing !ls command...');
  
  const result = await testExecuteShellCommand('ls --color=always');
  
  console.log('\n📋 Test Results:');
  console.log('✅ Success:', result.success);
  console.log('🔢 Exit Code:', result.exitCode);
  console.log('📝 Message:', result.message);
  
  if (result.output) {
    // Check for ANSI colors
    const hasAnsiColors = /\u001b\[\d+m/.test(result.output);
    console.log('🎨 Contains ANSI colors:', hasAnsiColors);
    
    // Check for multi-column format
    const lines = result.output.split('\n').filter(line => line.trim());
    const hasMultiColumn = lines.some(line => {
      // Look for multiple filenames separated by significant whitespace (indicating columns)
      const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, ''); // Remove ANSI codes
      const words = cleanLine.split(/\s+/).filter(w => w.trim());
      return words.length >= 2; // Multiple items on same line = multi-column
    });
    console.log('📋 Multi-column format:', hasMultiColumn);
    
    // Check for typical file/directory names
    const hasCommonFiles = result.output.includes('package.json') || 
                          result.output.includes('src') || 
                          result.output.includes('node_modules');
    console.log('📁 Contains expected files/dirs:', hasCommonFiles);
    
    if (hasAnsiColors && hasMultiColumn && hasCommonFiles) {
      console.log('\n🎉 PTY IMPLEMENTATION IS WORKING CORRECTLY!');
      console.log('✅ ANSI colors detected');
      console.log('✅ Multi-column format detected');
      console.log('✅ Expected directory structure detected');
      return true;
    } else {
      console.log('\n⚠️  PTY implementation may have issues:');
      console.log('   ANSI colors:', hasAnsiColors ? '✅' : '❌');
      console.log('   Multi-column:', hasMultiColumn ? '✅' : '❌');
      console.log('   Expected files:', hasCommonFiles ? '✅' : '❌');
      return false;
    }
  } else {
    console.log('\n❌ No output received');
    return false;
  }
}

runTest().then(success => {
  console.log('\n' + (success ? '🎉 PTY TEST PASSED' : '❌ PTY TEST FAILED'));
  process.exit(success ? 0 : 1);
});