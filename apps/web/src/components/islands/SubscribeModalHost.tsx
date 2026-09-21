import { useEffect, useState } from 'react';

import { SubscribeModal } from '@/components/islands/SubscribeModal';
import { onOpenSubscribe } from '@/lib/client/site-header';

/** Listens for the header's subscribe event and opens the subscribe modal island. */
export function SubscribeModalHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => onOpenSubscribe(() => setOpen(true)), []);

  return <SubscribeModal open={open} onOpenChange={setOpen} />;
}
