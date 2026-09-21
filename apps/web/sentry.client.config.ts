import * as Sentry from '@sentry/astro';

import { SENTRY_TUNNEL_PATH } from './src/lib/urls';

/**
 * Browser Sentry init. The integration injects this on every page, independent
 * of analytics consent, so accepting or rejecting tracking does not stop error reports.
 *
 * `tunnel` posts envelopes to our own origin. Ad blockers that drop Sentry
 * ingest hosts still allow that same-origin request. The server SDK keeps the
 * default init and sends straight to the DSN.
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
