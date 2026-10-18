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

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
