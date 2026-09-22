/**
 * Move focus to the main landmark when the skip link is activated.
 *
 * A fragment link only focuses its target on the first visit. Calling
 * `focus()` on each activation keeps the target focused when the URL
 * already ends in `#main`.
 */
export function initSkipLink(root: ParentNode = document): void {
  const link = root.querySelector<HTMLAnchorElement>('[data-skip-link]');
  const main = root.querySelector<HTMLElement>('#main');
  if (!link || !main || link.dataset.skipLinkReady === 'true') {
    return;
  }

  link.dataset.skipLinkReady = 'true';
  link.addEventListener('click', (event) => {
    event.preventDefault();
    main.focus();
  });
}
