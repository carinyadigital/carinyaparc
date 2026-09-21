/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';

import { bindArticleScrollDepth, getArticleScrollPercent } from './scroll-depth';

describe('article scroll depth', () => {
  it('returns 0 for a zero-height article', () => {
    const article = document.createElement('article');
    vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    });
    Object.defineProperty(article, 'offsetHeight', { value: 0 });
    expect(getArticleScrollPercent(article)).toBe(0);
  });

  it('fires each threshold once as the viewport advances', () => {
    const article = document.createElement('article');
    document.body.appendChild(article);
    Object.defineProperty(article, 'offsetHeight', { value: 1000 });
    vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 1000,
      left: 0,
      right: 0,
      width: 100,
      height: 1000,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 250 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });

    const onThreshold = vi.fn();
    const unbind = bindArticleScrollDepth(article, onThreshold);

    expect(onThreshold).toHaveBeenCalledWith(25);
    expect(onThreshold).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('scroll'));
    expect(onThreshold).toHaveBeenCalledTimes(1);

    vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
      top: -250,
      bottom: 750,
      left: 0,
      right: 0,
      width: 100,
      height: 1000,
      x: 0,
      y: -250,
      toJSON() {
        return {};
      },
    });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 250 });
    window.dispatchEvent(new Event('scroll'));
    expect(onThreshold).toHaveBeenCalledWith(50);

    unbind();
    article.remove();
  });
});
