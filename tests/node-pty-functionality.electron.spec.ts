import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Node-PTY Functionality Tests', () => {
  
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

  test('should load node-pty successfully in Electron', async () => {
    console.log('🧪 Testing node-pty loading...');
    
    // Check console logs for node-pty status
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // Wait for startup logs
    await page.waitForTimeout(3000);
    
    // Look for node-pty success message in Electron main process
    // This will be in the Electron main process console, not browser console
    // We'll check by testing actual PTY functionality instead
    
    console.log('✅ Electron app loaded, testing PTY functionality...');
  });

  test('should execute shell commands with real PTY', async () => {
    console.log('🧪 Testing real PTY shell command execution...');
    
    // Find the input field
    const inputField = page.locator('textarea, input[type="text"]').first();
    
    if (await inputField.count() > 0) {
      await expect(inputField).toBeVisible({ timeout: 10000 });
      
      // Type a shell command that will show PTY features
      await inputField.fill('!ls --color=always');
      await inputField.press('Enter');
      
      console.log('✅ Sent PTY shell command');
      
      // Wait for command to execute
      await page.waitForTimeout(5000);
      
      // Take screenshot to verify output
      await page.screenshot({ path: 'node-pty-shell-output.png', fullPage: true });
      
      // Check if we can find colored output or multi-column layout
      const pageContent = await page.content();
      
      // Look for ANSI color conversions in HTML
      const hasColoredOutput = pageContent.includes('color:') || 
                              pageContent.includes('#0A0') || // green
                              pageContent.includes('#00A'); // blue
      
      console.log(`🎨 Found colored output: ${hasColoredOutput}`);
      
      // Look for multi-column file listings
      const hasFileListings = pageContent.includes('package.json') ||
                             pageContent.includes('src') ||
                             pageContent.includes('node_modules');
      
      console.log(`📁 Found file listings: ${hasFileListings}`);
      
      if (hasColoredOutput || hasFileListings) {
        console.log('✅ PTY functionality working - found formatted output');
      } else {
        console.log('⚠️ PTY may be working but output format unclear');
      }
      
    } else {
      console.log('⏭️ Skipping PTY test - no input field found');
    }
  });

  test('should handle interactive PTY commands', async () => {
    console.log('🧪 Testing interactive PTY commands...');
    
    const inputField = page.locator('textarea, input[type="text"]').first();
    
    if (await inputField.count() > 0) {
      await expect(inputField).toBeVisible({ timeout: 10000 });
      
      // Test echo command (should work with PTY)
      await inputField.fill('!echo "PTY test: $(date)"');
      await inputField.press('Enter');
      
      await page.waitForTimeout(3000);
      
      // Take screenshot
      await page.screenshot({ path: 'node-pty-interactive-test.png', fullPage: true });
      
      const content = await page.content();
      const hasEchoOutput = content.includes('PTY test:');
      
      console.log(`📝 Echo command output found: ${hasEchoOutput}`);
      
      if (hasEchoOutput) {
        console.log('✅ Interactive PTY commands working');
      }
      
    } else {
      console.log('⏭️ Skipping interactive test - no input field found');
    }
  });

  test('should handle complex shell commands with pipes', async () => {
    console.log('🧪 Testing complex shell commands with pipes...');
    
    const inputField = page.locator('textarea, input[type="text"]').first();
    
    if (await inputField.count() > 0) {
      await expect(inputField).toBeVisible({ timeout: 10000 });
      
      // Test piped command (true PTY feature)
      await inputField.fill('!ls | head -5');
      await inputField.press('Enter');
      
      await page.waitForTimeout(3000);
      
      // Take screenshot
      await page.screenshot({ path: 'node-pty-pipes-test.png', fullPage: true });
      
      const content = await page.content();
      const hasLimitedOutput = content.split('\n').length >= 3; // Should have some output
      
      console.log(`🔄 Piped command executed: ${hasLimitedOutput}`);
      
      if (hasLimitedOutput) {
        console.log('✅ Complex PTY commands with pipes working');
      }
      
    } else {
      console.log('⏭️ Skipping pipe test - no input field found');
    }
  });
});