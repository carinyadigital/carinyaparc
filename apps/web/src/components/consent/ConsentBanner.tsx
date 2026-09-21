interface ConsentBannerProps {
  onAccept: () => void;
  onReject: () => void;
}

export function ConsentBanner({ onAccept, onReject }: ConsentBannerProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-6 pb-6">
      <div className="pointer-events-auto ml-auto max-w-xl rounded-xl border border-line bg-fleece p-6 shadow-lg">
        <p className="text-sm/6 text-charcoal">
          We use cookies to understand how visitors use this site and to remember your preferences.
          Accepting helps us keep improving Carinya Parc for you. See our{' '}
          <a href="/legal/privacy-policy/" className="font-semibold text-eucalypt-600">
            privacy policy
          </a>
          .
        </p>
        <div className="mt-4 flex items-center gap-x-5">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-pill bg-eucalypt-600 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-eucalypt-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalypt-600"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={onReject}
            className="text-sm/6 font-semibold text-charcoal"
          >
            Reject all
          </button>
        </div>
      </div>
    </div>
  );
}
