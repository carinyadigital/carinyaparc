/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import { initSiteHeader } from './site-header';

describe('initSiteHeader', () => {
  it('opens and closes the mobile menu', () => {
    document.body.innerHTML = `
      <header data-site-header>
        <button type="button" data-mobile-menu-open aria-expanded="false" aria-label="Open menu"></button>
        <div data-mobile-menu hidden>
          <div data-mobile-menu-panel>
            <button type="button" data-mobile-menu-close></button>
            <a href="/about/">About</a>
          </div>
        </div>
      </header>
    `;

    initSiteHeader(document);
    const open = document.querySelector('[data-mobile-menu-open]') as HTMLButtonElement;
    const overlay = document.querySelector('[data-mobile-menu]') as HTMLElement;

    open.click();
    expect(overlay.hidden).toBe(false);
    expect(open.getAttribute('aria-expanded')).toBe('true');

    (document.querySelector('[data-mobile-menu-close]') as HTMLButtonElement).click();
    expect(overlay.hidden).toBe(true);
    expect(open.getAttribute('aria-expanded')).toBe('false');
  });
});
