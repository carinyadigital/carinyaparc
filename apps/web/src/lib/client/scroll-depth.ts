import { trackArticleScrollDepth } from '@/lib/analytics/events';
import { SCROLL_DEPTH_THRESHOLDS, type ScrollDepth } from '@/lib/analytics/types';

/** Viewport-bottom progress through the article (0–100). */
export function getArticleScrollPercent(article: HTMLElement): number {
  const rect = article.getBoundingClientRect();
  const articleTop = window.scrollY + rect.top;
  const articleHeight = article.offsetHeight;

  if (articleHeight <= 0) {
    return 0;
  }

  const viewportBottom = window.scrollY + window.innerHeight;
  const scrolled = viewportBottom - articleTop;
  return Math.min(100, Math.max(0, (scrolled / articleHeight) * 100));
}

export function bindArticleScrollDepth(
  article: HTMLElement,
  onThreshold: (depth: ScrollDepth) => void,
): () => void {
  const fired = new Set<ScrollDepth>();

  const onScrollOrResize = () => {
    const percent = getArticleScrollPercent(article);

    for (const threshold of SCROLL_DEPTH_THRESHOLDS) {
      if (percent >= threshold && !fired.has(threshold)) {
        fired.add(threshold);
        onThreshold(threshold);
      }
    }
  };

  onScrollOrResize();
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);

  return () => {
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
  };
}

/** Bind scroll-depth tracking for the first article on the page, if any. */
export function bindPageArticleScrollDepth(): void {
  const article = document.querySelector('article');
  if (article instanceof HTMLElement) {
    bindArticleScrollDepth(article, (depth) => {
      trackArticleScrollDepth({ depth });
    });
  }
}
