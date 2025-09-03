#!/usr/bin/env node

// Test shell command with markers
console.log('🧪 Testing shell command with marker extraction\n');

// Simulate shell command that outputs with markers
const testCommands = [
  {
    name: "Echo with markers",
    command: 'echo "Before text <RESPONSE>This is the extracted answer</RESPONSE> After text"'
  },
  {
    name: "Multi-line with markers", 
    command: `echo "Analysis results:
<RESPONSE>
- Issue 1: Memory leak
- Issue 2: Missing validation  
- Issue 3: Performance bottleneck
</RESPONSE>
End of analysis."`
  },
  {
    name: "No markers (fallback test)",
    command: 'echo "This is just plain output without any special markers"'
  }
];

testCommands.forEach((test, index) => {
  console.log(`\n=== Test ${index + 1}: ${test.name} ===`);
  console.log(`Command: ${test.command}`);
  console.log('Output:');
  
  // Execute the command
  const { execSync } = require('child_process');
  try {
    const output = execSync(test.command, { encoding: 'utf8' });
    console.log(output);
    
    // Apply marker extraction
    const extractResponse = (text) => {
      const startMarker = '<RESPONSE>';
      const endMarker = '</RESPONSE>';
      
      let startIndex = text.indexOf(startMarker);
      if (startIndex === -1) {
        const lowerText = text.toLowerCase();
        startIndex = lowerText.indexOf(startMarker.toLowerCase());
      }
      
      if (startIndex === -1) {
        console.log('⚠️ No start marker found, using full output');
        return text;
      }
      
      const searchStart = startIndex + startMarker.length;
      let endIndex = text.indexOf(endMarker, searchStart);
      if (endIndex === -1) {
        const lowerText = text.toLowerCase();
        endIndex = lowerText.indexOf(endMarker.toLowerCase(), searchStart);
      }
      
      if (endIndex === -1) {
        console.log('⚠️ No end marker found, using full output');
        return text;
      }
      
      const extracted = text.substring(startIndex + startMarker.length, endIndex).trim();
      console.log('✅ Extracted content between markers');
      return extracted;
    };
    
    const extractedOutput = extractResponse(output);
    console.log('\n📦 Final extracted output:');
    console.log('---');
    console.log(extractedOutput);
    console.log('---');
    
  } catch (error) {
    console.error('❌ Command failed:', error.message);
  }
});

console.log('\n🎯 Marker extraction testing complete!');