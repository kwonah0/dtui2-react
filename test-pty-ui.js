const { test, expect } = require('@playwright/test');

test.describe('PTY Shell Command Tests', () => {

test('PTY shell command formatting works in UI', async ({ page }) => {
  console.log('🧪 Starting PTY UI test...');
  
  // Navigate to the Electron app
  await page.goto('http://localhost:3002');
  
  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  console.log('📱 App loaded, looking for input field...');
  
  // Find the input field
  const input = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
  await expect(input).toBeVisible();
  
  console.log('🎯 Found input field, typing !ls command...');
  
  // Type the shell command
  await input.fill('!ls');
  
  // Find and click the submit button or press Enter
  const submitButton = page.locator('button').filter({ hasText: /send|submit/i }).first();
  if (await submitButton.count() > 0) {
    await submitButton.click();
    console.log('✅ Clicked submit button');
  } else {
    // Try pressing Enter
    await input.press('Enter');
    console.log('✅ Pressed Enter');
  }
  
  console.log('⏳ Waiting for shell output...');
  
  // Wait for output to appear (look for colored text or multi-column format)
  await page.waitForTimeout(3000);
  
  // Take a screenshot
  await page.screenshot({ path: 'pty-test-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved as pty-test-screenshot.png');
  
  // Look for signs of PTY formatting
  const pageContent = await page.content();
  console.log('📄 Page HTML length:', pageContent.length);
  
  // Check for ANSI color HTML
  const hasAnsiColors = pageContent.includes('color:') || pageContent.includes('style=');
  console.log('🎨 Has HTML colors:', hasAnsiColors);
  
  // Check for typical directory names that should be colored
  const hasDirectories = pageContent.includes('src') || pageContent.includes('node_modules') || pageContent.includes('dist');
  console.log('📁 Contains directories:', hasDirectories);
  
  // Look for the actual output in the DOM
  const messages = await page.locator('[class*="message"], [class*="output"], [class*="content"]').all();
  console.log('💬 Found', messages.length, 'message elements');
  
  for (let i = 0; i < messages.length; i++) {
    const text = await messages[i].textContent();
    if (text && text.includes('src')) {
      console.log('📝 Message', i, 'text:', text.substring(0, 200) + '...');
      
      // Check if this message has colored styling
      const innerHTML = await messages[i].innerHTML();
      const hasColorStyling = innerHTML.includes('color:') || innerHTML.includes('span style');
      console.log('🎨 Message', i, 'has color styling:', hasColorStyling);
      
      if (hasColorStyling) {
        console.log('✅ PTY formatting detected in UI!');
        break;
      }
    }
  }
});

});