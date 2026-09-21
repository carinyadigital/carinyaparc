import * as Sentry from '@sentry/astro';

/**
 * Server Sentry init. No tunnel: function-to-Sentry traffic is not blocked by
 * browser ad blockers, and the browser tunnel must not become a hop for it.
 */
Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  debug: false,
  environment: import.meta.env.PUBLIC_VERCEL_ENV,
  release: import.meta.env.PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 1.0,
});
