import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/app/**/actions.ts',
        'src/app/**/actions/*.ts',
        'src/components/**/*.tsx',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '.next/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'src/types/**',
        '**/index.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 55,
        functions: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
