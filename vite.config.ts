/// <reference types="node" />
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, lazyPlugins } from 'vite-plus'

const DOC = 'See docs/ARCHITECTURE/modular-monolith.md.'

// why: module boundaries are a data-flow rule: a module is entered only through its public index files, and kernel code never imports a module.
const MODULE_INTERNAL = {
  group: ['@/modules/*/**', '!@/modules/*/index.*'],
  message: `Import a module's public entry (@/modules/<name> or @/modules/<name>/index.server), not its internals. ${DOC}`,
}
const MODULE_PARENT = {
  regex: '^\\.\\./',
  message: `Inside src/modules use ./ imports, not ../. ${DOC}`,
}
// why: a relative path into src/modules skips the group rules above, so every file must use the @/modules alias.
const MODULE_ALIAS = {
  regex: '^\\.\\.?/(\\.\\./)*(.*/)?modules/',
  message: `Import modules through the @/modules alias, not a relative path. ${DOC}`,
}
const MODULE_SHELL = {
  regex: '^@/(router|start|server|server/app)$|^@/routes/',
  message: `Modules must not import the app shell (@/router, @/routes, @/start, @/server, @/server/app). Pass values in from the caller. ${DOC}`,
}
const KERNEL_NO_MODULES = {
  group: ['@/modules/**'],
  message: `Kernel code (src/server, src/lib, src/components) must not import feature modules. ${DOC}`,
}

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
      'no-restricted-imports': ['error', { patterns: [MODULE_INTERNAL, MODULE_ALIAS] }],
    },
    overrides: [
      {
        // why: backend filenames were kebab-case (former apps/backend lint rule); frontend files are not.
        files: ['src/server/**'],
        rules: { 'unicorn/filename-case': ['error', { case: 'kebabCase' }] },
      },
      {
        files: ['src/modules/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            { patterns: [MODULE_INTERNAL, MODULE_PARENT, MODULE_SHELL, MODULE_ALIAS] },
          ],
        },
      },
      {
        // src/server/app.ts is the composition root and may mount module routers.
        files: ['src/server/**', 'src/lib/**', 'src/components/**'],
        excludeFiles: ['src/server/app.ts'],
        rules: {
          'no-restricted-imports': ['error', { patterns: [KERNEL_NO_MODULES, MODULE_ALIAS] }],
        },
      },
    ],
    options: { typeAware: true, typeCheck: true },
  },
})
