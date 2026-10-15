import { defineConfig } from 'vite-plus'

export default defineConfig({
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
        // Backend kept its own style (former apps/backend/biome.json).
        files: ['apps/backend/**'],
        options: { printWidth: 120, semi: true, singleQuote: false },
      },
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
    plugins: ['typescript', 'unicorn', 'oxc', 'import'],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
    overrides: [
      {
        // Rules ported from the former apps/frontend/biome.json.
        files: ['apps/frontend/**'],
        plugins: ['typescript', 'unicorn', 'oxc', 'import', 'react', 'jsx-a11y'],
        rules: {
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
      },
      {
        files: ['apps/backend/**'],
        rules: { 'unicorn/filename-case': ['error', { case: 'kebabCase' }] },
      },
    ],
    options: { typeAware: true, typeCheck: true },
  },
})
