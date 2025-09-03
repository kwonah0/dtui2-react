#!/usr/bin/env node

// Debug extraction configuration and behavior

// Mock the config that might be loaded from main.js
const mockConfigs = [
  {
    name: "Built-in defaults",
    config: {
      useCodeBlock: true,
      codeBlockSyntax: 'shell',
      extraction: {
        enabled: true,
        startMarker: '<RESPONSE>',
        endMarker: '</RESPONSE>'
      }
    }
  },
  {
    name: "Main.js config (useCodeBlock: false)",
    config: {
      useCodeBlock: false,
      codeBlockSyntax: 'shell',
      extraction: {
        enabled: true,
        startMarker: '<RESPONSE>',
        endMarker: '</RESPONSE>'
      }
    }
  },
  {
    name: "Broken config (extraction disabled)",
    config: {
      useCodeBlock: false,
      codeBlockSyntax: 'shell',
      extraction: {
        enabled: false,
        startMarker: '<RESPONSE>',
        endMarker: '</RESPONSE>'
      }
    }
  },
  {
    name: "Missing extraction config",
    config: {
      useCodeBlock: false,
      codeBlockSyntax: 'shell'
      // extraction config missing
    }
  }
];

function extractResponse(text, outputConfig) {
  console.log('🔍 extractResponse called with:');
  console.log('  - enabled:', outputConfig.extraction?.enabled);
  console.log('  - startMarker:', outputConfig.extraction?.startMarker);
  console.log('  - endMarker:', outputConfig.extraction?.endMarker);
  
  if (!outputConfig.extraction?.enabled) {
    console.log('❌ Extraction disabled, returning full text');
    return text;
  }
  
  const { startMarker, endMarker } = outputConfig.extraction;
  
  let startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
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
  
  const searchStart = startIndex + startMarker.length;
  let endIndex = text.indexOf(endMarker, searchStart);
  if (endIndex === -1) {
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
  console.log('✅ Extracted response:', JSON.stringify(extracted));
  
  return extracted;
}

const testOutput = '<iframe srcdoc="<RESPONSE> **Hi there!** ~~~~ </RESPONSE>" ~~~';

console.log('🧪 Testing extraction with different configs\n');
console.log('Test input:', JSON.stringify(testOutput));
console.log('');

mockConfigs.forEach((mockConfig, index) => {
  console.log(`=== Test ${index + 1}: ${mockConfig.name} ===`);
  const result = extractResponse(testOutput, mockConfig.config);
  console.log('Result:', JSON.stringify(result));
  console.log('Success:', result !== testOutput ? '✅' : '❌');
  console.log('');
});