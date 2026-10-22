/// <reference types="node" />
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, lazyPlugins } from 'vite-plus'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // why: the Cloudflare plugin only serves the dev/build Worker; unit tests run
    // in plain Node and must not pull in the Workers runtime.
    ...(process.env.VITEST ? [] : [cloudflare({ viteEnvironment: { name: 'ssr' } })]),
  ]),
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
  },
  fmt: {
    ignorePatterns: [
      '**/*.gen.ts',
      '**/*.md',
      '**/migrations/**',
      '**/dist/**',
      '**/.wrangler/**',
      '**/.output/**',
      '**/public/**',
      '**/*.css',
    ],
    printWidth: 100,
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    // why: matches Biome organizeImports, which kept import groups without blank lines.
    sortImports: { newlinesBetween: false },
    overrides: [
      {
        // why: keeps JSON/JSONC as Biome left it; wrangler.jsonc is also read by non-JSONC tools.
        files: ['**/*.json', '**/*.jsonc'],
        options: { trailingComma: 'none' },
      },
    ],
  },
  lint: {
    ignorePatterns: [
      '**/*.gen.ts',
      '**/migrations/**',
      '**/dist/**',
      '**/.wrangler/**',
      '**/.output/**',
      '**/public/**',
      '**/*.css',
    ],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'react', 'jsx-a11y'],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      // Rules ported from the former apps/frontend/biome.json; now applied to the whole repo.
      'react/rules-of-hooks': 'error',
      'react/exhaustive-deps': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/no-array-index-key': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',
      'jsx-a11y/prefer-tag-over-role': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
    },
    overrides: [
      {
        // why: backend filenames were kebab-case (former apps/backend lint rule); frontend files are not.
        files: ['src/server/**'],
        rules: { 'unicorn/filename-case': ['error', { case: 'kebabCase' }] },
      },
    ],
    options: { typeAware: true, typeCheck: true },
  },
})
