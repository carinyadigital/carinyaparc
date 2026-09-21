import { config as baseConfig } from '@repo/eslint-config/base';
import eslintPluginAstro from 'eslint-plugin-astro';
import prettier from 'eslint-plugin-prettier';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...baseConfig,
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      'turbo/no-undeclared-env-vars': [
        'warn',
        {
          allowList: [
            'NODE_ENV',
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
            'SECURITY_CSP_ENABLED',
            'SECURITY_CSP_REPORT_ONLY',
            'SECURITY_CSP_REPORT_URI',
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
    ignores: ['dist/**', '.astro/**', '.vercel/**'],
  },
];

export default eslintConfig;
