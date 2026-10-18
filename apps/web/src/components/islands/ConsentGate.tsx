import { useEffect, useState } from 'react';

import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { getConsent, setConsent } from '@/lib/consent/client';
import type { ConsentChoice, ConsentChoiceValue } from '@/lib/consent/types';

type ConsentState = ConsentChoiceValue | 'loading';

export type ConsentGateProps = {
  gtmId?: string;
};

export function ConsentGate({ gtmId }: ConsentGateProps) {
  const [choice, setChoice] = useState<ConsentState>('loading');

  useEffect(() => {
    setChoice(getConsent());
  }, []);

  const handleConsent = (consent: ConsentChoice) => {
    setConsent(consent);
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
