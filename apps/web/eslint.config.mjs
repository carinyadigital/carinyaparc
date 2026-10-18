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
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/newsletter/**', 'src/lib/email/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/newsletter/mailerlite',
              message:
                'Only lib/newsletter may import mailerlite.ts. Call subscribe() or addToList() from @/lib/newsletter.',
            },
            {
              name: '@/lib/email/resend',
              message:
                'Only lib/email may import resend.ts. Call sendContactNotification() from @/lib/email.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/layouts/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    ignores: ['src/pages/api/**', 'src/pages/monitoring.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/newsletter',
              message:
                'Components may import @/lib/newsletter/schema and @/lib/newsletter/client only.',
            },
            {
              name: '@/lib/newsletter/index',
              message:
                'Components may import @/lib/newsletter/schema and @/lib/newsletter/client only.',
            },
            {
              name: '@/lib/newsletter/handler',
              message:
                'Components may import @/lib/newsletter/schema and @/lib/newsletter/client only.',
            },
            {
              name: '@/lib/newsletter/mailerlite',
              message:
                'Components may import @/lib/newsletter/schema and @/lib/newsletter/client only.',
            },
            {
              name: '@/lib/email',
              message: 'Components may import @/lib/email/schema and @/lib/email/client only.',
            },
            {
              name: '@/lib/email/index',
              message: 'Components may import @/lib/email/schema and @/lib/email/client only.',
            },
            {
              name: '@/lib/email/handler',
              message: 'Components may import @/lib/email/schema and @/lib/email/client only.',
            },
            {
              name: '@/lib/email/resend',
              message: 'Components may import @/lib/email/schema and @/lib/email/client only.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/email/**/*.ts'],
    ignores: ['src/lib/email/index.ts', 'src/lib/email/resend.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: './resend',
              message: 'Only index.ts imports the Resend adapter.',
            },
            {
              name: '@/lib/email/resend',
              message: 'Only index.ts imports the Resend adapter.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/newsletter/**/*.ts'],
    ignores: [
      'src/lib/newsletter/index.ts',
      'src/lib/newsletter/mailerlite.ts',
      'src/lib/newsletter/**/*.test.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: './mailerlite',
              message: 'Only index.ts imports the MailerLite adapter.',
            },
            {
              name: '@/lib/newsletter/mailerlite',
              message: 'Only index.ts imports the MailerLite adapter.',
            },
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
