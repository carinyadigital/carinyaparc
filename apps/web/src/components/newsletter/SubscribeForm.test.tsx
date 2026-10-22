/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackNewsletterSubscriptionStarted = vi.fn();
const trackNewsletterSubscribed = vi.fn();
const postSubscribe = vi.fn();

vi.mock('@/lib/analytics/client', () => ({
  trackNewsletterSubscriptionStarted: (...args: unknown[]) =>
    trackNewsletterSubscriptionStarted(...args),
  trackNewsletterSubscribed: (...args: unknown[]) => trackNewsletterSubscribed(...args),
}));

vi.mock('@/lib/newsletter/client', () => ({
  postSubscribe: (...args: unknown[]) => postSubscribe(...args),
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

describe('SubscribeForm', () => {
  let container: HTMLDivElement;
  let root: Root;
  let SubscribeForm: typeof import('@/components/newsletter/SubscribeForm').SubscribeForm;

  beforeEach(async () => {
    vi.resetModules();
    trackNewsletterSubscriptionStarted.mockReset();
    trackNewsletterSubscribed.mockReset();
    postSubscribe.mockReset();
    ({ SubscribeForm } = await import('@/components/newsletter/SubscribeForm'));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('records a subscription start once on first focus, without an interest key', async () => {
    await act(async () => {
      root.render(<SubscribeForm variant="card" source="blog:test-post" />);
    });

    const email = container.querySelector('#inline-subscribe-email') as HTMLInputElement;
    const props = reactProps<{ onFocus?: () => void }>(email);

    await act(async () => {
      props.onFocus?.();
      props.onFocus?.();
    });

    expect(trackNewsletterSubscriptionStarted).toHaveBeenCalledTimes(1);
    expect(trackNewsletterSubscriptionStarted).toHaveBeenCalledWith({ source: 'blog:test-post' });
    expect(trackNewsletterSubscriptionStarted.mock.calls[0]?.[0]).not.toHaveProperty('interest');
  });

  it('records a subscribed event with source on successful submit', async () => {
    postSubscribe.mockResolvedValue({ ok: true });

    await act(async () => {
      root.render(<SubscribeForm variant="card" source="blog:test-post" />);
    });

    const email = container.querySelector('#inline-subscribe-email') as HTMLInputElement;
    const props = reactProps<{
      onChange?: (e: { target: { value: string } }) => void;
    }>(email);

    await act(async () => {
      props.onChange?.({ target: { value: 'reader@carinyaparc.com.au' } });
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(trackNewsletterSubscribed).toHaveBeenCalledWith({ source: 'blog:test-post' });
    });
  });

  it('renders the stay band privacy note and success copy', async () => {
    postSubscribe.mockResolvedValue({ ok: true });

    await act(async () => {
      root.render(<SubscribeForm source="stay" variant="stay" />);
    });

    expect(container.querySelector('#subscribe-email-stay')).not.toBeNull();
    expect(container.textContent).toContain('Join a growing community of supporters');

    const email = container.querySelector('#subscribe-email-stay') as HTMLInputElement;
    const props = reactProps<{
      onChange?: (e: { target: { value: string } }) => void;
    }>(email);

    await act(async () => {
      props.onChange?.({ target: { value: 'reader@carinyaparc.com.au' } });
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Thanks for joining us');
    });
    expect(container.textContent).toContain("You're on the list");
    expect(container.textContent).not.toContain('Join a growing community of supporters');
    expect(trackNewsletterSubscribed).toHaveBeenCalledWith({ source: 'stay' });
  });

  it('sends a locked interest from the compact form', async () => {
    postSubscribe.mockResolvedValue({ ok: true });

    await act(async () => {
      root.render(<SubscribeForm variant="compact" source="beef" interest="beef" />);
    });

    const email = container.querySelector('#subscribe-email-beef') as HTMLInputElement;
    const props = reactProps<{
      onFocus?: () => void;
      onChange?: (e: { target: { value: string } }) => void;
    }>(email);

    await act(async () => {
      props.onFocus?.();
      props.onChange?.({ target: { value: 'reader@carinyaparc.com.au' } });
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(postSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'reader@carinyaparc.com.au',
          source: 'beef',
          interest: 'beef',
        }),
      );
    });
    expect(trackNewsletterSubscriptionStarted).toHaveBeenCalledWith({
      source: 'beef',
      interest: 'beef',
    });
    expect(trackNewsletterSubscribed).toHaveBeenCalledWith({
      source: 'beef',
      interest: 'beef',
    });
    expect(container.querySelector('select')).toBeNull();
  });

  it('records completion with source and interest from the end-of-article form', async () => {
    postSubscribe.mockResolvedValue({ ok: true });

    await act(async () => {
      root.render(<SubscribeForm variant="end" source="blog:slug" />);
    });

    const email = container.querySelector('#end-subscribe-email') as HTMLInputElement;
    const emailProps = reactProps<{
      onChange?: (e: { target: { value: string } }) => void;
    }>(email);
    const interest = container.querySelector('#end-subscribe-interest') as HTMLSelectElement;
    const interestProps = reactProps<{
      onChange?: (e: { target: { value: string } }) => void;
    }>(interest);

    await act(async () => {
      emailProps.onChange?.({ target: { value: 'reader@carinyaparc.com.au' } });
      interestProps.onChange?.({ target: { value: 'learning' } });
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(trackNewsletterSubscribed).toHaveBeenCalledWith({
        source: 'blog:slug',
        interest: 'learning',
      });
    });
  });

  it('does not record a start or a completion from the standalone subscribe page', async () => {
    postSubscribe.mockResolvedValue({ ok: true });

    await act(async () => {
      root.render(<SubscribeForm variant="page" source="subscribe-page" showName={false} />);
    });

    const email = container.querySelector('#email') as HTMLInputElement;
    const emailProps = reactProps<{
      onChange?: (e: { target: { value: string } }) => void;
    }>(email);

    await act(async () => {
      emailProps.onChange?.({ target: { value: 'reader@carinyaparc.com.au' } });
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain("You're in");
    });
    expect(trackNewsletterSubscriptionStarted).not.toHaveBeenCalled();
    expect(trackNewsletterSubscribed).not.toHaveBeenCalled();
  });
});

describe('SubscribeForm hydration', () => {
  let SubscribeForm: typeof import('@/components/newsletter/SubscribeForm').SubscribeForm;

  beforeEach(async () => {
    vi.resetModules();
    ({ SubscribeForm } = await import('@/components/newsletter/SubscribeForm'));
  });

  it('hydrates the stay band from the server markup, including a filled email field', async () => {
    const element = <SubscribeForm variant="stay" source="stay" />;
    const html = renderToString(element);
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);

    const link = host.querySelector('a');
    expect(link?.textContent).toBe('privacy policy');
    expect(link?.textContent?.includes('\u00a0')).toBe(false);

    const email = host.querySelector('#subscribe-email-stay') as HTMLInputElement;
    email.value = 'reader@example.com';
    email.setAttribute('value', 'reader@example.com');

    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });

    await act(async () => {
      hydrateRoot(host, <SubscribeForm variant="stay" source="stay" />);
    });

    expect(errors.filter((message) => /hydrat|did not match/i.test(message))).toEqual([]);
    expect(host.querySelector('#subscribe-email-stay')).toBeTruthy();

    spy.mockRestore();
    host.remove();
  });
});
