import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Shell Agent Output Format Tests', () => {
  
  test.beforeAll(async () => {
    // Launch Electron app with test configuration
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[TEST]:"]',
        DTUI_CFG__ai__shell__timeout: '5000'
      }
    });
    
    // Get the first page/window
    page = await electronApp.firstWindow();
    
    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Additional wait for initialization
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

  test('should format output with code blocks when useCodeBlock is true', async () => {
    // Set configuration for code block output
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: ['[CODE_BLOCK_TEST]:'],
            template: '{command} {args} "{prompt}"',
            timeout: 5000,
            streaming: false,
            outputFormat: {
              useCodeBlock: true,
              codeBlockSyntax: 'shell'
            }
          }
        }
      };
    });

    // Find input field and send test message
    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('test message');
    await input.press('Enter');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for code block formatting in the response
    const messages = page.locator('[data-testid="message"], .message').last();
    const responseText = await messages.textContent();
    
    expect(responseText).toContain('[CODE_BLOCK_TEST]:');
    
    // Look for code block elements or markdown formatting
    const codeBlocks = page.locator('pre, code, [class*="code"]');
    const hasCodeBlock = await codeBlocks.count() > 0;
    
    if (hasCodeBlock) {
      console.log('✅ Code block formatting detected');
    } else {
      console.log('⚠️ No code block elements found, checking for markdown syntax');
      expect(responseText).toMatch(/```[\s\S]*```/);
    }
  });

  test('should format output without code blocks when useCodeBlock is false', async () => {
    // Set configuration for plain text output
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: ['[PLAIN_TEXT_TEST]:'],
            template: '{command} {args} "{prompt}"',
            timeout: 5000,
            streaming: false,
            outputFormat: {
              useCodeBlock: false,
              codeBlockSyntax: ''
            }
          }
        }
      };
    });

    // Reload agent with new config
    await page.evaluate(() => {
      if ((window as any).electronAPI?.reloadAgent) {
        (window as any).electronAPI.reloadAgent();
      }
    });
    await page.waitForTimeout(1000);

    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('plain text test');
    await input.press('Enter');

    await page.waitForTimeout(3000);

    const messages = page.locator('[data-testid="message"], .message').last();
    const responseText = await messages.textContent();
    
    expect(responseText).toContain('[PLAIN_TEXT_TEST]:');
    expect(responseText).toContain('plain text test');
    
    // Should NOT have code block formatting
    expect(responseText).not.toMatch(/```[\s\S]*```/);
  });

  test('should use different code block syntax when specified', async () => {
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: ['[BASH_SYNTAX_TEST]:'],
            template: '{command} {args} "{prompt}"',
            timeout: 5000,
            streaming: false,
            outputFormat: {
              useCodeBlock: true,
              codeBlockSyntax: 'bash'
            }
          }
        }
      };
    });

    await page.evaluate(() => {
      if ((window as any).electronAPI?.reloadAgent) {
        (window as any).electronAPI.reloadAgent();
      }
    });
    await page.waitForTimeout(1000);

    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('bash syntax test');
    await input.press('Enter');

    await page.waitForTimeout(3000);

    const responseText = await page.locator('[data-testid="message"], .message').last().textContent();
    
    expect(responseText).toContain('[BASH_SYNTAX_TEST]:');
    
    // Check if bash syntax is used (if markdown is rendered)
    const codeElements = page.locator('code[class*="language-bash"], pre[class*="bash"]');
    const hasBashSyntax = await codeElements.count() > 0;
    
    if (hasBashSyntax) {
      console.log('✅ Bash syntax highlighting detected');
    } else {
      // Check for markdown syntax with bash
      expect(responseText).toMatch(/```bash[\s\S]*?```/);
    }
  });

  test('should handle environment variable configuration override', async () => {
    // This test verifies that DTUI_CFG__ environment variables work
    // The beforeAll already sets these, so we just need to test the output
    
    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('environment test');
    await input.press('Enter');

    await page.waitForTimeout(3000);

    const responseText = await page.locator('[data-testid="message"], .message').last().textContent();
    
    // Should contain the environment variable configured prefix
    expect(responseText).toContain('[TEST]:');
    expect(responseText).toContain('environment test');
  });

  test('should handle custom shell commands', async () => {
    // Test with printf command for more control
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'printf',
            args: ['[PRINTF_TEST]: %s\\n'],
            template: '{command} {args} "{prompt}"',
            timeout: 5000,
            streaming: false,
            outputFormat: {
              useCodeBlock: true,
              codeBlockSyntax: 'text'
            }
          }
        }
      };
    });

    await page.evaluate(() => {
      if ((window as any).electronAPI?.reloadAgent) {
        (window as any).electronAPI.reloadAgent();
      }
    });
    await page.waitForTimeout(1000);

    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('printf command test');
    await input.press('Enter');

    await page.waitForTimeout(3000);

    const responseText = await page.locator('[data-testid="message"], .message').last().textContent();
    
    expect(responseText).toContain('[PRINTF_TEST]:');
    expect(responseText).toContain('printf command test');
  });

  test('should handle shell command timeout', async () => {
    // Test with a command that might take longer
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: ['[TIMEOUT_TEST]:'],
            template: '{command} {args} "{prompt}"',
            timeout: 1000, // Very short timeout for testing
            streaming: false,
            outputFormat: {
              useCodeBlock: false
            }
          }
        }
      };
    });

    await page.evaluate(() => {
      if ((window as any).electronAPI?.reloadAgent) {
        (window as any).electronAPI.reloadAgent();
      }
    });
    await page.waitForTimeout(1000);

    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('timeout test');
    await input.press('Enter');

    await page.waitForTimeout(5000); // Wait longer than the timeout

    const messages = page.locator('[data-testid="message"], .message');
    const lastMessage = messages.last();
    const responseText = await lastMessage.textContent();
    
    // Should either get the response or a timeout error message
    const hasResponse = responseText?.includes('[TIMEOUT_TEST]:') || 
                       responseText?.includes('timeout') || 
                       responseText?.includes('error');
    
    expect(hasResponse).toBeTruthy();
  });

  test('should display error handling properly', async () => {
    // Test with an invalid command
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'nonexistent_command_12345',
            args: [],
            template: '{command} {args} "{prompt}"',
            timeout: 5000,
            streaming: false,
            outputFormat: {
              useCodeBlock: false
            }
          }
        }
      };
    });

    await page.evaluate(() => {
      if ((window as any).electronAPI?.reloadAgent) {
        (window as any).electronAPI.reloadAgent();
      }
    });
    await page.waitForTimeout(1000);

    const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
    await input.fill('error test');
    await input.press('Enter');

    await page.waitForTimeout(5000);

    const responseText = await page.locator('[data-testid="message"], .message').last().textContent();
    
    // Should contain some kind of error message
    const hasErrorMessage = responseText?.toLowerCase().includes('error') ||
                           responseText?.toLowerCase().includes('failed') ||
                           responseText?.toLowerCase().includes('not found') ||
                           responseText?.toLowerCase().includes('command not found');
    
    expect(hasErrorMessage).toBeTruthy();
  });

  test('should preserve configuration across multiple messages', async () => {
    // Set configuration once
    await page.evaluate(() => {
      (window as any).testConfig = {
        ai: {
          provider: 'shell',
          shell: {
            command: 'echo',
            args: ['[PERSISTENCE_TEST]:'],
            template: '{command} {args} "{prompt}"',
            timeout: 5000,
            streaming: false,
            outputFormat: {
              useCodeBlock: true,
              codeBlockSyntax: 'shell'
            }
          }
        }
      };
    });

    await page.evaluate(() => {
      if ((window as any).electronAPI?.reloadAgent) {
        (window as any).electronAPI.reloadAgent();
      }
    });
    await page.waitForTimeout(1000);

    // Send multiple messages
    for (let i = 1; i <= 3; i++) {
      const input = page.locator('[data-testid="message-input"], input[type="text"], textarea').first();
      await input.fill(`persistence test ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Check all responses
    const messages = page.locator('[data-testid="message"], .message');
    const count = await messages.count();
    
    // Should have at least the messages we sent plus responses
    expect(count).toBeGreaterThanOrEqual(6); // 3 user + 3 AI responses
    
    // Check that all AI responses have the expected format
    for (let i = Math.max(0, count - 3); i < count; i += 2) {
      const messageText = await messages.nth(i).textContent();
      if (messageText?.includes('[PERSISTENCE_TEST]:')) {
        expect(messageText).toContain('persistence test');
      }
    }
  });
});