#!/usr/bin/env node

// Complete integration test - exactly like main.js config loading
const nconf = require('nconf');
const fsSync = require('fs');

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

console.log('Testing complete configuration system integration...');
console.log('='.repeat(60));

// Show what we're testing with
console.log('\nTest inputs:');
console.log('DTUI_USER_CONFIGFILE:', process.env.DTUI_USER_CONFIGFILE || 'not set');
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('DTUI_CFG__'))
  .forEach(key => {
    console.log(`  ${key} = ${process.env[key]}`);
  });

// Complete initialization exactly like main.js
nconf.reset();

// 1. Environment variables with DTUI_CFG__ prefix (highest priority)
const envOverrides = {};
Object.keys(process.env)
  .filter(key => key.startsWith('DTUI_CFG__'))
  .forEach(key => {
    const configPath = key.replace('DTUI_CFG__', '').toLowerCase().split('__');
    let value = process.env[key];
    
    // Parse JSON strings and other value types
    if (typeof value === 'string') {
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          value = JSON.parse(value);
        } else if (/^\d+$/.test(value)) {
          // Parse integer values
          value = parseInt(value, 10);
        } else if (/^\d*\.\d+$/.test(value)) {
          // Parse float values
          value = parseFloat(value);
        } else if (value === 'true' || value === 'false') {
          // Parse boolean values
          value = value === 'true';
        }
      } catch (e) {
        // Keep as string if parsing fails
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

// Set environment variable overrides first (highest priority)
if (Object.keys(envOverrides).length > 0) {
  nconf.overrides(envOverrides);
  console.log('Environment overrides applied:', JSON.stringify(envOverrides, null, 2));
}

// 2. Command-line arguments
nconf.argv({
  parseValues: true
});

// 3. User specified config file (optional)
const userConfigFile = process.env.DTUI_USER_CONFIGFILE;
if (userConfigFile && fsSync.existsSync(userConfigFile)) {
  console.log(`Using user config file: ${userConfigFile}`);
  nconf.file('user', userConfigFile);
} else {
  console.log('No user config file specified or found');
}

// 4. Built-in default values (no external file needed)
nconf.defaults(DEFAULT_CONFIG);
console.log('Using built-in default configuration');

console.log('\n' + '='.repeat(60));
console.log('FINAL CONFIGURATION RESULTS:');
console.log('='.repeat(60));

console.log('\nCore AI Settings:');
console.log('  Provider:', nconf.get('ai:provider'));
console.log('  Shell command:', nconf.get('ai:shell:command'));
console.log('  Shell args:', JSON.stringify(nconf.get('ai:shell:args')));
console.log('  Timeout:', nconf.get('ai:shell:timeout'));
console.log('  Template:', nconf.get('ai:shell:template'));

console.log('\nOutput Format:');
console.log('  Use code block:', nconf.get('ai:shell:outputFormat:useCodeBlock'));
console.log('  Code block syntax:', nconf.get('ai:shell:outputFormat:codeBlockSyntax'));

console.log('\nOther Settings:');
console.log('  Terminal shell:', nconf.get('terminal:shell'));
console.log('  UI theme:', nconf.get('ui:theme'));

console.log('\n' + '='.repeat(60));
console.log('PRIORITY TEST RESULTS:');
console.log('='.repeat(60));

// Test priority: env vars should override user config should override defaults
const command = nconf.get('ai:shell:command');
const timeout = nconf.get('ai:shell:timeout');
const args = nconf.get('ai:shell:args');

let expectedCommand = 'echo'; // default
let expectedTimeout = 10000; // default
let expectedArgs = ['[DTUI2]:']; // default

// If user config file exists, it should override defaults
if (userConfigFile && fsSync.existsSync(userConfigFile)) {
  expectedCommand = 'echo'; // from user config
  expectedTimeout = 15000; // from user config  
  expectedArgs = ['[USER_CONFIG]:']; // from user config
}

// If env vars exist, they should override everything
if (process.env.DTUI_CFG__ai__shell__command) {
  expectedCommand = process.env.DTUI_CFG__ai__shell__command;
}
if (process.env.DTUI_CFG__ai__shell__timeout) {
  expectedTimeout = parseInt(process.env.DTUI_CFG__ai__shell__timeout);
}

console.log('\nExpected vs Actual:');
console.log(`  Command: expected=${expectedCommand}, actual=${command} ${command === expectedCommand ? '✅' : '❌'}`);
console.log(`  Timeout: expected=${expectedTimeout}, actual=${timeout} ${timeout === expectedTimeout ? '✅' : '❌'}`);

let allPassed = true;
if (command !== expectedCommand) allPassed = false;
if (timeout !== expectedTimeout) allPassed = false;

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('🎉 ALL TESTS PASSED! Configuration system working correctly.');
  process.exit(0);
} else {
  console.log('❌ TESTS FAILED! Configuration priority not working correctly.');
  process.exit(1);
}