const { test, expect } = require('@playwright/test');

test.describe('PTY Shell Command Tests', () => {
  test('PTY shell command formatting works in UI', async ({ page }) => {
    console.log('🧪 Starting PTY UI test...');
    
    // Navigate to the Electron app
    await page.goto('http://localhost:3002');
    
    // Wait for the app to load
    await page.waitForTimeout(3000);
    
    console.log('📱 App loaded, looking for input field...');
    
    // Find the input field - try multiple selectors
    const input = await page.locator('textarea').first().or(
      page.locator('input[type="text"]').first()
    ).or(
      page.locator('[contenteditable="true"]').first()
    ).or(
      page.locator('[placeholder*="message"], [placeholder*="Message"]').first()
    );
    
    await expect(input).toBeVisible({ timeout: 10000 });
    
    console.log('🎯 Found input field, typing !ls command...');
    
    // Clear and type the shell command
    await input.clear();
    await input.fill('!ls');
    
    // Find and click the submit button or press Enter
    const submitButton = page.locator('button').filter({ hasText: /send|submit/i });
    if (await submitButton.count() > 0) {
      await submitButton.first().click();
      console.log('✅ Clicked submit button');
    } else {
      // Try pressing Enter
      await input.press('Enter');
      console.log('✅ Pressed Enter');
    }
    
    console.log('⏳ Waiting for shell output...');
    
    // Wait for output to appear
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    await page.screenshot({ path: 'pty-test-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as pty-test-screenshot.png');
    
    // Look for signs of PTY formatting
    const pageContent = await page.content();
    console.log('📄 Page HTML length:', pageContent.length);
    
    // Check for ANSI color HTML
    const hasAnsiColors = pageContent.includes('color:') || pageContent.includes('style="color');
    console.log('🎨 Has HTML colors:', hasAnsiColors);
    
    // Check for typical directory names that should be colored
    const hasDirectories = pageContent.includes('src') || pageContent.includes('node_modules') || pageContent.includes('dist');
    console.log('📁 Contains directories:', hasDirectories);
    
    // Look for the actual message content
    const messageElements = await page.locator('div, span, p').all();
    console.log('💬 Found', messageElements.length, 'potential message elements');
    
    let foundPtyFormatting = false;
    
    for (let i = 0; i < Math.min(messageElements.length, 50); i++) {
      const text = await messageElements[i].textContent();
      if (text && (text.includes('src') || text.includes('dist') || text.includes('node_modules'))) {
        console.log('📝 Element', i, 'text preview:', text.substring(0, 100) + '...');
        
        // Check if this element has colored styling
        const innerHTML = await messageElements[i].innerHTML();
        const hasColorStyling = innerHTML.includes('color:') || innerHTML.includes('span style') || innerHTML.includes('background-color');
        console.log('🎨 Element', i, 'has color styling:', hasColorStyling);
        
        if (hasColorStyling) {
          console.log('✅ PTY formatting detected in UI!');
          console.log('🎨 HTML sample:', innerHTML.substring(0, 200) + '...');
          foundPtyFormatting = true;
          break;
        }
      }
    }
    
    // Assert that we found PTY formatting
    expect(foundPtyFormatting).toBe(true);
    
    console.log('🎉 Test completed successfully!');
  });
});