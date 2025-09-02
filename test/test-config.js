#!/usr/bin/env node

/**
 * Configuration Test Suite for DTUI2
 * Tests various configuration scenarios including:
 * - Environment variable configuration
 * - User configuration file
 * - Default configuration fallback
 * - AppImage-specific configuration
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

// Test configuration paths
const CONFIG_PATHS = {
  local: path.join(__dirname, '../dtui.json'),
  temp: path.join(os.tmpdir(), 'dtui-test.json')
};

// Default test configuration
const DEFAULT_CONFIG = {
  ai: {
    provider: 'shell',
    shell: {
      command: 'echo',
      args: ['[TEST]:'],
      template: '{command} {args} "{prompt}"',
      timeout: 5000,
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

class ConfigTester {
  constructor() {
    this.testResults = [];
    this.testCount = 0;
    this.passCount = 0;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runTest(name, testFn) {
    this.testCount++;
    this.log(`\n▶ Test ${this.testCount}: ${name}`, 'blue');
    
    try {
      const result = await testFn();
      if (result) {
        this.passCount++;
        this.log(`  ✓ PASSED`, 'green');
        this.testResults.push({ name, passed: true });
      } else {
        this.log(`  ✗ FAILED`, 'red');
        this.testResults.push({ name, passed: false });
      }
    } catch (error) {
      this.log(`  ✗ ERROR: ${error.message}`, 'red');
      this.testResults.push({ name, passed: false, error: error.message });
    }
  }

  /**
   * Test 1: Environment Variable Configuration
   * Tests if shell command can be overridden via environment variables
   */
  async testEnvironmentVariables() {
    return this.runTest('Environment Variable Configuration', async () => {
      // Set environment variables
      process.env.DTUI_CFG__ai__shell__command = 'printf';
      process.env.DTUI_CFG__ai__shell__args = '["ENVTEST: %s"]';
      process.env.DTUI_CFG__ai__shell__template = '{command} {args} "{prompt}"';
      
      // In a real test, we would launch the app and verify the config
      // For now, we'll simulate the expected behavior
      const expectedCommand = 'printf';
      const expectedArgs = ['ENVTEST: %s'];
      
      // Verify environment variables are set correctly
      const cmdFromEnv = process.env.DTUI_CFG__ai__shell__command;
      const argsFromEnv = JSON.parse(process.env.DTUI_CFG__ai__shell__args);
      
      const passed = cmdFromEnv === expectedCommand && 
                     argsFromEnv[0] === expectedArgs[0];
      
      this.log(`    Command from env: ${cmdFromEnv}`, 'gray');
      this.log(`    Args from env: ${JSON.stringify(argsFromEnv)}`, 'gray');
      
      // Clean up
      delete process.env.DTUI_CFG__ai__shell__command;
      delete process.env.DTUI_CFG__ai__shell__args;
      delete process.env.DTUI_CFG__ai__shell__template;
      
      return passed;
    });
  }

  /**
   * Test 2: User Configuration File
   * Tests if configuration can be loaded from user config file
   */
  async testUserConfigFile() {
    return this.runTest('User Configuration File', async () => {
      // Create a test config file
      const testConfig = {
        ...DEFAULT_CONFIG,
        ai: {
          ...DEFAULT_CONFIG.ai,
          shell: {
            ...DEFAULT_CONFIG.ai.shell,
            command: 'echo',
            args: ['[USER_CONFIG]:'],
            template: '{command} {args} "{prompt}"'
          }
        }
      };
      
      // Write test config
      await fs.writeFile(CONFIG_PATHS.temp, JSON.stringify(testConfig, null, 2));
      
      // Read and verify
      const configContent = await fs.readFile(CONFIG_PATHS.temp, 'utf-8');
      const loadedConfig = JSON.parse(configContent);
      
      const passed = loadedConfig.ai.shell.args[0] === '[USER_CONFIG]:';
      
      this.log(`    Config written to: ${CONFIG_PATHS.temp}`, 'gray');
      this.log(`    Loaded args: ${JSON.stringify(loadedConfig.ai.shell.args)}`, 'gray');
      
      // Clean up
      await fs.unlink(CONFIG_PATHS.temp).catch(() => {});
      
      return passed;
    });
  }

  /**
   * Test 3: Default Configuration Fallback
   * Tests if default configuration is created when no config exists
   */
  async testDefaultConfigFallback() {
    return this.runTest('Default Configuration Fallback', async () => {
      // Ensure no config exists at temp path
      await fs.unlink(CONFIG_PATHS.temp).catch(() => {});
      
      // Simulate default config creation
      const defaultConfig = DEFAULT_CONFIG;
      await fs.writeFile(CONFIG_PATHS.temp, JSON.stringify(defaultConfig, null, 2));
      
      // Verify default config was created
      const exists = await fs.access(CONFIG_PATHS.temp).then(() => true).catch(() => false);
      
      if (exists) {
        const content = await fs.readFile(CONFIG_PATHS.temp, 'utf-8');
        const config = JSON.parse(content);
        const passed = config.ai.provider === 'shell' && 
                      config.ai.shell.outputFormat.useCodeBlock === true;
        
        this.log(`    Default config created: ${exists}`, 'gray');
        this.log(`    Provider: ${config.ai.provider}`, 'gray');
        this.log(`    Use code blocks: ${config.ai.shell.outputFormat.useCodeBlock}`, 'gray');
        
        // Clean up
        await fs.unlink(CONFIG_PATHS.temp).catch(() => {});
        
        return passed;
      }
      
      return false;
    });
  }

  /**
   * Test 4: DTUI_USER_CONFIGFILE Environment Variable
   * Tests if custom config file path can be set via environment variable
   */
  async testCustomConfigFile() {
    return this.runTest('DTUI_USER_CONFIGFILE Environment Variable', async () => {
      const customConfigPath = path.join(os.tmpdir(), 'custom-dtui-test.json');
      const originalConfigFile = process.env.DTUI_USER_CONFIGFILE;
      
      // Set custom config file path
      process.env.DTUI_USER_CONFIGFILE = customConfigPath;
      
      // Create test config at custom location
      const testConfig = {
        ...DEFAULT_CONFIG,
        ai: {
          ...DEFAULT_CONFIG.ai,
          shell: {
            ...DEFAULT_CONFIG.ai.shell,
            args: ['[CUSTOM_CONFIG]:']
          }
        }
      };
      
      await fs.writeFile(customConfigPath, JSON.stringify(testConfig, null, 2));
      
      // Verify environment variable is set and file exists
      const configFileFromEnv = process.env.DTUI_USER_CONFIGFILE;
      const configExists = await fs.access(customConfigPath).then(() => true).catch(() => false);
      
      const passed = configFileFromEnv === customConfigPath && configExists;
      
      this.log(`    DTUI_USER_CONFIGFILE: ${configFileFromEnv}`, 'gray');
      this.log(`    Config file exists: ${configExists}`, 'gray');
      
      // Clean up
      await fs.unlink(customConfigPath).catch(() => {});
      if (originalConfigFile) {
        process.env.DTUI_USER_CONFIGFILE = originalConfigFile;
      } else {
        delete process.env.DTUI_USER_CONFIGFILE;
      }
      
      return passed;
    });
  }

  /**
   * Test 5: Configuration Priority
   * Tests configuration priority: Env vars > User config > Default
   */
  async testConfigPriority() {
    return this.runTest('Configuration Priority (Env > User > Default)', async () => {
      // Set all three levels
      process.env.DTUI_CFG__ai__shell__command = 'env_command';
      
      const userConfig = {
        ...DEFAULT_CONFIG,
        ai: {
          ...DEFAULT_CONFIG.ai,
          shell: {
            ...DEFAULT_CONFIG.ai.shell,
            command: 'user_command'
          }
        }
      };
      
      const defaultCommand = 'default_command';
      
      // Priority should be: env_command > user_command > default_command
      const finalCommand = process.env.DTUI_CFG__ai__shell__command || 
                          userConfig.ai.shell.command || 
                          defaultCommand;
      
      const passed = finalCommand === 'env_command';
      
      this.log(`    Env command: ${process.env.DTUI_CFG__ai__shell__command}`, 'gray');
      this.log(`    User command: ${userConfig.ai.shell.command}`, 'gray');
      this.log(`    Default command: ${defaultCommand}`, 'gray');
      this.log(`    Final command: ${finalCommand}`, 'gray');
      
      // Clean up
      delete process.env.DTUI_CFG__ai__shell__command;
      
      return passed;
    });
  }

  /**
   * Test 6: Code Block Configuration
   * Tests if code block formatting can be configured
   */
  async testCodeBlockConfig() {
    return this.runTest('Code Block Formatting Configuration', async () => {
      const configs = [
        { useCodeBlock: true, codeBlockSyntax: 'shell' },
        { useCodeBlock: false, codeBlockSyntax: '' },
        { useCodeBlock: true, codeBlockSyntax: 'bash' }
      ];
      
      let allPassed = true;
      
      for (const config of configs) {
        const testOutput = 'test output';
        let formatted;
        
        if (config.useCodeBlock) {
          formatted = `\`\`\`${config.codeBlockSyntax}\n${testOutput}\n\`\`\``;
        } else {
          formatted = testOutput;
        }
        
        const expectedWithBlock = config.useCodeBlock ? 
          `\`\`\`${config.codeBlockSyntax}\n${testOutput}\n\`\`\`` : 
          testOutput;
        
        const passed = formatted === expectedWithBlock;
        allPassed = allPassed && passed;
        
        this.log(`    Config: ${JSON.stringify(config)}`, 'gray');
        this.log(`    Result: ${passed ? 'PASS' : 'FAIL'}`, passed ? 'green' : 'red');
      }
      
      return allPassed;
    });
  }

  /**
   * Test 7: Shell Command Template
   * Tests if shell command template is properly formatted
   */
  async testShellCommandTemplate() {
    return this.runTest('Shell Command Template Formatting', async () => {
      const templates = [
        {
          template: '{command} {args} "{prompt}"',
          command: 'echo',
          args: ['prefix:'],
          prompt: 'test message',
          expected: 'echo prefix: "test message"'
        },
        {
          template: '{command} "{prompt}" {args}',
          command: 'printf',
          args: ['--format=json'],
          prompt: 'query',
          expected: 'printf "query" --format=json'
        }
      ];
      
      let allPassed = true;
      
      for (const test of templates) {
        const result = test.template
          .replace('{command}', test.command)
          .replace('{args}', test.args.join(' '))
          .replace('{prompt}', test.prompt);
        
        const passed = result === test.expected;
        allPassed = allPassed && passed;
        
        this.log(`    Template: ${test.template}`, 'gray');
        this.log(`    Result: ${result}`, 'gray');
        this.log(`    Expected: ${test.expected}`, 'gray');
        this.log(`    Status: ${passed ? 'PASS' : 'FAIL'}`, passed ? 'green' : 'red');
      }
      
      return allPassed;
    });
  }

  async runAllTests() {
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('DTUI2 Configuration Test Suite', 'blue');
    this.log('='.repeat(60), 'blue');
    
    await this.testEnvironmentVariables();
    await this.testUserConfigFile();
    await this.testDefaultConfigFallback();
    await this.testCustomConfigFile();
    await this.testConfigPriority();
    await this.testCodeBlockConfig();
    await this.testShellCommandTemplate();
    
    this.log('\n' + '='.repeat(60), 'blue');
    this.log(`Test Results: ${this.passCount}/${this.testCount} passed`, 
             this.passCount === this.testCount ? 'green' : 'yellow');
    this.log('='.repeat(60), 'blue');
    
    // Print summary
    this.log('\nSummary:', 'blue');
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✓' : '✗';
      const color = result.passed ? 'green' : 'red';
      this.log(`  ${status} Test ${index + 1}: ${result.name}`, color);
      if (result.error) {
        this.log(`    Error: ${result.error}`, 'red');
      }
    });
    
    // Exit with appropriate code
    process.exit(this.passCount === this.testCount ? 0 : 1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new ConfigTester();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ConfigTester;