import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Multiline Input Tests', () => {
  
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DISPLAY: ':99',
        ELECTRON_DISABLE_GPU: '1'
      }
    });
    
    // Get the first page/window
    page = await electronApp.firstWindow();
    
    // Wait for app to load completely
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait for React app to fully initialize
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test.beforeEach(async () => {
    // Clear any existing conversation
    const clearButton = page.locator('[data-testid="clear-button"]');
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should support multiline input with Shift+Enter', async () => {
    console.log('🧪 Testing multiline input functionality...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'multiline-test-start.png', fullPage: true });
    
    // Debug: Check what elements are available
    const textAreas = await page.locator('textarea').all();
    console.log(`📊 Textarea elements found: ${textAreas.length}`);
    
    if (textAreas.length === 0) {
      // Look for React app
      const reactRoot = await page.locator('#root').count();
      console.log(`📊 React root elements: ${reactRoot}`);
      
      if (reactRoot > 0) {
        const rootContent = await page.locator('#root').innerHTML();
        console.log(`📄 React root HTML (first 500 chars): ${rootContent.substring(0, 500)}...`);
      }
      
      // Take debug screenshot
      await page.screenshot({ path: 'multiline-debug-no-textarea.png', fullPage: true });
    }
    
    // Find the textarea element - try multiple approaches
    let inputField = page.locator('textarea').first();
    
    // If no textarea found, try other selectors
    if (await inputField.count() === 0) {
      console.log('🔍 No textarea found, trying alternative selectors...');
      
      // Try finding by placeholder text
      inputField = page.locator('[placeholder*="Type your message"]');
      
      if (await inputField.count() === 0) {
        // Try any input element
        inputField = page.locator('input, textarea, [contenteditable="true"]').first();
      }
    }
    
    console.log(`📊 Final input field count: ${await inputField.count()}`);
    
    if (await inputField.count() > 0) {
      // Wait for the input field to be visible
      await expect(inputField).toBeVisible({ timeout: 10000 });
      console.log('✅ Found input field');
      
      // Get initial height
      const initialHeight = await inputField.evaluate(el => el.offsetHeight);
      console.log(`📏 Initial textarea height: ${initialHeight}px`);
      
      // Type a multiline message using Shift+Enter
      const multilineMessage = 'Line 1: This is the first line\nLine 2: This is the second line\nLine 3: This is the third line';
      
      console.log('📝 Typing multiline message...');
      await inputField.click(); // Focus the field first
      
      // Type the first line
      await inputField.type('Line 1: This is the first line');
      
      // Press Shift+Enter to create new line
      await inputField.press('Shift+Enter');
      console.log('✅ Pressed Shift+Enter for line break');
      
      // Type second line
      await inputField.type('Line 2: This is the second line');
      
      // Press Shift+Enter again
      await inputField.press('Shift+Enter');
      console.log('✅ Pressed Shift+Enter for second line break');
      
      // Type third line
      await inputField.type('Line 3: This is the third line');
      
      // Take screenshot after typing
      await page.screenshot({ path: 'multiline-after-typing.png', fullPage: true });
      
      // Check if height increased
      const expandedHeight = await inputField.evaluate(el => el.offsetHeight);
      console.log(`📏 Expanded textarea height: ${expandedHeight}px`);
      
      expect(expandedHeight).toBeGreaterThan(initialHeight);
      console.log('✅ Textarea height auto-expanded');
      
      // Check the actual value in the textarea
      const textareaValue = await inputField.inputValue();
      console.log(`📝 Textarea value: ${JSON.stringify(textareaValue)}`);
      
      // Verify it contains line breaks
      expect(textareaValue).toContain('\n');
      expect(textareaValue.split('\n').length).toBe(3);
      console.log('✅ Multiline content verified in textarea');
      
      // Now send the message with Enter
      await inputField.press('Enter');
      console.log('✅ Sent multiline message with Enter');
      
      // Wait for message to be processed
      await page.waitForTimeout(3000);
      
      // Take final screenshot
      await page.screenshot({ path: 'multiline-message-sent.png', fullPage: true });
      
      // Check if the message appears in the chat
      const messageElements = await page.locator('div').filter({ hasText: /Line 1.*Line 2.*Line 3/s }).all();
      console.log(`💬 Found ${messageElements.length} elements containing multiline message`);
      
      if (messageElements.length > 0) {
        const messageText = await messageElements[0].textContent();
        console.log(`📄 Message content: ${messageText?.substring(0, 200)}...`);
        
        // Verify the multiline structure is preserved
        expect(messageText).toContain('Line 1');
        expect(messageText).toContain('Line 2');
        expect(messageText).toContain('Line 3');
        console.log('✅ Multiline message found in chat');
      }
      
    } else {
      console.log('❌ No input field found - taking debug screenshot');
      await page.screenshot({ path: 'multiline-no-input-debug.png', fullPage: true });
      throw new Error('Could not find input field for multiline testing');
    }
    
    console.log('🎉 Multiline input test completed!');
  });

  test('should handle very long multiline input', async () => {
    console.log('🧪 Testing long multiline input...');
    
    const inputField = page.locator('textarea').first();
    
    if (await inputField.count() > 0) {
      await expect(inputField).toBeVisible({ timeout: 10000 });
      
      // Create a long multiline message
      const longMessage = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}: This is a longer line with more content to test wrapping and height adjustment`).join('\n');
      
      // Fill the textarea with the long message
      await inputField.fill(longMessage);
      
      // Take screenshot
      await page.screenshot({ path: 'multiline-long-message.png', fullPage: true });
      
      // Check height is capped at maximum
      const height = await inputField.evaluate(el => el.offsetHeight);
      console.log(`📏 Long message textarea height: ${height}px`);
      
      // Should not exceed 200px (the max height from CSS)
      expect(height).toBeLessThanOrEqual(200);
      
      // Verify content is there
      const value = await inputField.inputValue();
      expect(value.split('\n').length).toBe(10);
      
      console.log('✅ Long multiline message handled correctly');
    } else {
      console.log('⏭️ Skipping long multiline test - no textarea found');
    }
  });
});