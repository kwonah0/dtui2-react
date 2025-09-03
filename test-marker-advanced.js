#!/usr/bin/env node

// Test advanced marker extraction functionality
const testCases = [
  {
    name: "Case insensitive markers",
    text: "Some text\n<response>\nExtracted content\n</response>\nMore text",
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: "Extracted content"
  },
  {
    name: "Mixed case markers", 
    text: "Text <Response>Mixed case content</RESPONSE> end",
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: "Mixed case content"
  },
  {
    name: "Nested similar markers",
    text: "A<RESPONSE>First<RESPONSE>Nested</RESPONSE>End</RESPONSE>B",
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: "First<RESPONSE>Nested"
  },
  {
    name: "Custom markers",
    text: "Prefix ### START ###\nCustom extracted content\n### END ### Suffix",
    config: { enabled: true, startMarker: '### START ###', endMarker: '### END ###' },
    expected: "Custom extracted content"
  },
  {
    name: "Markers in middle of lines",
    text: "Some long line with <RESPONSE>inline content</RESPONSE> and more text after",
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: "inline content"
  },
  {
    name: "Empty extraction",
    text: "Text <RESPONSE></RESPONSE> more text",
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: ""
  },
  {
    name: "Whitespace only extraction",
    text: "Text <RESPONSE>   \n\n  </RESPONSE> more text",
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: ""
  },
  {
    name: "Real-world LLM output",
    text: `Here's your analysis:

The code looks good, but I found some issues:

<RESPONSE>
1. Memory leak in line 42
2. Missing error handling in function processData()
3. Deprecated API usage in networking module

Suggested fixes:
- Add try-catch blocks
- Update to latest API version
- Use proper cleanup in destructors
</RESPONSE>

Let me know if you need more details!`,
    config: { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' },
    expected: `1. Memory leak in line 42
2. Missing error handling in function processData()
3. Deprecated API usage in networking module

Suggested fixes:
- Add try-catch blocks
- Update to latest API version
- Use proper cleanup in destructors`
  }
];

function extractResponse(text, config) {
  if (!config.enabled) {
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
  
  const extracted = text.substring(startIndex + startMarker.length, endIndex).trim();
  console.log('✅ Extracted:', { 
    startIndex, 
    endIndex, 
    extractedLength: extracted.length,
    preview: extracted.slice(0, 50) + (extracted.length > 50 ? '...' : '')
  });
  
  return extracted;
}

console.log('🔬 Testing advanced marker extraction functionality\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Markers: "${testCase.config.startMarker}" ... "${testCase.config.endMarker}"`);
  
  const result = extractResponse(testCase.text, testCase.config);
  const passed = result === testCase.expected;
  
  console.log(`Expected (${testCase.expected.length} chars): ${JSON.stringify(testCase.expected.slice(0, 100))}`);
  console.log(`Got      (${result.length} chars): ${JSON.stringify(result.slice(0, 100))}`);
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (!passed) {
    console.log('📋 Full comparison:');
    console.log('Expected:', testCase.expected);
    console.log('Got:', result);
    console.log('---\n');
  }
});