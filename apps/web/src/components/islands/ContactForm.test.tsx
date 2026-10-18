/**
 * @vitest-environment jsdom
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ContactForm inquiry query', () => {
  let container: HTMLDivElement;
  let root: Root;
  let ContactForm: typeof import('@/components/islands/ContactForm').ContactForm;

  beforeEach(async () => {
    vi.resetModules();
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
