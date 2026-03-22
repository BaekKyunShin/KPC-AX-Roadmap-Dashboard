// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  globalSetup: './e2e/global-setup.ts',

  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        '**/ops/logout.spec.ts',
        '**/visual/**',
        '**/accessibility/**',
        '**/mobile/**',
        '**/performance/**',
      ],
    },
    {
      name: 'ops-logout',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/ops/logout.spec.ts',
      dependencies: ['chromium'],
    },
    ...(!isCI
      ? [
          {
            name: 'firefox' as const,
            use: { ...devices['Desktop Firefox'] },
            testIgnore: [
              '**/ops/logout.spec.ts',
              '**/visual/**',
              '**/accessibility/**',
              '**/mobile/**',
              '**/performance/**',
            ],
          },
          {
            name: 'webkit' as const,
            use: { ...devices['Desktop Safari'] },
            testIgnore: [
              '**/ops/logout.spec.ts',
              '**/visual/**',
              '**/accessibility/**',
              '**/mobile/**',
              '**/performance/**',
            ],
          },
        ]
      : []),
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/mobile/**',
    },
    ...(!isCI
      ? [
          {
            name: 'visual' as const,
            use: { ...devices['Desktop Chrome'] },
            testMatch: '**/visual/**',
            fullyParallel: true,
          },
        ]
      : []),
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/accessibility/**',
      fullyParallel: true,
    },
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/performance/**',
      fullyParallel: true,
    },
  ],
});
