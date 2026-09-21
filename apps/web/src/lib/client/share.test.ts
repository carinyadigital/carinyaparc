/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindShareBar, canNativeShare, copyLink } from './share';

describe('share helpers', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copyLink writes the URL to the clipboard', async () => {
    await expect(copyLink('https://carinyaparc.com.au/blog/test/')).resolves.toEqual({ ok: true });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://carinyaparc.com.au/blog/test/',
    );
  });

  it('canNativeShare is false when navigator.share is missing', () => {
    expect(canNativeShare()).toBe(false);
  });

  it('bindShareBar copies on click and updates the live status', async () => {
    document.body.innerHTML = `
      <aside data-share-bar>
        <button type="button" data-share-copy data-share-url="https://example.test/post/" data-share-title="Hello">
          Copy link
        </button>
        <button type="button" data-share-native hidden>Share</button>
        <p data-share-status class="sr-only"></p>
      </aside>
    `;

    bindShareBar(document.body);
    const button = document.querySelector('[data-share-copy]') as HTMLButtonElement;
    button.click();

    await vi.waitFor(() => {
      expect(document.querySelector('[data-share-status]')?.textContent).toBe(
        'Link copied to clipboard',
      );
    });
  });
});
