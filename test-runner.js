#!/usr/bin/env node

/**
 * Test Runner for DTUI2 - Runs all test suites
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

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

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function checkDependencies() {
  log('\n🔍 Checking dependencies...', 'blue');
  
  try {
    // Check if Playwright is installed
    await fs.access('./node_modules/.bin/playwright');
    log('✅ Playwright installed', 'green');
  } catch {
    log('❌ Playwright not found. Installing...', 'red');
    await runCommand('npm', ['install', '--save-dev', 'playwright', '@playwright/test']);
    await runCommand('npx', ['playwright', 'install']);
  }

  // Check if app builds
  try {
    log('🔨 Building application...', 'blue');
    await runCommand('npm', ['run', 'build']);
    log('✅ Build successful', 'green');
  } catch (error) {
    log('❌ Build failed', 'red');
    throw error;
  }
}

async function runTestSuite(name, command, description) {
  log(`\n🧪 Running ${name}...`, 'blue');
  log(`📝 ${description}`, 'gray');
  
  try {
    await runCommand(command, [], { shell: true });
    log(`✅ ${name} passed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${name} failed`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 DTUI2 Test Suite Runner', 'blue');
  log('=' .repeat(50), 'blue');

  const testResults = [];
  let totalTests = 0;
  let passedTests = 0;

  try {
    // Check dependencies first
    await checkDependencies();

    // Define test suites
    const testSuites = [
      {
        name: 'Unit Tests',
        command: 'npm test',
        description: 'Basic application functionality tests'
      },
      {
        name: 'Configuration Tests',
        command: 'npm run test:config',
        description: '3-tier configuration system tests'
      },
      {
        name: 'Shell Integration Tests',
        command: 'npm run test:fakeshell',
        description: 'Shell agent integration tests'
      },
      {
        name: 'GUI Output Format Tests',
        command: 'npm run test:gui',
        description: 'Playwright GUI tests for shell output formats'
      }
    ];

    // Run each test suite
    for (const testSuite of testSuites) {
      totalTests++;
      const passed = await runTestSuite(testSuite.name, testSuite.command, testSuite.description);
      if (passed) passedTests++;
      testResults.push({ ...testSuite, passed });
    }

  } catch (error) {
    log(`💥 Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  }

  // Summary
  log('\n' + '=' .repeat(50), 'blue');
  log(`📊 Test Results: ${passedTests}/${totalTests} passed`, 
      passedTests === totalTests ? 'green' : 'yellow');
  log('=' .repeat(50), 'blue');

  // Detailed results
  log('\n📋 Detailed Results:', 'blue');
  testResults.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`  ${status} ${index + 1}. ${result.name}`, color);
    if (!result.passed) {
      log(`      ${result.description}`, 'gray');
    }
  });

  // Additional information
  if (passedTests < totalTests) {
    log('\n💡 Some tests failed. To debug:', 'yellow');
    log('  - Run individual test suites to see specific failures', 'gray');
    log('  - Use npm run test:gui:headed for visual debugging', 'gray');
    log('  - Check the Playwright test report in playwright-report/', 'gray');
  }

  log('\n🎯 Test Commands Available:', 'blue');
  log('  npm test              - Basic unit tests', 'gray');
  log('  npm run test:config   - Configuration tests', 'gray');  
  log('  npm run test:fakeshell- Shell integration tests', 'gray');
  log('  npm run test:gui      - GUI tests (headless)', 'gray');
  log('  npm run test:gui:headed - GUI tests (with UI)', 'gray');
  log('  npm run test:gui:debug  - GUI tests (debug mode)', 'gray');

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log(`💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTestSuite, checkDependencies };