// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';

import vercelRedirectTrailingSlash from './integrations/vercel-redirect-trailing-slash.mjs';

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
    vercelRedirectTrailingSlash(),
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
    // @astrojs/sitemap writes sitemap-index.xml; keep the URL robots.txt and Search Console know.
    '/sitemap.xml': '/sitemap-index.xml',
    // Posts retired when the journal was rewritten (Sept 2026): send old URLs to the nearest
    // new piece so links and search results keep landing somewhere useful.
    '/blog/masterchef-to-mud-boots/': '/blog/a-kitchen-before-a-farm/',
    '/blog/restoring-42-ha-land/': '/blog/two-summers-of-rest/',
    '/blog/lessons-from-failure/': '/blog/the-shed-in-winter/',
    '/blog/designing-polyculture-systems/': '/blog/first-syntropic-lines/',
    '/blog/creating-food-forest-complete-guide/': '/blog/first-syntropic-lines/',
    '/blog/seven-layer-forest-design-guide/': '/blog/first-syntropic-lines/',
    '/blog/seasonal-soil-care-winter-composting-cover-crops/': '/blog/midwinter-pasture/',
    '/blog/hugelkulture-benefits-complete-guide/': '/blog/',
    '/blog/midwinter-pasture-recovery/': '/blog/midwinter-pasture/',
    '/blog/winter-fencing-progress/': '/blog/old-fences-new-lines/',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
