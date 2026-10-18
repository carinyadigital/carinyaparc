import { useEffect, useState } from 'react';

import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { getConsent, setConsent } from '@/lib/consent/client';
import type { ConsentChoice, ConsentChoiceValue } from '@/lib/consent/types';

type ConsentState = ConsentChoiceValue | 'loading';

export function ConsentGate() {
  const [choice, setChoice] = useState<ConsentState>('loading');

  useEffect(() => {
    setChoice(getConsent());
  }, []);

  const handleConsent = (consent: ConsentChoice) => {
    setConsent(consent);
    setChoice(consent);
  };

  if (choice !== null) {
    return null;
  }

  return (
    <ConsentBanner
      onAccept={() => handleConsent('accepted')}
      onReject={() => handleConsent('rejected')}
    />
  );
}
