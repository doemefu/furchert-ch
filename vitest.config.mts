import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for server-side logic (node environment, no DOM). `@/` mirrors
// the tsconfig path alias.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
