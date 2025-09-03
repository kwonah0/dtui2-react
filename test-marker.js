#!/usr/bin/env node

// Test marker extraction functionality
const testCases = [
  {
    name: "Basic marker extraction",
    text: "Some prefix text\n<RESPONSE>\nThis is the response\n</RESPONSE>\nSome suffix text",
    expected: "This is the response"
  },
  {
    name: "Inline markers",
    text: "Here is the answer: <RESPONSE>42</RESPONSE> and that's it.",
    expected: "42"
  },
  {
    name: "Markers with extra whitespace",
    text: "Before\n  <RESPONSE>  \n  Extracted content  \n  </RESPONSE>  \nAfter",
    expected: "Extracted content"
  },
  {
    name: "Multiline content",
    text: "Prefix<RESPONSE>\nLine 1\nLine 2\nLine 3\n</RESPONSE>Suffix",
    expected: "Line 1\nLine 2\nLine 3"
  },
  {
    name: "No markers",
    text: "Just plain text without any markers",
    expected: "Just plain text without any markers"
  },
  {
    name: "Only start marker",
    text: "Text <RESPONSE> more text but no end",
    expected: "Text <RESPONSE> more text but no end"
  },
  {
    name: "Multiple marker pairs (should take first)",
    text: "A<RESPONSE>first</RESPONSE>B<RESPONSE>second</RESPONSE>C",
    expected: "first"
  }
];

function extractResponse(text, config = { enabled: true, startMarker: '<RESPONSE>', endMarker: '</RESPONSE>' }) {
  if (!config.enabled) {
    return text;
  }
  
  const { startMarker, endMarker } = config;
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const extracted = text.substring(startIndex + startMarker.length, endIndex).trim();
    console.log('✅ Extracted:', { startIndex, endIndex, extracted: extracted.slice(0, 50) + (extracted.length > 50 ? '...' : '') });
    return extracted;
  }
  
  console.log('⚠️ Markers not found, using fallback');
  return text;
}

console.log('🧪 Testing marker extraction functionality\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: ${JSON.stringify(testCase.text)}`);
  
  const result = extractResponse(testCase.text);
  const passed = result === testCase.expected;
  
  console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
  console.log(`Got:      ${JSON.stringify(result)}`);
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});