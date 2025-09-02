#!/usr/bin/env node

// Test environment variable processing exactly like main.js
const nconf = require('nconf');

const DEFAULT_CONFIG = {
  ai: {
    provider: 'shell',
    shell: {
      command: 'echo',
      args: ['[DTUI2]:'],
      template: '{command} {args} "{prompt}"',
      timeout: 10000,
      streaming: false,
      outputFormat: {
        useCodeBlock: true,
        codeBlockSyntax: 'shell'
      }
    }
  },
  terminal: {
    shell: '/bin/bash',
    columns: 80,
    lines: 24
  },
  ui: {
    theme: 'dark',
    fontSize: 14
  }
};

console.log('Testing environment variable processing...');
console.log('Environment variables with DTUI_CFG__ prefix:');

// Show env vars that match our prefix
Object.keys(process.env)
  .filter(key => key.startsWith('DTUI_CFG__'))
  .forEach(key => {
    console.log(`  ${key} = ${process.env[key]}`);
  });

// Process environment variables exactly like main.js
const envOverrides = {};
Object.keys(process.env)
  .filter(key => key.startsWith('DTUI_CFG__'))
  .forEach(key => {
    const configPath = key.replace('DTUI_CFG__', '').toLowerCase().split('__');
    let value = process.env[key];
    
    // Parse JSON strings for complex values
    if (typeof value === 'string') {
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          value = JSON.parse(value);
        }
      } catch (e) {
        console.log(`JSON parse error for ${key}:`, e.message);
      }
    }
    
    // Create nested object structure for overrides
    let current = envOverrides;
    for (let i = 0; i < configPath.length - 1; i++) {
      if (!current[configPath[i]]) {
        current[configPath[i]] = {};
      }
      current = current[configPath[i]];
    }
    current[configPath[configPath.length - 1]] = value;
    
    console.log(`Override config from env: ${configPath.join(':')} =`, value);
  });

// Apply config exactly like main.js
nconf.reset();

// Set environment variable overrides first (highest priority)
if (Object.keys(envOverrides).length > 0) {
  nconf.overrides(envOverrides);
  console.log('\nEnvironment overrides applied:', JSON.stringify(envOverrides, null, 2));
}

nconf.defaults(DEFAULT_CONFIG);

console.log('\nFinal configuration values:');
console.log('Provider:', nconf.get('ai:provider'));
console.log('Shell command:', nconf.get('ai:shell:command'));
console.log('Shell args:', nconf.get('ai:shell:args'));
console.log('Use code block:', nconf.get('ai:shell:outputFormat:useCodeBlock'));

// Test success
const expectedCommand = process.env.DTUI_CFG__ai__shell__command || 'echo';
const actualCommand = nconf.get('ai:shell:command');

if (actualCommand === expectedCommand) {
  console.log('\n✅ Environment variable override test PASSED');
  process.exit(0);
} else {
  console.log('\n❌ Environment variable override test FAILED');
  console.log('Expected command:', expectedCommand);
  console.log('Actual command:', actualCommand);
  process.exit(1);
}