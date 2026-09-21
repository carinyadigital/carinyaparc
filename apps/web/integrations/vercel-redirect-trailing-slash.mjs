/**
 * Astro integration: make Vercel redirect routes tolerate the trailing slash.
 *
 * With `trailingSlash: 'always'`, every public URL ends in `/`, but @astrojs/vercel compiles a
 * config redirect such as `/blog/old/` to the Vercel route `^/blog/old$`. A request for
 * `/blog/old/` therefore never matches the 301 and falls through to the 404 page. This hook
 * rewrites those sources to `^/blog/old/?$` after the build so both forms redirect.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default function vercelRedirectTrailingSlash() {
  let root = '';
  return {
    name: 'vercel-redirect-trailing-slash',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': async ({ logger }) => {
        const configPath = path.join(root, '.vercel', 'output', 'config.json');
        let raw;
        try {
          raw = await readFile(configPath, 'utf8');
        } catch {
          return;
        }
        const config = JSON.parse(raw);
        let patched = 0;
        for (const route of config.routes ?? []) {
          const isRedirect = route.status && [301, 302, 307, 308].includes(route.status);
          if (!isRedirect || typeof route.src !== 'string' || !route.headers?.Location) continue;
          // Only literal paths without a file extension and without an existing optional slash.
          if (/\/\?\$$/.test(route.src) || /\\\.\w+\$$/.test(route.src) || /[()]/.test(route.src)) {
            continue;
          }
          if (route.src.endsWith('$') && !route.src.endsWith('/$')) {
            route.src = `${route.src.slice(0, -1)}/?$`;
            patched += 1;
          }
        }
        if (patched > 0) {
          await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
          logger.info(`Patched ${patched} redirect route(s) to accept a trailing slash.`);
        }
      },
    },
  };
}
