#!/usr/bin/env node

// Test user config file loading exactly like main.js
const nconf = require('nconf');
const fsSync = require('fs');

const DEFAULT_CONFIG = {
  ai: {
    provider: 'shell',
    shell: {
      command: 'echo',
      args: ['[DTUI2]:'],
      timeout: 10000,
      outputFormat: {
        useCodeBlock: true
      }
    }
  }
};

console.log('Testing user config file loading...');

// Check for user config file
const userConfigFile = process.env.DTUI_USER_CONFIGFILE;
console.log('DTUI_USER_CONFIGFILE:', userConfigFile);

if (userConfigFile) {
  console.log('Config file exists:', fsSync.existsSync(userConfigFile));
}

// Initialize nconf exactly like main.js
nconf.reset();

// User config file
if (userConfigFile && fsSync.existsSync(userConfigFile)) {
  console.log(`Using user config file: ${userConfigFile}`);
  nconf.file('user', userConfigFile);
} else {
  console.log('No user config file specified or found');
}

// Defaults
nconf.defaults(DEFAULT_CONFIG);

console.log('\nFinal configuration values:');
console.log('Provider:', nconf.get('ai:provider'));
console.log('Shell command:', nconf.get('ai:shell:command'));
console.log('Shell args:', nconf.get('ai:shell:args'));
console.log('Timeout:', nconf.get('ai:shell:timeout'));
console.log('Use code block:', nconf.get('ai:shell:outputFormat:useCodeBlock'));

// Test if user config was loaded
const timeout = nconf.get('ai:shell:timeout');
const args = nconf.get('ai:shell:args');
const useCodeBlock = nconf.get('ai:shell:outputFormat:useCodeBlock');

if (userConfigFile && timeout === 15000 && args[0] === '[USER_CONFIG]:' && useCodeBlock === false) {
  console.log('\n✅ User config file test PASSED');
} else if (!userConfigFile && timeout === 10000 && args[0] === '[DTUI2]:' && useCodeBlock === true) {
  console.log('\n✅ Default config test PASSED');
} else {
  console.log('\n❌ Config test FAILED');
  console.log('Expected timeout:', userConfigFile ? 15000 : 10000);
  console.log('Actual timeout:', timeout);
  process.exit(1);
}