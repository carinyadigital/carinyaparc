/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_COOKIE_NAME } from '@/lib/constants';

vi.mock('@vercel/analytics', () => ({
  inject: vi.fn(),
}));

vi.mock('@vercel/speed-insights', () => ({
  injectSpeedInsights: vi.fn(),
}));

describe('ConsentGate', () => {
  let container: HTMLDivElement;
  let root: Root;
  let ConsentGate: typeof import('@/components/islands/ConsentGate').ConsentGate;

  beforeEach(async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
    vi.resetModules();
    ({ ConsentGate } = await import('@/components/islands/ConsentGate'));
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
      root.render(<ConsentGate gtmId="GTM-TEST123" />);
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Accept all');
    });

    expect(document.getElementById('gtm-script')).toBeNull();
  });

  it('loads GTM after accepted consent', async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=accepted; Path=/`;

    await act(async () => {
      root.render(<ConsentGate gtmId="GTM-TEST123" />);
    });

    await vi.waitFor(() => {
      expect(document.getElementById('gtm-script')).not.toBeNull();
    });

    expect(document.getElementById('gtm-script')?.getAttribute('src')).toContain('GTM-TEST123');
    expect(container.textContent).not.toContain('Accept all');
  });

  it('shows the banner when no cookie is set', async () => {
    await act(async () => {
      root.render(<ConsentGate gtmId="GTM-TEST123" />);
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Accept all');
    });
  });
});
