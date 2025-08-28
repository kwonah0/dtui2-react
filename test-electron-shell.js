#!/usr/bin/env node

/**
 * Test Electron shell agent functionality
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Electron Shell Agent...\n');

// Start Electron in the background
console.log('🚀 Starting Electron app...');
const electronProcess = spawn('npm', ['run', 'electron'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

let electronOutput = '';
let hasStarted = false;

electronProcess.stdout.on('data', (data) => {
  const output = data.toString();
  electronOutput += output;
  console.log('STDOUT:', output.trim());
  
  // Check if Electron has started
  if (output.includes('Loaded Electron config') && !hasStarted) {
    hasStarted = true;
    console.log('\n✅ Electron started, now testing shell agent...\n');
    testShellAgent();
  }
});

electronProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.log('STDERR:', error.trim());
});

function testShellAgent() {
  // Give Electron some time to fully initialize
  setTimeout(() => {
    console.log('📝 Testing shell command execution...');
    
    // Test the shell configuration directly
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('dtui.json', 'utf8'));
    
    console.log('Current shell config:', config.ai.shell);
    
    // Execute the shell command directly to verify it works
    const template = config.ai.shell.template;
    const command = config.ai.shell.command;
    const args = config.ai.shell.args;
    const testPrompt = "Testing from Node.js";
    
    const fullCommand = template
      .replace('{command}', command)
      .replace('{args}', args.join(' '))
      .replace('{prompt}', testPrompt);
    
    console.log(`Executing: ${fullCommand}`);
    
    const [cmd, ...cmdArgs] = fullCommand.split(' ').map(arg => {
      if (arg.startsWith('"') && arg.endsWith('"')) {
        return arg.slice(1, -1);
      }
      return arg;
    });
    
    const testProcess = spawn(cmd, cmdArgs, { shell: true });
    
    testProcess.stdout.on('data', (data) => {
      console.log('✅ Shell command output:', data.toString().trim());
    });
    
    testProcess.on('close', (code) => {
      console.log(`Shell command exit code: ${code}`);
      
      if (code === 0) {
        console.log('\n🎉 Shell agent test completed successfully!');
        console.log('\n💡 In the Electron app:');
        console.log('   1. Open the chat interface');
        console.log('   2. Type a message');
        console.log('   3. You should see the shell response');
        console.log('   4. Check the console for detailed logs');
      }
      
      // Keep Electron running for manual testing
      console.log('\n⏳ Electron is still running for manual testing...');
      console.log('   Press Ctrl+C to stop');
    });
  }, 3000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Electron...');
  electronProcess.kill();
  process.exit(0);
});

electronProcess.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
  process.exit(code);
});