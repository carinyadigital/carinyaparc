/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const track = vi.fn();

vi.mock('@/lib/analytics/client', () => ({
  track: (...args: unknown[]) => track(...args),
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

const VOLUNTEER_MESSAGE = 'I would like to volunteer for a planting day on the farm.';
const RATE_LIMIT_MESSAGE =
  'Rate limit exceeded. This email address has already submitted an inquiry recently. Please try again in 24 hours.';

function jsonResponse(
  status: number,
  body: { error?: string; message?: string; success?: boolean },
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('ContactForm inquiry query', () => {
  let container: HTMLDivElement;
  let root: Root;
  let ContactForm: typeof import('@/components/islands/ContactForm').ContactForm;

  beforeEach(async () => {
    vi.resetModules();
    track.mockReset();
    ({ ContactForm } = await import('@/components/islands/ContactForm'));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.history.replaceState({}, '', '/');
  });

  async function renderAt(search: string) {
    window.history.replaceState({}, '', `/contact/${search}`);
    await act(async () => {
      root.render(<ContactForm />);
    });
    return container.querySelector('#inquiryType') as HTMLSelectElement;
  }

  it('pre-selects a known inquiry from the query', async () => {
    const select = await renderAt('?inquiry=tours');
    expect(select.value).toBe('tours');
  });

  it('leaves the topic blank for an unknown inquiry', async () => {
    const select = await renderAt('?inquiry=stay');
    expect(select.value).toBe('');
  });
});

describe('ContactForm analytics', () => {
  let container: HTMLDivElement;
  let root: Root;
  let ContactForm: typeof import('@/components/islands/ContactForm').ContactForm;
  let va: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    track.mockReset();
    va = vi.fn();
    Object.defineProperty(window, 'va', { configurable: true, value: va });
    vi.stubGlobal('fetch', vi.fn());
    ({ ContactForm } = await import('@/components/islands/ContactForm'));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(window, 'va');
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  async function renderForm() {
    await act(async () => {
      root.render(<ContactForm />);
    });
  }

  async function setField(id: string, value: string) {
    const field = container.querySelector(`#${id}`) as
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const props = reactProps<{ onChange?: (event: { target: EventTarget }) => void }>(field);
    field.value = value;
    await act(async () => {
      props.onChange?.({ target: field });
    });
  }

  async function fillVolunteerForm() {
    await setField('firstName', 'Jane');
    await setField('lastName', 'Citizen');
    await setField('email', 'reader@carinyaparc.com.au');
    await setField('inquiryType', 'volunteer');
    await setField('message', VOLUNTEER_MESSAGE);
  }

  async function submitForm() {
    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  function callsFor(eventName: string) {
    return track.mock.calls.filter((call) => call[0] === eventName);
  }

  it('records Contact Form Viewed when the form is shown', async () => {
    await renderForm();

    expect(track).toHaveBeenCalledWith('Contact Form Viewed', { form_id: 'contact' });
  });

  it('records Contact Form Started once on the first focus', async () => {
    await renderForm();
    const form = container.querySelector('form') as HTMLFormElement;
    const props = reactProps<{ onFocus?: () => void }>(form);

    await act(async () => {
      props.onFocus?.();
      props.onFocus?.();
    });

    expect(callsFor('Contact Form Started')).toEqual([
      ['Contact Form Started', { form_id: 'contact' }],
    ]);
  });

  it('records Contact Form Completed with the topic when the contact API succeeds', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { success: true, message: 'Message sent' }),
    );
    await renderForm();
    await fillVolunteerForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Message sent — thank you');
    });

    expect(callsFor('Contact Form Submitted')).toEqual([
      ['Contact Form Submitted', { form_id: 'contact', inquiry_type: 'volunteer' }],
    ]);
    expect(callsFor('Contact Form Completed')).toEqual([
      ['Contact Form Completed', { form_id: 'contact', inquiry_type: 'volunteer' }],
    ]);
    expect(callsFor('Contact Form Failed')).toEqual([]);
    expect(va).not.toHaveBeenCalled();
  });

  it('records Contact Form Failed with rate_limited and without the response message', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(429, { error: RATE_LIMIT_MESSAGE }));
    await renderForm();
    await fillVolunteerForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(container.textContent).toContain(RATE_LIMIT_MESSAGE);
    });

    expect(callsFor('Contact Form Failed')).toEqual([
      [
        'Contact Form Failed',
        { form_id: 'contact', inquiry_type: 'volunteer', error_code: 'rate_limited' },
      ],
    ]);
    expect(callsFor('Contact Form Completed')).toEqual([]);
    expect(JSON.stringify(track.mock.calls)).not.toContain(RATE_LIMIT_MESSAGE);
    expect(JSON.stringify(track.mock.calls)).not.toContain('reader@carinyaparc.com.au');
    expect(JSON.stringify(track.mock.calls)).not.toContain(VOLUNTEER_MESSAGE);
    expect(va).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'invalid'],
    [503, 'unavailable'],
    [500, 'request_failed'],
  ] as const)('maps HTTP %s to error_code %s', async (status, errorCode) => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(status, { error: 'Please try again or write to us directly.' }),
    );
    await renderForm();
    await fillVolunteerForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(callsFor('Contact Form Failed')).toEqual([
        [
          'Contact Form Failed',
          { form_id: 'contact', inquiry_type: 'volunteer', error_code: errorCode },
        ],
      ]);
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain(
      'Please try again or write to us directly.',
    );
  });

  it('maps a thrown network error to request_failed', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await renderForm();
    await fillVolunteerForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(callsFor('Contact Form Failed')).toEqual([
        [
          'Contact Form Failed',
          { form_id: 'contact', inquiry_type: 'volunteer', error_code: 'request_failed' },
        ],
      ]);
    });
    expect(JSON.stringify(track.mock.calls)).not.toContain('Failed to fetch');
  });

  it('does not record Contact Form Failed when validation stops the submit', async () => {
    await renderForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('First name is required');
    });

    expect(callsFor('Contact Form Submitted')).toEqual([]);
    expect(callsFor('Contact Form Failed')).toEqual([]);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
