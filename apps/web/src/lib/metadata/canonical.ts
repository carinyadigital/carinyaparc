/**
 * Normalise a route path to a trailing slash so canonical URLs never point at
 * a redirect from `trailingSlash: 'always'`.
 */
export function withTrailingSlash(path: string): string {
  if (path === '' || path === '/') {
    return '/';
  }

  return path.endsWith('/') ? path : `${path}/`;
}

export function generateCanonicalUrl(baseUrl: string, path: string): string {
  const url = new URL(path, baseUrl);
  url.pathname = withTrailingSlash(url.pathname);
  return url.toString();
}
