import { useEffect } from 'react';
import { Newspaper, Shovel, Sprout, X } from 'lucide-react';

import { SubscribeForm } from '@/components/islands/SubscribeForm';
import { cn } from '@/lib/cn';

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscribeModal({ open, onOpenChange }: SubscribeModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-eucalypt-900/45 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-modal-title"
        className={cn(
          'relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-fleece p-6 shadow-lg',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <h2
          id="subscribe-modal-title"
          className="m-6 font-heading text-4xl font-normal text-eucalypt-600"
        >
          Stay Connected to The Land
        </h2>
        <p className="mt-6 px-6 text-left text-base/7 text-charcoal">
          Join our mailing list to be the first to receive:
        </p>
        <div className="px-6 text-left">
          <ul role="list" className="mt-6 space-y-4">
            <li className="flex gap-x-3">
              <Shovel className="mt-0.5 h-5 w-5 text-eucalypt-300" />
              <span className="text-sm">
                <strong className="font-semibold">Invitations to participate</strong> in planting
                days, workshops and other opportunities
              </span>
            </li>
            <li className="flex gap-x-3">
              <Sprout className="mt-0.5 h-5 w-5 text-eucalypt-300" />
              <span className="text-sm">
                <strong className="font-semibold">Seasonal recipes</strong> that follow the rhythm
                of our developing gardens
              </span>
            </li>
            <li className="flex gap-x-3">
              <Newspaper className="mt-0.5 h-5 w-5 text-eucalypt-300" />
              <span className="text-sm">
                <strong className="font-semibold">Inspiring stories</strong> of regeneration and
                transformation of our landscape
              </span>
            </li>
          </ul>
        </div>
        <SubscribeForm showName={false} showInterests={false} source="header-modal" />
      </div>
    </div>
  );
}
