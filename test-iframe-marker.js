#!/usr/bin/env node

// Test marker extraction with the problematic iframe output
const problematicOutput = `<iframe srcdoc="<RESPONSE> **Hi there!** ~~~~ </RESPONSE>" ~~~`;

console.log('🔬 Testing marker extraction with problematic iframe output\n');

function extractResponse(text, config = { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' }) {
  console.log('📝 Input text:', JSON.stringify(text));
  console.log('⚙️ Config:', config);
  
  if (!config.enabled) {
    console.log('❌ Extraction disabled, returning full text');
    return text;
  }
  
  const { startMarker, endMarker } = config;
  
  // Find start marker (case-insensitive search as fallback)
  let startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    // Try case-insensitive search
    const lowerText = text.toLowerCase();
    const lowerStartMarker = startMarker.toLowerCase();
    startIndex = lowerText.indexOf(lowerStartMarker);
    if (startIndex !== -1) {
      console.log('🔍 Found start marker with case-insensitive search');
    }
  }
  
  if (startIndex === -1) {
    console.log('⚠️ Start marker not found, using fallback (full output)');
    return text;
  }
  
  console.log('✅ Start marker found at index:', startIndex);
  
  // Find end marker after start marker
  const searchStart = startIndex + startMarker.length;
  let endIndex = text.indexOf(endMarker, searchStart);
  if (endIndex === -1) {
    // Try case-insensitive search for end marker
    const lowerText = text.toLowerCase();
    const lowerEndMarker = endMarker.toLowerCase();
    endIndex = lowerText.indexOf(lowerEndMarker, searchStart);
    if (endIndex !== -1) {
      console.log('🔍 Found end marker with case-insensitive search');
    }
  }
  
  if (endIndex === -1) {
    console.log('⚠️ End marker not found, using fallback (full output)');
    return text;
  }
  
  console.log('✅ End marker found at index:', endIndex);
  
  const extracted = text.substring(startIndex + startMarker.length, endIndex).trim();
  console.log('✨ Extracted content:', JSON.stringify(extracted));
  console.log('📊 Extraction details:', { 
    startIndex, 
    endIndex, 
    extractedLength: extracted.length,
    preview: extracted.slice(0, 100) + (extracted.length > 100 ? '...' : '')
  });
  
  return extracted;
}

console.log('=== Testing with problematic iframe output ===');
const result = extractResponse(problematicOutput);

console.log('\n📋 Final Result:');
console.log('Input:   ', JSON.stringify(problematicOutput));
console.log('Output:  ', JSON.stringify(result));
console.log('Expected:', JSON.stringify(' **Hi there!** ~~~~ '));
console.log('Match:   ', result === ' **Hi there!** ~~~~ ' ? '✅ SUCCESS' : '❌ FAILED');

// Test other variations
console.log('\n=== Testing other variations ===');

const testCases = [
  {
    name: "Clean RESPONSE tags",
    text: "<RESPONSE> **Hi there!** ~~~~ </RESPONSE>",
    expected: "**Hi there!** ~~~~"
  },
  {
    name: "RESPONSE tags with newlines",
    text: "<RESPONSE>\n **Hi there!** ~~~~ \n</RESPONSE>",
    expected: "**Hi there!** ~~~~"
  },
  {
    name: "RESPONSE tags in complex HTML",
    text: '<div><span><RESPONSE>Content here</RESPONSE></span></div>',
    expected: "Content here"
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
  const result = extractResponse(testCase.text);
  const passed = result === testCase.expected;
  console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
  console.log(`Got:      ${JSON.stringify(result)}`);
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}`);
});