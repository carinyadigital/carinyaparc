import { describe, expect, it } from 'vitest';

import { navigation, type NavItem } from './navigation';

/** Static public pages the header may link to. Dynamic segments stay out of the primary nav. */
const PUBLIC_ROUTES = new Set([
  '/',
  '/about/',
  '/about/jonathan/',
  '/about/the-property/',
  '/blog/',
  '/contact/',
  '/get-involved/events/',
  '/recipes/',
  '/regenerate/',
  '/subscribe/',
]);

function isVisible(item: NavItem): boolean {
  return item.visible !== false;
}

function isRealRouteOrFragment(href: string): boolean {
  const hashIndex = href.indexOf('#');
  if (hashIndex === 0) {
    return href.length > 1;
  }

  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const normalised = path === '' || path === '/' ? '/' : path.endsWith('/') ? path : `${path}/`;
  return PUBLIC_ROUTES.has(normalised);
}

describe('header navigation', () => {
  const visible = navigation.filter(isVisible);

  it('shows Cook linking to /recipes/', () => {
    const cook = navigation.find((item) => item.verb === 'Cook');

    expect(cook).toMatchObject({ href: '/recipes/', visible: true });
    expect(visible).toContainEqual(expect.objectContaining({ verb: 'Cook', href: '/recipes/' }));
  });

  it('keeps Experience and Learn hidden', () => {
    for (const verb of ['Experience', 'Learn']) {
      expect(navigation.find((item) => item.verb === verb)).toMatchObject({
        href: '#',
        visible: false,
      });
      expect(visible.some((item) => item.verb === verb)).toBe(false);
    }
  });

  it('points every visible item at a real route or an in-page fragment', () => {
    expect(visible.length).toBeGreaterThan(0);

    for (const item of visible) {
      expect(isRealRouteOrFragment(item.href), item.verb ?? item.label).toBe(true);
    }
  });
});
