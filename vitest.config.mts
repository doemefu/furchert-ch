import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for server-side logic (node environment, no DOM). `@/` mirrors
// the tsconfig path alias. `server-only` (#80) throws unless resolved with
// the `react-server` condition, as Next does for server code; tests map it
// to the package's own no-op entry instead of enabling that condition for
// every package (it would switch React to its server build).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
