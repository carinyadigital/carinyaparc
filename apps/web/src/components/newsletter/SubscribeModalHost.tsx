import { useEffect, useState, type ReactNode } from 'react';

import { SubscribeModal } from '@/components/newsletter/SubscribeModal';
import { onOpenSubscribe } from '@/lib/client/site-header';

/** Listens for the header's subscribe event and opens the subscribe modal island. */
export function SubscribeModalHost({ privacy }: { privacy?: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => onOpenSubscribe(() => setOpen(true)), []);

  return <SubscribeModal open={open} onOpenChange={setOpen} privacy={privacy} />;
}
