#!/usr/bin/env node

/**
 * Test real shell execution with configured commands
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Real Shell Execution...\n');

// Load current configuration
let config;
try {
  config = JSON.parse(fs.readFileSync('dtui.json', 'utf8'));
  console.log('📋 Current Configuration:');
  console.log(JSON.stringify(config.ai.shell, null, 2));
} catch (error) {
  console.error('❌ Failed to load dtui.json:', error.message);
  process.exit(1);
}

// Test the configured shell command
const shellConfig = config.ai.shell;
const testPrompt = "Hello, can you respond?";

// Build command string using the template
let fullCommand = shellConfig.template
  .replace('{command}', shellConfig.command)
  .replace('{args}', shellConfig.args.join(' '))
  .replace('{prompt}', testPrompt);

console.log(`\n🚀 Executing: ${fullCommand}\n`);

// Parse and execute the command
const [cmd, ...args] = fullCommand.split(' ').map(arg => {
  if (arg.startsWith('"') && arg.endsWith('"')) {
    return arg.slice(1, -1);
  }
  return arg;
});

const startTime = Date.now();
const childProcess = spawn(cmd, args, {
  shell: true,
  stdio: 'pipe'
});

let output = '';
let error = '';

childProcess.stdout.on('data', (data) => {
  process.stdout.write(data);  // Real-time output
  output += data.toString();
});

childProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
  error += data.toString();
});

childProcess.on('close', (code) => {
  const duration = Date.now() - startTime;
  
  console.log(`\n\n📊 Execution Summary:`);
  console.log(`   Command: ${fullCommand}`);
  console.log(`   Exit Code: ${code}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Output Length: ${output.length} chars`);
  
  if (code === 0) {
    console.log('✅ Command executed successfully!');
    console.log('\n📝 This demonstrates that:');
    console.log('   - Configuration system loads dtui.json correctly');
    console.log('   - Template system builds commands properly');  
    console.log('   - Real shell execution works in Node.js environment');
    console.log('   - ShellAIAgent would work the same way');
  } else {
    console.log('❌ Command failed');
    if (error) {
      console.log('Error output:', error);
    }
  }
});

childProcess.on('error', (err) => {
  console.log('❌ Failed to start command:', err.message);
  console.log('\n💡 This might mean:');
  console.log('   - Command not found in PATH');
  console.log('   - Permission issues');
  console.log('   - Configuration error');
});