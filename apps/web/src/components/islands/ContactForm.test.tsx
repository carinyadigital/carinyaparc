/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackContactFormViewed = vi.fn();
const trackContactFormStarted = vi.fn();
const trackContactFormSubmitted = vi.fn();
const trackContactFormCompleted = vi.fn();
const trackContactFormFailed = vi.fn();

vi.mock('@/lib/analytics/client', () => ({
  trackContactFormViewed: (...args: unknown[]) => trackContactFormViewed(...args),
  trackContactFormStarted: (...args: unknown[]) => trackContactFormStarted(...args),
  trackContactFormSubmitted: (...args: unknown[]) => trackContactFormSubmitted(...args),
  trackContactFormCompleted: (...args: unknown[]) => trackContactFormCompleted(...args),
  trackContactFormFailed: (...args: unknown[]) => trackContactFormFailed(...args),
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
    trackContactFormViewed.mockReset();
    trackContactFormStarted.mockReset();
    trackContactFormSubmitted.mockReset();
    trackContactFormCompleted.mockReset();
    trackContactFormFailed.mockReset();
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

  it('pre-selects a grant or partnership from the query', async () => {
    const select = await renderAt('?inquiry=partnership');
    expect(select.value).toBe('partnership');
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
    trackContactFormViewed.mockReset();
    trackContactFormStarted.mockReset();
    trackContactFormSubmitted.mockReset();
    trackContactFormCompleted.mockReset();
    trackContactFormFailed.mockReset();
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

  function recordedProperties(): string {
    return JSON.stringify([
      ...trackContactFormViewed.mock.calls,
      ...trackContactFormStarted.mock.calls,
      ...trackContactFormSubmitted.mock.calls,
      ...trackContactFormCompleted.mock.calls,
      ...trackContactFormFailed.mock.calls,
    ]);
  }

  it('records Contact Form Viewed when the form is shown', async () => {
    await renderForm();

    expect(trackContactFormViewed).toHaveBeenCalledWith({ form_id: 'contact' });
  });

  it('records Contact Form Started once on the first focus', async () => {
    await renderForm();
    const form = container.querySelector('form') as HTMLFormElement;
    const props = reactProps<{ onFocus?: () => void }>(form);

    await act(async () => {
      props.onFocus?.();
      props.onFocus?.();
    });

    expect(trackContactFormStarted).toHaveBeenCalledTimes(1);
    expect(trackContactFormStarted).toHaveBeenCalledWith({ form_id: 'contact' });
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

    expect(trackContactFormSubmitted).toHaveBeenCalledWith({
      form_id: 'contact',
      inquiry_type: 'volunteer',
    });
    expect(trackContactFormCompleted).toHaveBeenCalledWith({
      form_id: 'contact',
      inquiry_type: 'volunteer',
    });
    expect(trackContactFormFailed).not.toHaveBeenCalled();
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

    expect(trackContactFormFailed).toHaveBeenCalledWith({
      form_id: 'contact',
      inquiry_type: 'volunteer',
      error_code: 'rate_limited',
    });
    expect(trackContactFormCompleted).not.toHaveBeenCalled();
    expect(recordedProperties()).not.toContain(RATE_LIMIT_MESSAGE);
    expect(recordedProperties()).not.toContain('reader@carinyaparc.com.au');
    expect(recordedProperties()).not.toContain(VOLUNTEER_MESSAGE);
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
      expect(trackContactFormFailed).toHaveBeenCalledWith({
        form_id: 'contact',
        inquiry_type: 'volunteer',
        error_code: errorCode,
      });
    });
    expect(recordedProperties()).not.toContain('Please try again or write to us directly.');
  });

  it('maps a thrown network error to request_failed', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await renderForm();
    await fillVolunteerForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(trackContactFormFailed).toHaveBeenCalledWith({
        form_id: 'contact',
        inquiry_type: 'volunteer',
        error_code: 'request_failed',
      });
    });
    expect(recordedProperties()).not.toContain('Failed to fetch');
  });

  it('sends a short tour enquiry with a spaced mobile and an accented name', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { success: true, message: 'Message sent' }),
    );
    await renderForm();
    await setField('firstName', 'José');
    await setField('lastName', 'O’Brien');
    await setField('email', 'guest@fastmail.com');
    await setField('phone', '+61 412 345 678');
    await setField('inquiryType', 'tours');
    await setField('message', 'Saturday morning tour?');
    await submitForm();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Message sent — thank you');
    });

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(init && 'body' in init ? init.body : '')) as {
      firstName: string;
      lastName: string;
      phone: string;
      inquiryType: string;
      message: string;
    };
    expect(body).toMatchObject({
      firstName: 'José',
      lastName: 'O’Brien',
      phone: '+61 412 345 678',
      inquiryType: 'tours',
      message: 'Saturday morning tour?',
    });
    expect(container.textContent).not.toContain('50 characters');
    expect(container.textContent).not.toContain('plain English');
  });

  it('does not record Contact Form Failed when validation stops the submit', async () => {
    await renderForm();
    await submitForm();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('First name is required');
    });

    expect(trackContactFormSubmitted).not.toHaveBeenCalled();
    expect(trackContactFormFailed).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
