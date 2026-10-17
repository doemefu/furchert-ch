import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for server-side logic (node environment, no DOM). `@/` mirrors
// the tsconfig path alias. `server-only` (#80) is not a package dependency:
// Next's bundler resolves it to its own compiled copy, so tests map it to
// that copy's no-op entry the same way Next does for server code.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': 'next/dist/compiled/server-only/empty.js',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
