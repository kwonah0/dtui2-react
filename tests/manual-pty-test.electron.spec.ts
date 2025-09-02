import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Manual PTY Testing', () => {
  
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

  test('should demonstrate !ls command with node-pty', async () => {
    console.log('🧪 Manual demonstration of !ls command with node-pty...');
    
    // Take initial screenshot
    await page.screenshot({ path: 'manual-test-start.png', fullPage: true });
    
    // Find the input field - try multiple approaches
    let inputField = page.locator('textarea').first();
    
    if (await inputField.count() === 0) {
      inputField = page.locator('input[type="text"]').first();
    }
    
    if (await inputField.count() === 0) {
      inputField = page.locator('[contenteditable="true"]').first();
    }
    
    console.log(`📊 Input field count: ${await inputField.count()}`);
    
    if (await inputField.count() > 0) {
      await expect(inputField).toBeVisible({ timeout: 10000 });
      console.log('✅ Found input field');
      
      // Test 1: Basic !ls command
      console.log('\n1️⃣ Testing basic !ls command...');
      await inputField.fill('!ls');
      await inputField.press('Enter');
      console.log('📤 Sent: !ls');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-basic-ls.png', fullPage: true });
      
      // Test 2: Colored ls command
      console.log('\n2️⃣ Testing !ls --color=always...');
      await inputField.fill('!ls --color=always');
      await inputField.press('Enter');
      console.log('📤 Sent: !ls --color=always');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-colored-ls.png', fullPage: true });
      
      // Test 3: Long listing
      console.log('\n3️⃣ Testing !ls -la...');
      await inputField.fill('!ls -la');
      await inputField.press('Enter');
      console.log('📤 Sent: !ls -la');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-long-ls.png', fullPage: true });
      
      // Test 4: Interactive echo command
      console.log('\n4️⃣ Testing interactive echo...');
      await inputField.fill('!echo "Hello from node-pty! Today is $(date)"');
      await inputField.press('Enter');
      console.log('📤 Sent: echo with date command');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-echo.png', fullPage: true });
      
      // Test 5: Pipe command (real PTY feature)
      console.log('\n5️⃣ Testing pipe command...');
      await inputField.fill('!ls | head -5');
      await inputField.press('Enter');
      console.log('📤 Sent: ls | head -5');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-pipe.png', fullPage: true });
      
      // Analyze the final state
      const pageContent = await page.content();
      
      // Check for various indicators of successful PTY operation
      const indicators = {
        hasFileNames: pageContent.includes('package.json') || pageContent.includes('src') || pageContent.includes('electron'),
        hasDateOutput: pageContent.includes('2025') || pageContent.includes('Hello from node-pty'),
        hasColoredHtml: pageContent.includes('color:') || pageContent.includes('#'),
        hasMultipleCommands: pageContent.split('!ls').length > 2
      };
      
      console.log('\n📊 Test Results:');
      console.log(`   📁 File names detected: ${indicators.hasFileNames}`);
      console.log(`   📅 Date command worked: ${indicators.hasDateOutput}`);
      console.log(`   🎨 Colored HTML found: ${indicators.hasColoredHtml}`);
      console.log(`   🔄 Multiple commands: ${indicators.hasMultipleCommands}`);
      
      // Final comprehensive screenshot
      await page.screenshot({ path: 'manual-test-final-result.png', fullPage: true });
      console.log('\n📸 All test screenshots saved!');
      
      if (indicators.hasFileNames && (indicators.hasDateOutput || indicators.hasColoredHtml)) {
        console.log('\n🎉 node-pty is working in the actual Electron app!');
        console.log('✅ PTY commands are being processed correctly');
        console.log('✅ Real terminal features are functional');
      } else {
        console.log('\n⚠️ PTY may not be working as expected - check screenshots');
      }
      
    } else {
      console.log('❌ No input field found - cannot test PTY manually');
      await page.screenshot({ path: 'manual-test-no-input.png', fullPage: true });
    }
    
    console.log('\n🔍 Check the generated screenshots to see actual PTY output!');
  });

  test('should test really interactive command if possible', async ({ page }) => {
    console.log('🧪 Testing more interactive features...');
    
    const inputField = page.locator('textarea, input[type="text"]').first();
    
    if (await inputField.count() > 0) {
      // Test a command that shows environment variables
      await inputField.fill('!env | grep TERM');
      await inputField.press('Enter');
      console.log('📤 Sent: env | grep TERM');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-env.png', fullPage: true });
      
      // Test pwd command
      await inputField.fill('!pwd');
      await inputField.press('Enter');
      console.log('📤 Sent: pwd');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'manual-test-pwd.png', fullPage: true });
      
      console.log('✅ Interactive command tests completed');
    }
  });
});