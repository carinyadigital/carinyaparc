const OPEN_SUBSCRIBE_EVENT = 'cp:open-subscribe';

export function dispatchOpenSubscribe(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SUBSCRIBE_EVENT));
}

export function onOpenSubscribe(handler: () => void): () => void {
  const listener = () => handler();
  window.addEventListener(OPEN_SUBSCRIBE_EVENT, listener);
  return () => window.removeEventListener(OPEN_SUBSCRIBE_EVENT, listener);
}

export function initSiteHeader(root: ParentNode = document): void {
  const header = root.querySelector<HTMLElement>('[data-site-header]');
  if (!header) {
    return;
  }

  const openButton = header.querySelector<HTMLButtonElement>('[data-mobile-menu-open]');
  const closeButton = header.querySelector<HTMLButtonElement>('[data-mobile-menu-close]');
  const overlay = header.querySelector<HTMLElement>('[data-mobile-menu]');
  const panel = header.querySelector<HTMLElement>('[data-mobile-menu-panel]');
  const subscribeButtons = header.querySelectorAll<HTMLElement>('[data-open-subscribe]');

  const setOpen = (open: boolean) => {
    if (!overlay || !openButton) return;
    overlay.hidden = !open;
    overlay.classList.toggle('pointer-events-none', !open);
    overlay.classList.toggle('opacity-0', !open);
    openButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    openButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  openButton?.addEventListener('click', () => {
    const expanded = openButton.getAttribute('aria-expanded') === 'true';
    setOpen(!expanded);
  });

  closeButton?.addEventListener('click', () => setOpen(false));

  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) {
      setOpen(false);
    }
  });

  panel?.addEventListener('click', (event) => event.stopPropagation());

  overlay?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  subscribeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setOpen(false);
      dispatchOpenSubscribe();
    });
  });

  if (header.dataset.overlay === 'true') {
    const applyScrollState = () => {
      const scrolled = window.scrollY > 50;
      header.classList.toggle('bg-fleece', scrolled);
      header.classList.toggle('text-charcoal', scrolled);
      header.classList.toggle('border-b', scrolled);
      header.classList.toggle('border-line', scrolled);
      header.classList.toggle('bg-transparent', !scrolled);
      header.classList.toggle('text-fleece', !scrolled);
    };

    applyScrollState();
    window.addEventListener('scroll', applyScrollState, { passive: true });
  }
}
