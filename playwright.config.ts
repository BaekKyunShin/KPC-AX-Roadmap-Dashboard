// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// .env.test를 Playwright 프로세스와 webServer에 주입.
// parsed 맵을 별도 보관해 webServer.env에 spread — dev 서버가 .env.local(클라우드
// Supabase)을 읽지 않고 로컬 Supabase(127.0.0.1:54321)로 기동되도록 강제한다.
const testEnv = dotenv.config({ path: '.env.test' }).parsed ?? {};

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

  timeout: isCI ? 60_000 : 30_000,

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
    // .env.local(클라우드 Supabase)을 덮어쓰고 로컬 Supabase로 기동.
    env: testEnv,
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
