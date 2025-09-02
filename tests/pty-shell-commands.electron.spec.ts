import { test, expect, Page, ElectronApplication, _electron as electron } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('PTY Shell Command Tests', () => {
  
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [resolve('./electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DISPLAY: ':99',
        ELECTRON_DISABLE_GPU: '1',
        ELECTRON_DISABLE_DEV_TOOLS: '1'
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

  test('should display PTY formatted output for !ls command', async () => {
    console.log('🧪 Testing PTY formatted !ls command...');
    
    // Debug: Take screenshot to see what's loaded
    await page.screenshot({ path: 'debug-page-loaded.png', fullPage: true });
    
    // Debug: Check what elements are available
    const allElements = await page.locator('*').all();
    console.log(`📊 Total elements found: ${allElements.length}`);
    
    const textAreas = await page.locator('textarea').all();
    console.log(`📊 Textarea elements found: ${textAreas.length}`);
    
    const inputs = await page.locator('input').all();
    console.log(`📊 Input elements found: ${inputs.length}`);
    
    // Debug: Check page content
    const bodyText = await page.locator('body').textContent();
    console.log(`📄 Page body text (first 200 chars): ${bodyText?.substring(0, 200)}...`);
    
    // Look specifically for our React app elements
    const reactRoot = await page.locator('#root').count();
    console.log(`📊 React root elements: ${reactRoot}`);
    
    if (reactRoot > 0) {
      const rootText = await page.locator('#root').textContent();
      console.log(`📄 React root text (first 200 chars): ${rootText?.substring(0, 200)}...`);
    }
    
    // Try broader search for input field
    const inputField = page.locator('textarea, input, [contenteditable="true"]').first();
    
    await expect(inputField).toBeVisible({ timeout: 10000 });
    console.log('✅ Found input field');
    
    // Type the shell command
    await inputField.fill('!ls');
    console.log('✅ Typed !ls command');
    
    // Submit the command - look for send button
    const sendButton = page.locator('button').filter({ hasText: /send/i }).first();
    
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
      console.log('✅ Clicked send button');
    } else {
      await inputField.press('Enter');
      console.log('✅ Pressed Enter');
    }
    
    // Wait for the shell command to be processed
    await page.waitForTimeout(5000);
    console.log('⏳ Waited for command processing');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'pty-shell-test.png', fullPage: true });
    console.log('📸 Screenshot saved');
    
    // Look for output that contains file/directory listings
    const messageElements = await page.locator('div').filter({ 
      hasText: /src|dist|node_modules|package\.json|README\.md/
    }).all();
    
    console.log(`💬 Found ${messageElements.length} elements with file/directory names`);
    
    let foundPtyFormatting = false;
    
    for (const element of messageElements.slice(0, 10)) {
      const text = await element.textContent();
      console.log(`📝 Checking element with text: ${text?.substring(0, 100)}...`);
      
      if (text && (text.includes('src') || text.includes('dist') || text.includes('package.json'))) {
        // Check if this element has HTML color styling (indicating ANSI conversion)
        const innerHTML = await element.innerHTML();
        const hasColorStyling = innerHTML.includes('color:') || 
                               innerHTML.includes('<span style') || 
                               innerHTML.includes('background-color');
        
        console.log(`🎨 Element has color styling: ${hasColorStyling}`);
        
        if (hasColorStyling) {
          console.log('✅ Found PTY formatting with ANSI colors!');
          console.log(`🎨 HTML sample: ${innerHTML.substring(0, 300)}...`);
          foundPtyFormatting = true;
          break;
        }
        
        // Also check if it's multi-column (typical ls behavior)
        const isMultiColumn = text.includes('  ') || text.includes('\t');
        if (isMultiColumn && text.split(' ').filter(s => s.trim()).length > 3) {
          console.log('✅ Found multi-column formatting (typical of ls)!');
          foundPtyFormatting = true;
          break;
        }
      }
    }
    
    // Check page content for ANSI-to-HTML conversion artifacts
    const pageContent = await page.content();
    const hasAnsiHtml = pageContent.includes('color:#0A0') || // bright green
                       pageContent.includes('color:#00A') || // blue
                       pageContent.includes('background-color:#0A0'); // green background
    
    if (hasAnsiHtml) {
      console.log('✅ Found ANSI-to-HTML conversion in page content!');
      foundPtyFormatting = true;
    }
    
    console.log(`📊 Final result - PTY formatting found: ${foundPtyFormatting}`);
    
    // Assert that we found evidence of PTY formatting
    expect(foundPtyFormatting).toBe(true);
  });

  test('should handle PTY errors gracefully', async () => {
    console.log('🧪 Testing PTY error handling...');
    
    // Find the input field
    const inputField = page.locator('textarea[placeholder*="Type your message"]').or(
      page.locator('textarea').first()
    );
    
    await expect(inputField).toBeVisible();
    
    // Type an invalid command
    await inputField.fill('!invalidcommandthatdoesnotexist');
    await inputField.press('Enter');
    
    // Wait for error response
    await page.waitForTimeout(3000);
    
    // Should have some error output or indication
    const content = await page.content();
    const hasErrorOutput = content.includes('command not found') || 
                          content.includes('not found') ||
                          content.includes('error') ||
                          content.includes('Error');
    
    // We expect either error output or graceful handling
    expect(hasErrorOutput || content.includes('shell')).toBe(true);
  });
});