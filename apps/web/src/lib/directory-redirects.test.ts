import { describe, expect, it } from 'vitest';

import { promoteDirectoryRedirects, type DirectoryRedirectRoute } from './directory-redirects';

const TRAILING_SLASH_SRC = '^/((?:[^/]+/)*[^/\\.]+)$';

function deploymentRoutes(): DirectoryRedirectRoute[] {
  return [
    { src: '/(.*)', headers: { 'X-Frame-Options': 'DENY' }, continue: true },
    { src: '^/\\.well-known(?:/.*)?$' },
    { src: TRAILING_SLASH_SRC, headers: { Location: '/$1/' }, status: 308 },
    {
      src: '^/((?:[^/]+/)*[^/]+\\.\\w+)/$',
      headers: { Location: '/$1' },
      status: 308,
    },
    { src: '^\\/beef$', headers: { Location: '/' }, status: 301 },
    { src: '^/sitemap\\.xml$', headers: { Location: '/sitemap-index.xml' }, status: 301 },
    { handle: 'filesystem' },
    { src: '/.*', dest: '/404.html', status: 404 },
  ];
}

function firstMatch(
  routes: DirectoryRedirectRoute[],
  pathname: string,
): DirectoryRedirectRoute | undefined {
  return routes.find((route) => {
    if (!route.src || route.continue) return false;
    return new RegExp(route.src).test(pathname);
  });
}

describe('promoteDirectoryRedirects', () => {
  const redirects = {
    '/favicon.ico': '/favicon/favicon.ico',
    '/sitemap.xml': '/sitemap-index.xml',
    '/beef': '/',
  };

  it('sends both spellings of a directory redirect home before trailing-slash normalisation', () => {
    const output = promoteDirectoryRedirects({ routes: deploymentRoutes() }, redirects);
    const routes = output.routes ?? [];

    expect(routes[0]?.continue).toBe(true);
    expect(firstMatch(routes, '/beef')).toMatchObject({
      headers: { Location: '/' },
      status: 301,
    });
    expect(firstMatch(routes, '/beef/')).toMatchObject({
      headers: { Location: '/' },
      status: 301,
    });
    expect(routes.filter((route) => route.headers?.Location === '/')).toHaveLength(2);
  });

  it('leaves extension redirects and other paths on the existing rules', () => {
    const output = promoteDirectoryRedirects({ routes: deploymentRoutes() }, redirects);
    const routes = output.routes ?? [];

    expect(firstMatch(routes, '/sitemap.xml')).toMatchObject({
      headers: { Location: '/sitemap-index.xml' },
      status: 301,
    });
    expect(firstMatch(routes, '/about')).toMatchObject({
      headers: { Location: '/$1/' },
      status: 308,
    });
    expect(firstMatch(routes, '/')?.headers?.Location).toBeUndefined();
  });
});
