import { createRequire } from 'node:module';

import { config as baseConfig } from '@repo/eslint-config/base';
import eslintPluginAstro from 'eslint-plugin-astro';
import prettier from 'eslint-plugin-prettier';

// The Astro plugin looks for the TypeScript parser from the app directory.
// pnpm only links that parser next to the plugin, so load it from there.
const tsParser = createRequire(import.meta.resolve('eslint-plugin-astro'))(
  '@typescript-eslint/parser',
);

/**
 * Provider adapters are private to the folder that owns them.
 * Patterns match an alias, a parent-relative path, and a same-folder relative path.
 * The owning entry is excluded, and every test file is excluded, so a test may import the adapter it exercises.
 */
const providerImportPatterns = [
  {
    group: ['**/newsletter/mailerlite', './mailerlite'],
    message:
      'Only lib/newsletter/index.ts may import the MailerLite adapter. Call subscribe() or addToList() from @/lib/newsletter.',
  },
  {
    group: ['**/email/resend', './resend'],
    message: 'Only lib/email/index.ts may import the Resend adapter. Call send() from @/lib/email.',
  },
  {
    group: ['**/analytics/gtm', './gtm'],
    message: 'Only lib/analytics/client.ts may import the Google Tag Manager adapter.',
  },
  {
    group: ['**/analytics/vercel', './vercel'],
    message: 'Only lib/analytics/client.ts may import the Vercel analytics adapter.',
  },
  {
    group: ['**/consent/cookie', './cookie'],
    message: 'Only lib/consent/client.ts may import the consent cookie adapter.',
  },
];

/**
 * Islands, layouts and pages may import a feature's schema and browser client.
 * These expressions match the folder entry and its index only, so schema and client stay allowed.
 * A parent-relative path to that same entry is included.
 */
const featureEntryPatterns = [
  {
    regex: '^(?:@/lib|(?:\\.\\./)+lib)/(newsletter|contact)(/index)?$',
    message:
      'Components, layouts and pages may import @/lib/newsletter or @/lib/contact schema and client only.',
  },
  {
    regex: '^(?:@/lib|(?:\\.\\./)+lib)/email(/index)?$',
    message: 'Components, layouts and pages do not import the email service.',
  },
  {
    group: ['**/handler'],
    message:
      'Components, layouts and pages may import a feature schema and client only, not the request handler.',
  },
];

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...baseConfig,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['*.astro', '**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    rules: {
      'turbo/no-undeclared-env-vars': [
        'warn',
        {
          allowList: [
            'NODE_ENV',
            'DEV',
            'PROD',
            'PUBLIC_SITE_URL',
            'PUBLIC_GTM_ID',
            'PUBLIC_SENTRY_DSN',
            'SENTRY_DSN',
            'SENTRY_AUTH_TOKEN',
            'SENTRY_ORG',
            'SENTRY_PROJECT',
            'MAILERLITE_API_KEY',
            'RESEND_API_KEY',
            'CONTACT_EMAIL_RECIPIENT',
            'CONTACT_EMAIL_FROM',
            'CONTACT_FORM_ENABLE',
            'CONTACT_FORM_RATE_LIMITING',
            'CONTACT_RATE_LIMIT_MAX',
            'CONTACT_RATE_LIMIT_WINDOW_HOURS',
            'EVENT_SIGNUP_RATE_LIMITING',
            'EVENT_SIGNUP_RATE_LIMIT_MAX',
            'EVENT_SIGNUP_RATE_LIMIT_WINDOW_HOURS',
          ],
        },
      ],
    },
  },
  {
    // eslint-plugin-astro rewrites <script> ASTs so prettier/prettier false-positives
    // on those imports. `format:check` still formats `.astro` via prettier-plugin-astro.
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    ignores: ['**/*.astro/*'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx,astro}'],
    ignores: [
      'src/lib/newsletter/index.ts',
      'src/lib/email/index.ts',
      'src/lib/analytics/client.ts',
      'src/lib/consent/client.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: providerImportPatterns,
        },
      ],
    },
  },
  {
    // A later entry replaces no-restricted-imports for the same files, so this
    // one lists the feature limits and the provider patterns together.
    files: [
      'src/components/**/*.{ts,tsx,astro}',
      'src/layouts/**/*.{ts,tsx,astro}',
      'src/pages/**/*.{ts,tsx,astro}',
    ],
    ignores: ['src/pages/api/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [...featureEntryPatterns, ...providerImportPatterns],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', '.astro/**', '.vercel/**'],
  },
];

export default eslintConfig;
