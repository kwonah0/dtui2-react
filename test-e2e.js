#!/usr/bin/env node

/**
 * DTUI2 End-to-End Test Script
 * Tests the application through the AI Provider interface
 */

const { AIProvider } = require('./dist-test/AIProvider.js');
const { MockAIAgent } = require('./dist-test/MockAIAgent.js');

// Test scenarios
const testScenarios = [
  {
    name: 'Basic greeting',
    input: 'Hello',
    expectedPattern: /hello|hi|greet/i
  },
  {
    name: 'Help command',
    input: 'help',
    expectedPattern: /available commands|terminal operations/i
  },
  {
    name: 'Shell command (!ls)',
    input: '!ls',
    expectedPattern: /node_modules|src|package\.json/i
  },
  {
    name: 'File read command',
    input: 'read file package.json',
    expectedPattern: /package\.json|file:/i
  },
  {
    name: 'Code analysis',
    input: 'analyze code src/App.tsx',
    expectedPattern: /analyze|code|file/i
  },
  {
    name: 'Project analysis',
    input: 'analyze project',
    expectedPattern: /project|structure|directories/i
  },
  {
    name: 'Error suggestion',
    input: 'suggest fix TypeError: Cannot read property',
    expectedPattern: /suggestion|fix|error/i
  },
  {
    name: 'Code generation',
    input: 'generate code React component',
    expectedPattern: /generated|component|react/i
  }
];

async function runE2ETests() {
  console.log('🚀 Starting E2E Tests for DTUI2\n');
  
  const results = [];
  
  // Create a mock AI provider
  const aiProvider = new AIProvider();
  
  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.name}`);
    
    try {
      const messages = [
        { role: 'user', content: scenario.input, timestamp: Date.now() }
      ];
      
      const response = await aiProvider.generateResponse(messages);
      
      const passed = scenario.expectedPattern.test(response);
      
      results.push({
        scenario: scenario.name,
        passed,
        input: scenario.input,
        response: response.substring(0, 100) + '...'
      });
      
      console.log(passed ? '  ✅ Passed' : '  ❌ Failed');
      if (!passed) {
        console.log(`    Expected pattern: ${scenario.expectedPattern}`);
        console.log(`    Got: ${response.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        scenario: scenario.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 E2E Test Results\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed Scenarios:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ❌ ${r.scenario}`);
        if (r.error) console.log(`     Error: ${r.error}`);
      });
  }
  
  const percentage = (passed / total * 100).toFixed(1);
  console.log(`\n🎯 Success Rate: ${percentage}%`);
  
  if (failed === 0) {
    console.log('✨ All E2E tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Please review the results above.');
  }
}

// Check if we can import the modules
try {
  console.log('Note: This test requires the application to be built.');
  console.log('Run "npm run build" first if you see module errors.\n');
  
  // For now, just print the test plan
  console.log('📋 Test Plan:');
  testScenarios.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
    console.log(`     Input: "${s.input}"`);
  });
  
  console.log('\n✅ Test scenarios defined successfully!');
  console.log('To run actual E2E tests, ensure the app is built first.');
} catch (error) {
  console.error('Error:', error.message);
}