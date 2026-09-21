// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';

const sentryDsn = process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN;

/**
 * Static HTML for public routes; on-demand endpoints opt out with `prerender = false`.
 * Trailing slashes and directory output match the current public URL shape.
 */
export default defineConfig({
  site: 'https://carinyaparc.com.au',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  adapter: vercel(),
  integrations: [
    mdx(),
    react(),
    sitemap(),
    ...(sentryDsn
      ? [
          sentry({
            dsn: sentryDsn,
            sourceMapsUploadOptions: {
              enabled: Boolean(process.env.SENTRY_AUTH_TOKEN),
            },
          }),
        ]
      : []),
  ],
  redirects: {
    '/favicon.ico': '/favicon/favicon.ico',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
