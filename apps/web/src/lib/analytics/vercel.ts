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
