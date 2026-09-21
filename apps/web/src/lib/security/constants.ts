/**
 * Security header constants and presets.
 */

import type { SecurityHeadersConfig } from './types';

/**
 * Balanced CSP directives preset for the public prerendered site.
 *
 * Public routes are static HTML (no per-request script nonces). Nonce-based
 * `'strict-dynamic'` CSP is incompatible with that model — Astro inlines small
 * scripts on prerendered pages. This policy uses host allowlists plus
 * `'unsafe-inline'` for scripts so those inline scripts can run. Styles also
 * allow `'unsafe-inline'` because prerendered pages inline small stylesheets
 * and React islands set a few style attributes. Fonts are self-hosted, so the
 * Google Fonts hosts from the Next.js allowlist are omitted.
 *
 * Vercel Toolbar hosts follow the platform CSP allowlist. Revisit nonce +
 * strict-dynamic only if public routes become fully dynamic.
 */
export const CSP_BALANCED_DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    'blob:',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.vercel-scripts.com',
    'https://vercel.live',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://vercel.live'],
  'img-src': [
    "'self'",
    'blob:',
    'data:',
    'https://www.google-analytics.com',
    'https://*.googleusercontent.com',
    'https://vercel.live',
    'https://vercel.com',
  ],
  'font-src': ["'self'", 'https://vercel.live', 'https://assets.vercel.com'],
  'connect-src': [
    "'self'",
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.sentry.io',
    'https://vitals.vercel-insights.com',
    'https://vercel.live',
    'wss://vercel.live',
    'wss://ws-us3.pusher.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ["'self'", 'https://www.googletagmanager.com', 'https://vercel.live'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

/** Named CSP presets. Prefer `CSP_BALANCED_DIRECTIVES` for the public site. */
export const CSP_DIRECTIVES = {
  BALANCED: CSP_BALANCED_DIRECTIVES,
} as const;

/**
 * Trailing slash is required: browsers do not follow redirects for CSP report
 * POSTs, and the public site always emits directory URLs.
 */
export const CSP_REPORT_URI = '/api/csp-report/';

/**
 * Preview and pre-cut-over deploys ship CSP as Report-Only so violations are
 * observed without blocking. Cut-over flips this to false (enforcing).
 */
export const CSP_REPORT_ONLY_UNTIL_CUTOVER = true;

export const SECURITY_HEADER_PRESETS: Record<string, SecurityHeadersConfig> = {
  PRODUCTION: {
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    frameOptions: 'DENY',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  },
};
