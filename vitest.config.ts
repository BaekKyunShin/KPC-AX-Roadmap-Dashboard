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
      include: ['src/lib/**/*.ts', 'src/app/**/*.ts', 'src/app/**/*.tsx'],
      exclude: [
        'node_modules/',
        'src/test/',
        '.next/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 35,
        branches: 28,
        functions: 25,
        statements: 35,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
