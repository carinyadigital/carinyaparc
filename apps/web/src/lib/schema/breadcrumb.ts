import { BASE_URL, DEFAULT_BREADCRUMB_HOME, BREADCRUMB_NAME_MAP } from '../constants';

/**
 * Prefixes that have no page. Legal documents live at `/legal/{slug}/`.
 * `/legal/` itself is a 404, so an intermediate crumb must not link there.
 */
const PREFIXES_WITHOUT_A_PAGE = new Set(['/legal']);

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

export interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

export function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [DEFAULT_BREADCRUMB_HOME];

  if (!pathname || pathname === '/') {
    return breadcrumbs;
  }

  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isCurrentPage = index === segments.length - 1;
    if (!isCurrentPage && PREFIXES_WITHOUT_A_PAGE.has(currentPath)) {
      return;
    }

    const friendlyName =
      BREADCRUMB_NAME_MAP[segment] ||
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    breadcrumbs.push({
      name: friendlyName,
      url: `${BASE_URL}${currentPath}/`,
      position: breadcrumbs.length + 1,
    });
  });

  return breadcrumbs;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item) => ({
      '@type': 'ListItem' as const,
      position: item.position,
      name: item.name,
      item: item.url,
    })),
  };
}
