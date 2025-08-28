const { spawn } = require('child_process');
const path = require('path');

console.log('Testing Electron app...');
console.log('Make sure you have built the React app first with: npm run build');
console.log('Starting Electron...');

const electron = spawn('npx', ['electron', '.'], {
  cwd: __dirname,
  stdio: 'inherit',
});

electron.on('close', (code) => {
  console.log(`Electron app closed with code ${code}`);
});

electron.on('error', (err) => {
  console.error('Failed to start Electron:', err);
});