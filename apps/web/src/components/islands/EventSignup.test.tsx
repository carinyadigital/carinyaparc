/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackEventSignupComplete = vi.fn();

vi.mock('@/lib/analytics', () => ({
  EVENTS_LISTING_SOURCE: 'events-listing',
  trackEventSignupComplete: (...args: unknown[]) => trackEventSignupComplete(...args),
}));

function reactProps<T extends Record<string, unknown>>(el: Element): T {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps$'));
  if (!key) {
    throw new Error('React props not found on element');
  }
  const props = (el as unknown as Record<string, T>)[key];
  if (!props) {
    throw new Error('React props missing on element');
  }
  return props;
}

describe('EventSignup', () => {
  let container: HTMLDivElement;
  let root: Root;
  let EventSignup: typeof import('@/components/islands/EventSignup').EventSignup;

  beforeEach(async () => {
    vi.resetModules();
    trackEventSignupComplete.mockReset();
    vi.stubGlobal('fetch', vi.fn());
    ({ EventSignup } = await import('@/components/islands/EventSignup'));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders name and email fields for an open event', async () => {
    await act(async () => {
      root.render(<EventSignup eventSlug="winter-planting-day" eventTitle="Winter planting day" />);
    });

    expect(container.textContent).toContain('Sign up for this event');
    expect(container.querySelector('input[name="name"]')).toBeTruthy();
    expect(container.querySelector('input[name="email"]')).toBeTruthy();
    expect(container.querySelector('button[type="submit"]')?.textContent).toMatch(/Sign up/i);
  });

  it('shows waitlist / subscribe state when the event is full', async () => {
    await act(async () => {
      root.render(
        <EventSignup eventSlug="winter-planting-day" eventTitle="Winter planting day" isFull />,
      );
    });

    expect(container.textContent).toContain('This event is full');
    expect(container.querySelector('a[href="/subscribe/"]')).toBeTruthy();
  });

  it('posts the signup and shows confirmation', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "You're signed up — see you on the day." }),
    } as Response);

    await act(async () => {
      root.render(<EventSignup eventSlug="winter-planting-day" eventTitle="Winter planting day" />);
    });

    const name = container.querySelector('input[name="name"]') as HTMLInputElement;
    const email = container.querySelector('input[name="email"]') as HTMLInputElement;
    const nameProps = reactProps<{ onChange?: (e: { target: { value: string } }) => void }>(name);
    const emailProps = reactProps<{ onChange?: (e: { target: { value: string } }) => void }>(email);

    await act(async () => {
      nameProps.onChange?.({ target: { value: 'Alex Farmer' } });
      emailProps.onChange?.({ target: { value: 'alex@fastmail.com' } });
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain("You're signed up");
    });

    expect(trackEventSignupComplete).toHaveBeenCalledWith({
      event_id: 'winter-planting-day',
      source: 'events-listing',
    });
  });
});
