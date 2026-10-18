/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

describe('ConsentGate', () => {
  let container: HTMLDivElement;
  let root: Root;
  let ConsentGate: typeof import('@/components/consent/ConsentGate').ConsentGate;

  beforeEach(async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
    vi.resetModules();
    ({ ConsentGate } = await import('@/components/consent/ConsentGate'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
    document.getElementById('gtm-script')?.remove();
  });

  it('does not load GTM before consent is accepted', async () => {
    await act(async () => {
      root.render(<ConsentGate />);
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Accept all');
    });

    expect(document.getElementById('gtm-script')).toBeNull();
  });

  it('does not load analytics after consent is accepted', async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=accepted; Path=/`;

    await act(async () => {
      root.render(<ConsentGate />);
    });

    await vi.waitFor(() => {
      expect(container.textContent).not.toContain('Accept all');
    });

    expect(document.getElementById('gtm-script')).toBeNull();
    expect(container.querySelector('noscript')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('shows the banner when no cookie is set', async () => {
    await act(async () => {
      root.render(<ConsentGate />);
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Accept all');
    });
  });

  it('stores the visitor choice in the cookie', async () => {
    await act(async () => {
      root.render(<ConsentGate />);
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Accept all');
    });

    const accept = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Accept all'),
    );

    await act(async () => {
      accept?.click();
    });

    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=accepted`);
    expect(container.textContent).not.toContain('Accept all');
  });
});
