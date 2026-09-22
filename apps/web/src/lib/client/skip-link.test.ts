/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import { initSkipLink } from './skip-link';

function render(): { link: HTMLAnchorElement; main: HTMLElement } {
  document.body.innerHTML = `
    <a href="#main" data-skip-link>Skip to content</a>
    <header><a href="/">Carinya Parc</a></header>
    <main id="main" tabindex="-1"></main>
  `;
  initSkipLink(document);
  return {
    link: document.querySelector('[data-skip-link]') as HTMLAnchorElement,
    main: document.getElementById('main') as HTMLElement,
  };
}

describe('initSkipLink', () => {
  it('moves focus to the main region when the skip link is activated', () => {
    const { link, main } = render();

    link.focus();
    expect(document.activeElement).toBe(link);

    link.click();
    expect(document.activeElement).toBe(main);
  });

  it('moves focus again when the link is activated a second time', () => {
    const { link, main } = render();

    link.click();
    link.focus();
    link.click();

    expect(document.activeElement).toBe(main);
  });
});
