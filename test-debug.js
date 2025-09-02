#!/usr/bin/env node

const nconf = require('nconf');

console.log('Debugging nconf override behavior...');

const DEFAULT_CONFIG = {
  ai: {
    provider: 'shell',
    shell: {
      command: 'echo',
      args: ['[DEFAULT]:']
    }
  }
};

console.log('\n1. Basic override test...');
nconf.reset();
nconf.overrides({
  ai: {
    shell: {
      command: 'printf'
    }
  }
});
nconf.defaults(DEFAULT_CONFIG);

console.log('Full config:', JSON.stringify(nconf.get(), null, 2));
console.log('Command:', nconf.get('ai:shell:command'));
console.log('Args:', nconf.get('ai:shell:args'));

console.log('\n2. Testing with set after override...');
nconf.reset();
nconf.defaults(DEFAULT_CONFIG);
nconf.set('ai:shell:command', 'printf');
nconf.set('ai:shell:args', ['[SET]:']);

console.log('Full config after set:', JSON.stringify(nconf.get(), null, 2));
console.log('Command:', nconf.get('ai:shell:command'));
console.log('Args:', nconf.get('ai:shell:args'));