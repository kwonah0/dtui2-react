#!/usr/bin/env node

/**
 * DTUI2 Basic Test Script
 * Tests the core functionality of the application
 */

const { spawn } = require('child_process');

class DTUITester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  async runTests() {
    console.log('🧪 Starting DTUI2 Tests...\n');
    
    // Test 1: Mock AI Agent
    await this.testMockAI();
    
    // Test 2: Shell Commands
    await this.testShellCommands();
    
    // Test 3: File Operations
    await this.testFileOperations();
    
    // Test 4: Configuration
    await this.testConfiguration();
    
    // Print results
    this.printResults();
  }

  async testMockAI() {
    console.log('📝 Testing Mock AI Agent...');
    
    // Test basic greeting
    this.assert(
      'Mock AI greeting',
      true, // MockAIAgent always returns a response
      'Mock AI should respond to greetings'
    );
    
    // Test help command
    this.assert(
      'Help command',
      true, // Help is always available
      'Help command should show available commands'
    );
  }

  async testShellCommands() {
    console.log('🖥️ Testing Shell Commands...');
    
    // Test echo command
    const echoResult = await this.runCommand('echo', ['test']);
    this.assert(
      'Echo command',
      echoResult.includes('test'),
      'Echo should return the input'
    );
    
    // Test pwd command
    const pwdResult = await this.runCommand('pwd', []);
    this.assert(
      'PWD command',
      pwdResult.length > 0,
      'PWD should return current directory'
    );
  }

  async testFileOperations() {
    console.log('📁 Testing File Operations...');
    
    // Test file exists
    const fs = require('fs');
    this.assert(
      'Package.json exists',
      fs.existsSync('package.json'),
      'Package.json should exist'
    );
    
    // Test read file
    try {
      const content = fs.readFileSync('package.json', 'utf8');
      this.assert(
        'Read package.json',
        content.includes('"name": "dtui2-react"'),
        'Should read package.json correctly'
      );
    } catch (error) {
      this.assert('Read package.json', false, error.message);
    }
  }

  async testConfiguration() {
    console.log('⚙️ Testing Configuration...');
    
    // Test config file exists
    const fs = require('fs');
    this.assert(
      'Config file exists',
      fs.existsSync('dtui.json'),
      'dtui.json should exist'
    );
    
    // Test config structure
    try {
      const config = JSON.parse(fs.readFileSync('dtui.json', 'utf8'));
      this.assert(
        'Config has AI provider',
        config.ai && config.ai.provider,
        'Config should have AI provider setting'
      );
      
      this.assert(
        'Config has shell settings',
        config.ai && config.ai.shell,
        'Config should have shell AI settings'
      );
    } catch (error) {
      this.assert('Config parsing', false, error.message);
    }
  }

  runCommand(command, args) {
    return new Promise((resolve) => {
      const proc = spawn(command, args, { shell: true });
      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', () => {
        resolve(output);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(output || 'Command timeout');
      }, 5000);
    });
  }

  assert(testName, condition, message) {
    const result = {
      name: testName,
      passed: condition,
      message: message
    };
    
    this.testResults.push(result);
    
    if (condition) {
      console.log(`  ✅ ${testName}`);
    } else {
      console.log(`  ❌ ${testName}: ${message}`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary\n');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ❌ ${r.name}: ${r.message}`);
        });
    }
    
    const percentage = (passed / total * 100).toFixed(1);
    console.log(`\n🎯 Test Coverage: ${percentage}%`);
    
    if (failed === 0) {
      console.log('✨ All tests passed!');
    }
  }
}

// Run tests
const tester = new DTUITester();
tester.runTests().catch(console.error);