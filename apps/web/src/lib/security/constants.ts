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
 * `'unsafe-inline'` for scripts so those inline scripts can run.
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
  'style-src': ["'self'", 'https://fonts.googleapis.com', 'https://vercel.live'],
  'img-src': [
    "'self'",
    'blob:',
    'data:',
    'https://www.google-analytics.com',
    'https://*.googleusercontent.com',
    'https://vercel.live',
    'https://vercel.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'https://vercel.live',
    'https://assets.vercel.com',
  ],
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
 * Production security headers preset
 * Configured for SecurityHeaders.com A+ rating
 */
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
