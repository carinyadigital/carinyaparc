import type { AnalyticsEventName, AnalyticsProperties } from './types';

function containerId(): string | undefined {
  const id = import.meta.env.PUBLIC_GTM_ID;
  if (typeof id !== 'string') {
    return undefined;
  }

  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Insert the Google Tag Manager script when a container id is set. A page that already has the script is left as it is. */
export function loadGtm(): void {
  if (typeof document === 'undefined') {
    return;
  }

  const gtmId = containerId();
  if (!gtmId || document.getElementById('gtm-script')) {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);
}

/**
 * Record one custom event with its parameters under `properties`.
 * The first push clears parameters from the previous event. The tag manager
 * keeps those parameters until something overwrites them, so a later event
 * would still show an earlier interest or inquiry type.
 * When the data layer is not there, this sink does nothing.
 */
export function pushToDataLayer(event: AnalyticsEventName, properties: AnalyticsProperties): void {
  if (typeof window === 'undefined' || !window.dataLayer) {
    return;
  }

  window.dataLayer.push({ properties: null });
  window.dataLayer.push({ event, properties });
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
