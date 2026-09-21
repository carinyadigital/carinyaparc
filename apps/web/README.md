# `apps/web` — Astro 6 public site

Scaffold for the Astro + MDX replacement of `apps/site`. Production still deploys from `apps/site` until cut-over.

From the repo root:

```bash
pnpm web:dev     # http://localhost:4321
pnpm web:build
pnpm --filter web test
```

## Content

Posts, recipes, events, legal pages, authors, categories and tags live at the repository root under `content/`, outside this app. `src/content.config.ts` points the collections there; frontmatter is validated against those schemas on every build. Hero images referenced from frontmatter live in `content/images/` and are optimised at build time.
