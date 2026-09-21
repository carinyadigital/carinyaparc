import { cn } from '@/lib/cn';

interface SubscribePrivacyNoteProps {
  className?: string;
}

/** Privacy/consent line shared with the standalone subscribe island. */
export function SubscribePrivacyNote({ className }: SubscribePrivacyNoteProps) {
  return (
    <p className={cn('text-sm/6 text-stone', className)}>
      We promise to respect your privacy and your inbox. Read our{' '}
      <a href="/legal/privacy-policy/" className="font-semibold text-eucalypt-600 hover:opacity-70">
        Privacy Policy
      </a>
      .
    </p>
  );
}
