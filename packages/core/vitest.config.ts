import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // oxc (vite 8) only applies `experimentalDecorators` to files covered by an
  // included tsconfig; test files are outside the root tsconfig's `include`.
  oxc: {
    decorator: { legacy: true },
  },
  resolve: {
    alias: [
      { find: /^src\//, replacement: path.join(root, 'src') + '/' },
      { find: /^typora$/, replacement: path.join(root, '__mocks__/typora.mjs') },
      // regex aliases replace only the matched region, so the pattern must
      // span the whole id: `.scss$` would leave the "./x" prefix in place.
      { find: /.*\.scss$/, replacement: path.join(root, '__mocks__/styleMock.mjs') },
    ],
  },
  test: {
    // most test files use describe/it/expect as globals, like Jest's default
    globals: true,
    // Runtime env: `define` injects process.env.* values as strings in SSR/dev
    // mode, and the string "false" is truthy — empty strings are falsy, matching
    // the literal `false` that the old esbuild transformer folded in.
    env: { IS_PROD: '', IS_DEV: '', IS_TEST: 'true' },
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['src/setup-test-env.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['**/*.d.ts', 'src/setup-test-env.ts'],
      // baseline (2026-11): 39.99 / 43.69 / 34.15 / 40.03 — thresholds sit
      // 1–2 points below so regressions fail CI without blocking growth.
      thresholds: {
        statements: 38,
        branches: 42,
        functions: 33,
        lines: 38,
      },
    },
  },
})
