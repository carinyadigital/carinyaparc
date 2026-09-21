import { useEffect, useState } from 'react';

import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { markAnalyticsConsentAccepted } from '@/lib/analytics/consent';
import { readConsentCookie, writeConsentCookie } from '@/lib/consent/cookie';
import type { ConsentChoice, ConsentChoiceValue } from '@/lib/consent/types';

type ConsentState = ConsentChoiceValue | 'loading';

function injectGtm(gtmId: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById('gtm-script')) {
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

async function injectVercelBeacons(): Promise<void> {
  const [{ inject }, { injectSpeedInsights }] = await Promise.all([
    import('@vercel/analytics'),
    import('@vercel/speed-insights'),
  ]);
  inject();
  injectSpeedInsights();
}

export type ConsentGateProps = {
  gtmId?: string;
};

export function ConsentGate({ gtmId }: ConsentGateProps) {
  const [choice, setChoice] = useState<ConsentState>('loading');

  useEffect(() => {
    setChoice(readConsentCookie());
  }, []);

  useEffect(() => {
    if (choice !== 'accepted') {
      return;
    }

    if (gtmId) {
      injectGtm(gtmId);
    }

    void injectVercelBeacons();
  }, [choice, gtmId]);

  const handleConsent = (consent: ConsentChoice) => {
    writeConsentCookie(consent);
    if (consent === 'accepted') {
      markAnalyticsConsentAccepted();
    }
    setChoice(consent);
  };

  const showBanner = choice === null;
  const resolvedGtmId = gtmId || (import.meta.env.PUBLIC_GTM_ID as string | undefined);

  return (
    <>
      {showBanner ? (
        <ConsentBanner
          onAccept={() => handleConsent('accepted')}
          onReject={() => handleConsent('rejected')}
        />
      ) : null}
      {choice === 'accepted' && resolvedGtmId ? (
        <noscript>
          <iframe
            title="Google Tag Manager"
            src={`https://www.googletagmanager.com/ns.html?id=${resolvedGtmId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      ) : null}
    </>
  );
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
