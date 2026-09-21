import * as Sentry from '@sentry/astro';

type MetricAttributes = Record<string, string>;

type SentryMetrics = {
  count?: (name: string, value: number, options?: { attributes?: MetricAttributes }) => void;
};

function metrics(): SentryMetrics | undefined {
  return (Sentry as { metrics?: SentryMetrics }).metrics;
}

/** Count a named metric when Sentry is loaded; no-op in local/CI without a DSN. */
export function countMetric(name: string, value: number, attributes?: MetricAttributes): void {
  try {
    metrics()?.count?.(name, value, attributes ? { attributes } : undefined);
  } catch {
    // Metrics must never break a request path.
  }
}

export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
): void {
  try {
    Sentry.captureException(error, context);
  } catch {
    // Observability is best-effort.
  }
}

export function captureMessage(
  message: string,
  context?: {
    level?: 'warning' | 'error' | 'info';
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    fingerprint?: string[];
  },
): void {
  try {
    Sentry.captureMessage(message, context);
  } catch {
    // Observability is best-effort.
  }
}
