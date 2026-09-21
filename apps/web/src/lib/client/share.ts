export type NativeSharePayload = {
  title: string;
  url: string;
};

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function copyLink(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not copy link' };
  }
}

export async function nativeShare(
  payload: NativeSharePayload,
): Promise<{ ok: true } | { ok: false; error: string } | { ok: true; aborted: true }> {
  if (!canNativeShare()) {
    return { ok: false, error: 'Could not share' };
  }

  try {
    await navigator.share({ title: payload.title, text: payload.title, url: payload.url });
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: true, aborted: true };
    }
    return { ok: false, error: 'Could not share' };
  }
}

export function bindShareBar(root: ParentNode): void {
  const copyButton = root.querySelector<HTMLButtonElement>('[data-share-copy]');
  const shareButton = root.querySelector<HTMLButtonElement>('[data-share-native]');
  const status = root.querySelector<HTMLElement>('[data-share-status]');
  const url = copyButton?.dataset.shareUrl;
  const title = shareButton?.dataset.shareTitle ?? copyButton?.dataset.shareTitle ?? '';

  if (shareButton) {
    if (canNativeShare()) {
      shareButton.hidden = false;
    } else {
      shareButton.hidden = true;
    }
  }

  const setStatus = (message: string) => {
    if (!status) return;
    status.textContent = message;
  };

  copyButton?.addEventListener('click', () => {
    if (!url) return;
    void copyLink(url).then((result) => {
      if (result.ok) {
        copyButton.dataset.copied = 'true';
        setStatus('Link copied to clipboard');
        window.setTimeout(() => {
          copyButton.dataset.copied = 'false';
          setStatus('');
        }, 2000);
      } else {
        setStatus(result.error);
      }
    });
  });

  shareButton?.addEventListener('click', () => {
    if (!url) return;
    void nativeShare({ title, url }).then((result) => {
      if (!result.ok) {
        setStatus(result.error);
      }
    });
  });
}

export function bindAllShareBars(root: ParentNode = document): void {
  root.querySelectorAll('[data-share-bar]').forEach((node) => {
    bindShareBar(node);
  });
}
