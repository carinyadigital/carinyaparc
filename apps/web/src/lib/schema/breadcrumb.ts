import { BASE_URL, DEFAULT_BREADCRUMB_HOME, BREADCRUMB_NAME_MAP } from '../constants';

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

    const friendlyName =
      BREADCRUMB_NAME_MAP[segment] ||
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    breadcrumbs.push({
      name: friendlyName,
      url: `${BASE_URL}${currentPath}/`,
      position: index + 2,
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
