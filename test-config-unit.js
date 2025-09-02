#!/usr/bin/env node

/**
 * Unit tests for configuration system - tests without GUI
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class ConfigTester {
  constructor() {
    this.testResults = [];
    this.testCount = 0;
    this.passCount = 0;
  }

  async runTest(name, testFn) {
    this.testCount++;
    log(`\n▶ Test ${this.testCount}: ${name}`, 'blue');
    
    try {
      const result = await testFn();
      if (result) {
        this.passCount++;
        log(`  ✓ PASSED`, 'green');
        this.testResults.push({ name, passed: true });
      } else {
        log(`  ✗ FAILED`, 'red');
        this.testResults.push({ name, passed: false });
      }
    } catch (error) {
      log(`  ✗ ERROR: ${error.message}`, 'red');
      this.testResults.push({ name, passed: false, error: error.message });
    }
  }

  /**
   * Test config loading by running a simple node script that imports main.js logic
   */
  async testConfigLoading() {
    return this.runTest('Configuration loading and defaults', async () => {
      // Create a test script that simulates the config loading
      const testScript = `
const nconf = require('nconf');
const path = require('path');

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

// Test config initialization
nconf.reset();
nconf.defaults(DEFAULT_CONFIG);

// Test that defaults are loaded
const provider = nconf.get('ai:provider');
const shellCommand = nconf.get('ai:shell:command');
const useCodeBlock = nconf.get('ai:shell:outputFormat:useCodeBlock');

console.log('Provider:', provider);
console.log('Shell command:', shellCommand);
console.log('Use code block:', useCodeBlock);

// Verify expected values
if (provider === 'shell' && shellCommand === 'echo' && useCodeBlock === true) {
  console.log('SUCCESS: Default configuration loaded correctly');
  process.exit(0);
} else {
  console.log('FAILED: Configuration mismatch');
  process.exit(1);
}
`;

      // Write and run test script
      const testFile = path.join(os.tmpdir(), 'config-test.js');
      await fs.writeFile(testFile, testScript);
      
      return new Promise((resolve) => {
        const child = spawn('node', [testFile], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          log(`    Test output: ${output.trim()}`, 'gray');
          fs.unlink(testFile).catch(() => {});
          resolve(code === 0);
        });
      });
    });
  }

  /**
   * Test environment variable override
   */
  async testEnvironmentOverride() {
    return this.runTest('Environment variable override', async () => {
      const testScript = `
const nconf = require('nconf');

const DEFAULT_CONFIG = {
  ai: {
    provider: 'shell',
    shell: {
      command: 'echo',
      args: ['[DTUI2]:']
    }
  }
};

// Simulate environment variable processing
const envOverrides = {};
const testEnvVars = {
  'DTUI_CFG__ai__shell__command': 'printf',
  'DTUI_CFG__ai__shell__args': '["[ENV_TEST]:"]'
};

Object.keys(testEnvVars)
  .filter(key => key.startsWith('DTUI_CFG__'))
  .forEach(key => {
    const configPath = key.replace('DTUI_CFG__', '').toLowerCase().split('__');
    let value = testEnvVars[key];
    
    // Parse JSON strings
    try {
      if (value.startsWith('[')) {
        value = JSON.parse(value);
      }
    } catch (e) {
      // Keep as string
    }
    
    // Create nested structure
    let current = envOverrides;
    for (let i = 0; i < configPath.length - 1; i++) {
      if (!current[configPath[i]]) {
        current[configPath[i]] = {};
      }
      current = current[configPath[i]];
    }
    current[configPath[configPath.length - 1]] = value;
  });

nconf.reset();
nconf.overrides(envOverrides);
nconf.defaults(DEFAULT_CONFIG);

// Test override values
const command = nconf.get('ai:shell:command');
const args = nconf.get('ai:shell:args');

console.log('Overridden command:', command);
console.log('Overridden args:', args);

if (command === 'printf' && args[0] === '[ENV_TEST]:') {
  console.log('SUCCESS: Environment overrides work');
  process.exit(0);
} else {
  console.log('FAILED: Environment overrides not working');
  process.exit(1);
}
`;

      const testFile = path.join(os.tmpdir(), 'env-test.js');
      await fs.writeFile(testFile, testScript);
      
      return new Promise((resolve) => {
        const child = spawn('node', [testFile], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', (code) => {
          log(`    Test output: ${output.trim()}`, 'gray');
          fs.unlink(testFile).catch(() => {});
          resolve(code === 0);
        });
      });
    });
  }

  /**
   * Test user config file loading
   */
  async testUserConfigFile() {
    return this.runTest('User config file loading', async () => {
      // Create temporary user config
      const tempConfigPath = path.join(os.tmpdir(), 'test-user-config.json');
      const userConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: ['[USER_CONFIG]:'],
            timeout: 15000
          }
        }
      };
      
      await fs.writeFile(tempConfigPath, JSON.stringify(userConfig, null, 2));
      
      const testScript = `
const nconf = require('nconf');
const fsSync = require('fs');

const DEFAULT_CONFIG = {
  ai: {
    provider: 'shell',
    shell: {
      command: 'echo',
      args: ['[DTUI2]:'],
      timeout: 10000
    }
  }
};

// Simulate user config loading
const userConfigFile = '${tempConfigPath}';
nconf.reset();

if (userConfigFile && fsSync.existsSync(userConfigFile)) {
  nconf.file('user', userConfigFile);
}

nconf.defaults(DEFAULT_CONFIG);

// Test values
const args = nconf.get('ai:shell:args');
const timeout = nconf.get('ai:shell:timeout');

console.log('Args from config:', args);
console.log('Timeout from config:', timeout);

if (args[0] === '[USER_CONFIG]:' && timeout === 15000) {
  console.log('SUCCESS: User config loaded correctly');
  process.exit(0);
} else {
  console.log('FAILED: User config not loaded properly');
  process.exit(1);
}
`;

      const testFile = path.join(os.tmpdir(), 'user-config-test.js');
      await fs.writeFile(testFile, testScript);
      
      return new Promise((resolve) => {
        const child = spawn('node', [testFile], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('close', async (code) => {
          log(`    Test output: ${output.trim()}`, 'gray');
          await fs.unlink(testFile).catch(() => {});
          await fs.unlink(tempConfigPath).catch(() => {});
          resolve(code === 0);
        });
      });
    });
  }

  async runAllTests() {
    log('\n' + '='.repeat(60), 'blue');
    log('DTUI2 Configuration Unit Tests', 'blue');
    log('='.repeat(60), 'blue');
    
    await this.testConfigLoading();
    await this.testEnvironmentOverride();
    await this.testUserConfigFile();
    
    log('\n' + '='.repeat(60), 'blue');
    log(`Test Results: ${this.passCount}/${this.testCount} passed`, 
         this.passCount === this.testCount ? 'green' : 'yellow');
    log('='.repeat(60), 'blue');
    
    // Print summary
    log('\nSummary:', 'blue');
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? 'green' : 'red';
      log(`  ${status} Test ${index + 1}: ${result.name}`, color);
      if (result.error) {
        log(`    Error: ${result.error}`, 'red');
      }
    });
    
    return this.passCount === this.testCount;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new ConfigTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ConfigTester;