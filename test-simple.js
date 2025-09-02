#!/usr/bin/env node

// Simple test to verify our configuration system works
const nconf = require('nconf');

console.log('Testing nconf configuration system...');

// Same DEFAULT_CONFIG as in main.js  
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

console.log('1. Testing basic defaults...');
nconf.reset();
nconf.defaults(DEFAULT_CONFIG);

const provider = nconf.get('ai:provider');
const command = nconf.get('ai:shell:command');
const useCodeBlock = nconf.get('ai:shell:outputFormat:useCodeBlock');

console.log('   Provider:', provider);
console.log('   Command:', command);
console.log('   Use code block:', useCodeBlock);

if (provider === 'shell' && command === 'echo' && useCodeBlock === true) {
  console.log('   ✅ Defaults test PASSED');
} else {
  console.log('   ❌ Defaults test FAILED');
  process.exit(1);
}

console.log('\n2. Testing environment variable override...');
nconf.reset();

// Simulate environment variable
const envOverrides = {
  ai: {
    shell: {
      command: 'printf',
      args: ['[TEST]:']
    }
  }
};

nconf.overrides(envOverrides);
nconf.defaults(DEFAULT_CONFIG);

const overriddenCommand = nconf.get('ai:shell:command');
const overriddenArgs = nconf.get('ai:shell:args');

console.log('   Overridden command:', overriddenCommand);
console.log('   Overridden args:', overriddenArgs);

if (overriddenCommand === 'printf' && overriddenArgs[0] === '[TEST]:') {
  console.log('   ✅ Override test PASSED');
} else {
  console.log('   ❌ Override test FAILED');
  process.exit(1);
}

console.log('\n3. Testing priority (env > defaults)...');
nconf.reset();

// Set both env and defaults
nconf.overrides({ ai: { provider: 'api' } });
nconf.defaults(DEFAULT_CONFIG);

const finalProvider = nconf.get('ai:provider');
const finalCommand = nconf.get('ai:shell:command'); // Should come from defaults

console.log('   Final provider (from override):', finalProvider);
console.log('   Final command (from defaults):', finalCommand);

if (finalProvider === 'api' && finalCommand === 'echo') {
  console.log('   ✅ Priority test PASSED');
} else {
  console.log('   ❌ Priority test FAILED');
  process.exit(1);
}

console.log('\n🎉 All configuration tests PASSED!');
console.log('\nConfiguration system is working correctly.');