export interface DirectoryRedirectRoute {
  src?: string;
  headers?: Record<string, string>;
  status?: number;
  continue?: boolean;
  handle?: string;
  [key: string]: unknown;
}

export interface DirectoryRedirectOutput {
  routes?: DirectoryRedirectRoute[];
  [key: string]: unknown;
}

const TRAILING_SLASH_SRC = '^/((?:[^/]+/)*[^/\\.]+)$';

/**
 * Put each directory redirect ahead of trailing-slash normalisation.
 * That rule runs first and only matches a path with no slash, sending it to
 * the slashed form. A slashless source therefore never runs, and the slashed
 * URL is left without a destination. Both spellings are inserted ahead of
 * that rule so each redirects once.
 */
export function promoteDirectoryRedirects<T extends DirectoryRedirectOutput>(
  output: T,
  redirects: Record<string, string>,
): T {
  const injected = directoryRedirectRoutes(redirects);
  if (injected.length === 0) {
    return output;
  }

  const injectedSrc = new Set(injected.map((route) => normaliseSrc(route.src ?? '')));
  const routes = [...(output.routes ?? [])].filter(
    (route) => route.src === undefined || !injectedSrc.has(normaliseSrc(route.src)),
  );
  const trailingIndex = routes.findIndex((route) => route.src === TRAILING_SLASH_SRC);
  const insertAt = trailingIndex === -1 ? indexAfterContinue(routes) : trailingIndex;
  routes.splice(insertAt, 0, ...injected);

  return { ...output, routes };
}

function directoryRedirectRoutes(redirects: Record<string, string>): DirectoryRedirectRoute[] {
  const routes: DirectoryRedirectRoute[] = [];

  for (const [from, to] of Object.entries(redirects)) {
    if (hasFileExtension(from)) {
      continue;
    }

    const pathname = `/${from.replace(/^\/+|\/+$/g, '')}`;
    if (pathname === '/') {
      continue;
    }

    const destination = to.startsWith('/') ? to : `/${to}`;
    routes.push(redirectRoute(pathname, destination), redirectRoute(`${pathname}/`, destination));
  }

  return routes;
}

function redirectRoute(pathname: string, destination: string): DirectoryRedirectRoute {
  return {
    src: `^${escapeRegExp(pathname)}$`,
    headers: { Location: destination },
    status: 301,
  };
}

function hasFileExtension(pathname: string): boolean {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return last.includes('.');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normaliseSrc(src: string): string {
  return src.replace(/\\\//g, '/');
}

function indexAfterContinue(routes: DirectoryRedirectRoute[]): number {
  let index = 0;
  while (index < routes.length && routes[index]?.continue) {
    index += 1;
  }
  return index;
}
