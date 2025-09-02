import { defineConfig } from '@playwright/test';
import { resolve } from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'electron',
      testMatch: '**/*.electron.spec.ts',
      use: {
        // Electron configuration
        launchOptions: {
          executablePath: resolve('./node_modules/.bin/electron'),
          args: [resolve('./electron/main.js'), '--headless', '--disable-gpu', '--no-sandbox'],
          env: {
            ...process.env, // Inherit all environment variables
            NODE_ENV: 'test',
            DISPLAY: process.env.DISPLAY || ':99', // Use virtual display
            // Test-specific configuration
            DTUI_CFG__ai__shell__command: 'echo',
            DTUI_CFG__ai__shell__args: '["[TEST_OUTPUT]:"]',
            DTUI_CFG__ai__shell__outputFormat__useCodeBlock: 'true',
            DTUI_CFG__ai__shell__outputFormat__codeBlockSyntax: 'shell'
          }
        }
      }
    }
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});