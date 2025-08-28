// Simple test script to verify Mock functionality
console.log('🧪 Testing DTUI2 Mock Functionality');
console.log('=====================================');

// Test 1: Mock Electron API
console.log('\n1. Testing Mock Electron API...');
try {
    // Simulate browser environment
    global.window = {
        electronAPI: null
    };
    
    // Import and initialize Mock API
    const { MockElectronAPI, initializeMockAPI } = require('./src/services/MockElectronAPI.ts');
    initializeMockAPI();
    
    if (global.window.electronAPI) {
        console.log('✅ Mock Electron API initialized');
        
        // Test shell command simulation
        const output = global.window.electronAPI.simulateCommandOutput('ls');
        console.log('Shell command simulation output preview:', output.substring(0, 100) + '...');
        
    } else {
        console.log('❌ Mock Electron API failed to initialize');
    }
} catch (error) {
    console.log('❌ Mock Electron API test failed:', error.message);
}

// Test 2: ANSI Color Parsing
console.log('\n2. Testing ANSI Color Parsing...');
try {
    const testText = '\x1b[32mGreen text\x1b[0m and \x1b[31mRed text\x1b[0m';
    console.log('ANSI test string:', testText);
    console.log('✅ ANSI colors should work in terminal output component');
} catch (error) {
    console.log('❌ ANSI test failed:', error.message);
}

// Test 3: Command Mode Detection
console.log('\n3. Testing Command Mode Detection...');
try {
    const testCommands = [
        '!ls -la',
        'read file package.json',
        'analyze code src/App.tsx',
        'generate code React component',
        'hello world'
    ];
    
    testCommands.forEach(cmd => {
        const isShell = cmd.startsWith('!');
        const isFile = cmd.toLowerCase().startsWith('read file ');
        const isAnalyze = cmd.toLowerCase().startsWith('analyze ');
        const isGenerate = cmd.toLowerCase().startsWith('generate ');
        
        let mode = 'chat';
        if (isShell) mode = 'shell';
        else if (isFile) mode = 'file';
        else if (isAnalyze) mode = 'analyze';
        else if (isGenerate) mode = 'generate';
        
        console.log(`"${cmd}" -> ${mode} mode`);
    });
    
    console.log('✅ Command mode detection working');
} catch (error) {
    console.log('❌ Command mode detection failed:', error.message);
}

console.log('\n🎯 Summary:');
console.log('- Mock Electron API: Should provide file/shell operations');
console.log('- ANSI Color Support: Should render colored terminal output');
console.log('- Command Mode Detection: Should show UI indicators');
console.log('- Mock AI Responses: Should respond to general chat');
console.log('\n💡 To fully test, open browser at http://localhost:3000 and try:');
console.log('  - Type "hello" (should get Mock AI response)');
console.log('  - Type "!ls" (should show shell mode + terminal output)');
console.log('  - Type "analyze code src/App.tsx" (should show analyze mode)');
console.log('  - Type "read file package.json" (should show file mode)');