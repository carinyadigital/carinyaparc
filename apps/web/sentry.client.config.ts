import * as Sentry from '@sentry/astro';

import { SENTRY_TUNNEL_PATH } from './src/lib/urls';

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_SENTRY_DSN?: string;
    readonly PUBLIC_VERCEL_ENV?: string;
    readonly PUBLIC_VERCEL_GIT_COMMIT_SHA?: string;
  }
}

/**
 * Browser Sentry init. `@sentry/astro` injects this on every page, separate from
 * ConsentGate, so accepting or rejecting analytics does not stop error reports.
 *
 * `tunnel` posts envelopes to our own origin. Ad blockers that drop `*.sentry.io`
 * still allow that request. The server SDK keeps the integration's default init
 * and sends straight to the DSN. Sample rates match that default snippet.
 */
Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  tunnel: SENTRY_TUNNEL_PATH,
  debug: false,
  environment: import.meta.env.PUBLIC_VERCEL_ENV,
  release: import.meta.env.PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 1.0,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
