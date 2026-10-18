import type { AnalyticsEventName } from './types';

/** Load Vercel Analytics and Speed Insights. The bundles are fetched only when this runs. */
export function loadVercel(): void {
  if (typeof window === 'undefined') {
    return;
  }

  void injectBeacons();
}

async function injectBeacons(): Promise<void> {
  const [{ inject }, { injectSpeedInsights }] = await Promise.all([
    import('@vercel/analytics'),
    import('@vercel/speed-insights'),
  ]);
  inject();
  injectSpeedInsights();
}

/**
 * The analytics package already declares window.va as a two-argument queue.
 * A second global declaration would disagree with that type, so this call keeps
 * the three-argument form the site already sends.
 */
type VercelTrackWindow = Window & {
  va?: (command: 'track', eventName: string, properties?: Record<string, unknown>) => void;
};

/** Forward one custom event when Vercel Analytics has installed its queue function. */
export function trackVercel(event: AnalyticsEventName, params: Record<string, unknown>): void {
  if (typeof window === 'undefined') {
    return;
  }

  const analyticsWindow = window as VercelTrackWindow;
  analyticsWindow.va?.('track', event, params);
}
