import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // All but .claude/** duplicate the preset's own global ignores on purpose,
  // so lint scope stays stable if upstream changes its list.
  globalIgnores(['.next/**', '.claude/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
