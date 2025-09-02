#!/usr/bin/env node

// Direct test of the node-pty output capture logic from main.js
const pty = require('@homebridge/node-pty-prebuilt-multiarch');

console.log('🧪 Testing node-pty output capture directly...');

// Recreate the exact logic from execute-command-with-output handler
let outputBuffer = '';
let errorBuffer = '';
const commandId = Date.now() + Math.random();
const startMarker = `__DTUI2_START_${commandId}__`;
const endMarker = `__DTUI2_END_${commandId}__`;
let commandStarted = false;
let commandCompleted = false;

// Create PTY process like in main.js
const shell = '/bin/bash';
const shellArgs = ['--login'];

const shellSession = pty.spawn(shell, shellArgs, {
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

const stdoutListener = (data) => {
  const output = data.toString();
  outputBuffer += output;
  console.log('[PTY DATA]', output);

  // Check for start marker
  if (!commandStarted && output.includes(startMarker)) {
    commandStarted = true;
    outputBuffer = outputBuffer.split(startMarker)[1] || '';
    console.log('📍 Start marker found, commandStarted = true');
  }

  // Check for end marker
  if (commandStarted && output.includes(endMarker)) {
    commandCompleted = true;
    outputBuffer = outputBuffer.split(endMarker)[0] || '';
    console.log('📍 End marker found, command completed');
    cleanup();
  }
};

const cleanup = () => {
  console.log('🧹 Cleanup called');
  
  // Extract exit code from output
  let actualExitCode = 0;
  let cleanOutput = outputBuffer
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\x1b\[[0-9;]*[JKH]/g, ''); // Remove cursor control sequences
  
  // Look for exit code marker
  const exitCodeMatch = cleanOutput.match(/__EXIT_CODE__(\d+)/);
  if (exitCodeMatch) {
    actualExitCode = parseInt(exitCodeMatch[1]);
    // Remove exit code line from output
    cleanOutput = cleanOutput.replace(/__EXIT_CODE__\d+\n?/, '');
  }
  
  cleanOutput = cleanOutput.trim();

  console.log('📊 Final results:');
  console.log('   Raw output buffer length:', outputBuffer.length);
  console.log('   Clean output length:', cleanOutput.length);
  console.log('   Clean output:', JSON.stringify(cleanOutput));
  console.log('   Exit code:', actualExitCode);
  
  shellSession.kill();
  process.exit(0);
};

// Set up data listener
shellSession.onData(stdoutListener);

// Send the test command after a delay
setTimeout(() => {
  console.log('🚀 Sending test command...');
  const command = 'ls';
  const wrappedCommand = `echo "${startMarker}"; ${command}; echo "__EXIT_CODE__$?"; echo "${endMarker}"`;
  console.log('📤 Wrapped command:', wrappedCommand);
  shellSession.write(wrappedCommand + '\n');
}, 2000);

// Timeout handling
setTimeout(() => {
  if (!commandCompleted) {
    console.log('⏰ Timeout reached without completion');
    cleanup();
  }
}, 10000);