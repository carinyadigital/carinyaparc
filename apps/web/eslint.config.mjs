import { config as baseConfig } from '@repo/eslint-config/base';
import eslintPluginAstro from 'eslint-plugin-astro';
import prettier from 'eslint-plugin-prettier';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...baseConfig,
  ...eslintPluginAstro.configs.recommended,
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
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
            'SECURITY_CSP_ENABLED',
            'SECURITY_CSP_REPORT_ONLY',
            'SECURITY_CSP_REPORT_URI',
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', '.astro/**', '.vercel/**'],
  },
];

export default eslintConfig;
