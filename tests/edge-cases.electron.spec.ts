import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Edge Cases and Error Handling Tests', () => {

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('should handle invalid JSON in environment variables gracefully', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: 'invalid-json-array', // Invalid JSON
        DTUI_CFG__ai__shell__template: '{command} {args} "{prompt}"'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // App should still start and use fallback configuration
    const input = page.locator('[data-testid="message-input"]');
    expect(input).toBeVisible();
    
    await input.fill('invalid json test');
    await input.press('Enter');
    await page.waitForTimeout(4000);

    // Should get some kind of response (fallback behavior)
    const messages = page.locator('[data-testid="message"]');
    const count = await messages.count();
    expect(count).toBeGreaterThan(0);
    
    await electronApp.close();
  });

  test('should handle very long messages', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[LONG_MESSAGE_TEST]:"]'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Create a very long message (4000 characters)
    const longMessage = 'A'.repeat(4000);
    
    const input = page.locator('[data-testid="message-input"]');
    await input.fill(longMessage);
    await input.press('Enter');
    await page.waitForTimeout(5000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    expect(messageText).toContain('[LONG_MESSAGE_TEST]:');
    // The response should contain the long message (truncated or not)
    expect(messageText?.length).toBeGreaterThan(100);
    
    await electronApp.close();
  });

  test('should handle special characters and escaping', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[SPECIAL_CHARS]:"]',
        DTUI_CFG__ai__shell__template: '{command} {args} "{prompt}"'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Test message with special characters
    const specialMessage = 'Test with "quotes" & ampersands & $variables & `backticks` & newlines\\n\\r';
    
    const input = page.locator('[data-testid="message-input"]');
    await input.fill(specialMessage);
    await input.press('Enter');
    await page.waitForTimeout(4000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    expect(messageText).toContain('[SPECIAL_CHARS]:');
    // Should handle special characters without breaking
    expect(messageText).toContain('quotes');
    expect(messageText).toContain('ampersands');
    
    await electronApp.close();
  });

  test('should handle rapid consecutive messages', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[RAPID_TEST]:"]'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    
    // Send 5 messages rapidly
    for (let i = 1; i <= 5; i++) {
      await input.fill(`rapid message ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(200); // Short delay between sends
    }
    
    // Wait for all responses
    await page.waitForTimeout(8000);

    const messages = page.locator('[data-testid="message"]');
    const count = await messages.count();
    
    // Should have at least 10 messages (5 user + 5 AI responses)
    expect(count).toBeGreaterThanOrEqual(10);
    
    // Check that responses contain the expected content
    for (let i = Math.max(0, count - 5); i < count; i++) {
      const messageText = await messages.nth(i).textContent();
      if (messageText?.includes('[RAPID_TEST]:')) {
        expect(messageText).toContain('rapid message');
      }
    }
    
    await electronApp.close();
  });

  test('should handle shell command timeout gracefully', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'sleep', // Command that will timeout
        DTUI_CFG__ai__shell__args: '["10"]',   // Sleep for 10 seconds
        DTUI_CFG__ai__shell__template: '{command} {args}',
        DTUI_CFG__ai__shell__timeout: '2000'   // 2 second timeout
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    await input.fill('timeout test');
    await input.press('Enter');
    
    // Wait longer than the timeout
    await page.waitForTimeout(6000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    // Should contain some kind of timeout or error message
    const hasTimeoutMessage = messageText?.toLowerCase().includes('timeout') ||
                             messageText?.toLowerCase().includes('error') ||
                             messageText?.toLowerCase().includes('failed') ||
                             messageText?.includes('killed');
    
    expect(hasTimeoutMessage).toBeTruthy();
    
    await electronApp.close();
  });

  test('should handle empty messages gracefully', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[EMPTY_TEST]:"]'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    // Try to send empty message
    await input.fill('');
    
    // Send button should be disabled
    expect(await sendButton.isDisabled()).toBe(true);
    
    // Try with just whitespace
    await input.fill('   ');
    expect(await sendButton.isDisabled()).toBe(true);
    
    // Valid message should enable button
    await input.fill('valid message');
    expect(await sendButton.isDisabled()).toBe(false);
    
    await electronApp.close();
  });

  test('should maintain UI responsiveness during processing', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[RESPONSIVENESS_TEST]:"]'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    const clearButton = page.locator('[data-testid="clear-button"]');
    
    // Send a message
    await input.fill('responsiveness test');
    await input.press('Enter');
    
    // UI should still be interactive while processing
    await page.waitForTimeout(500);
    
    // Clear button should still be clickable
    expect(clearButton).toBeVisible();
    expect(await clearButton.isEnabled()).toBe(true);
    
    // Input field should be disabled during processing
    expect(await input.isDisabled()).toBe(true);
    
    // Wait for response
    await page.waitForTimeout(4000);
    
    // Input should be re-enabled after processing
    expect(await input.isDisabled()).toBe(false);
    
    await electronApp.close();
  });

  test('should handle markdown formatting edge cases', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[MARKDOWN_TEST]:"]',
        DTUI_CFG__ai__shell__outputFormat__useCodeBlock: 'true',
        DTUI_CFG__ai__shell__outputFormat__codeBlockSyntax: 'shell'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    await input.fill('test with **bold** and `code` and [links](http://example.com)');
    await input.press('Enter');
    await page.waitForTimeout(4000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    expect(messageText).toContain('[MARKDOWN_TEST]:');
    
    // Should contain the markdown content
    expect(messageText).toContain('bold');
    expect(messageText).toContain('code');
    expect(messageText).toContain('links');
    
    await electronApp.close();
  });
});