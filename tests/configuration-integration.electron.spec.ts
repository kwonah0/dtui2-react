import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Configuration Integration Tests', () => {
  
  test.afterEach(async () => {
    // Clean up any test config files
    const tempConfigPath = path.join(os.tmpdir(), 'dtui-test-config.json');
    await fs.unlink(tempConfigPath).catch(() => {});
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('should respect environment variable configuration (DTUI_CFG__)', async () => {
    // Launch with specific environment variables
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_CFG__ai__shell__command: 'printf',
        DTUI_CFG__ai__shell__args: '["[ENV_TEST]: %s\\n"]',
        DTUI_CFG__ai__shell__template: '{command} {args} "{prompt}"',
        DTUI_CFG__ai__shell__outputFormat__useCodeBlock: 'false'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Wait for initialization

    // Send test message
    const input = page.locator('[data-testid="message-input"]');
    await input.fill('environment variable test');
    await input.press('Enter');

    await page.waitForTimeout(4000);

    // Check response contains environment variable configured output
    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    expect(messageText).toContain('[ENV_TEST]:');
    expect(messageText).toContain('environment variable test');
    
    await electronApp.close();
  });

  test('should use custom config file when DTUI_USER_CONFIGFILE is set', async () => {
    // Create temporary config file
    const tempConfigPath = path.join(os.tmpdir(), 'dtui-test-config.json');
    const testConfig = {
      ai: {
        provider: 'shell',
        shell: {
          command: 'echo',
          args: ['[CUSTOM_CONFIG_FILE]:'],
          template: '{command} {args} "{prompt}"',
          timeout: 5000,
          streaming: false,
          outputFormat: {
            useCodeBlock: true,
            codeBlockSyntax: 'text'
          }
        }
      },
      terminal: {
        shell: '/bin/bash',
        columns: 80,
        lines: 24
      },
      ui: {
        theme: 'dark',
        fontSize: 14
      }
    };

    await fs.writeFile(tempConfigPath, JSON.stringify(testConfig, null, 2));

    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_USER_CONFIGFILE: tempConfigPath
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    await input.fill('custom config file test');
    await input.press('Enter');

    await page.waitForTimeout(4000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    expect(messageText).toContain('[CUSTOM_CONFIG_FILE]:');
    expect(messageText).toContain('custom config file test');
    
    await electronApp.close();
  });

  test('should prioritize environment variables over config file', async () => {
    // Create config file with one setting
    const tempConfigPath = path.join(os.tmpdir(), 'dtui-test-config.json');
    const testConfig = {
      ai: {
        provider: 'shell',
        shell: {
          command: 'echo',
          args: ['[CONFIG_FILE]:'], // This should be overridden
          template: '{command} {args} "{prompt}"',
          timeout: 5000,
          streaming: false,
          outputFormat: {
            useCodeBlock: false
          }
        }
      }
    };

    await fs.writeFile(tempConfigPath, JSON.stringify(testConfig, null, 2));

    // Launch with environment variables that override the config file
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        DTUI_USER_CONFIGFILE: tempConfigPath,
        // These should take priority over the config file
        DTUI_CFG__ai__shell__args: '["[ENV_OVERRIDE]:"]'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    await input.fill('priority test');
    await input.press('Enter');

    await page.waitForTimeout(4000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    // Should contain the environment variable override, not the config file value
    expect(messageText).toContain('[ENV_OVERRIDE]:');
    expect(messageText).not.toContain('[CONFIG_FILE]:');
    expect(messageText).toContain('priority test');
    
    await electronApp.close();
  });

  test('should fall back to built-in defaults when no config is provided', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test'
        // No config file or environment variables set
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    await input.fill('default config test');
    await input.press('Enter');

    await page.waitForTimeout(4000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    // Should use the built-in default configuration
    // Based on dtui.json, this should be echo with "[SHELL RESPONSE]:"
    expect(messageText).toContain('[SHELL RESPONSE]:');
    expect(messageText).toContain('default config test');
    
    await electronApp.close();
  });

  test('should handle complex nested environment variable configuration', async () => {
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        NODE_ENV: 'test',
        // Test nested configuration parsing
        DTUI_CFG__ai__provider: 'shell',
        DTUI_CFG__ai__shell__command: 'echo',
        DTUI_CFG__ai__shell__args: '["[NESTED_TEST]:"]',
        DTUI_CFG__ai__shell__template: '{command} {args} "{prompt}"',
        DTUI_CFG__ai__shell__timeout: '3000',
        DTUI_CFG__ai__shell__streaming: 'false',
        DTUI_CFG__ai__shell__outputFormat__useCodeBlock: 'true',
        DTUI_CFG__ai__shell__outputFormat__codeBlockSyntax: 'bash',
        DTUI_CFG__terminal__shell: '/bin/bash',
        DTUI_CFG__ui__theme: 'dark'
      }
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const input = page.locator('[data-testid="message-input"]');
    await input.fill('nested config test');
    await input.press('Enter');

    await page.waitForTimeout(4000);

    const lastMessage = page.locator('[data-testid="message"]').last();
    const messageText = await lastMessage.textContent();
    
    expect(messageText).toContain('[NESTED_TEST]:');
    expect(messageText).toContain('nested config test');
    
    // Check for code block formatting (should be enabled)
    const codeBlocks = page.locator('pre, code, [class*="code"]');
    const hasCodeBlock = await codeBlocks.count() > 0;
    
    if (!hasCodeBlock) {
      // Check for markdown code block syntax
      expect(messageText).toMatch(/```[\s\S]*```/);
    }
    
    await electronApp.close();
  });
});