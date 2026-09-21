# `apps/web` — Astro 7 public site

Scaffold for the Astro + MDX replacement of `apps/site`. Production still deploys from `apps/site` until cut-over.

On-demand endpoints live at `/api/contact/`, `/api/subscribe/`, `/api/events/signup/`, and `/api/csp-report/` (`prerender = false`). React islands for contact, subscribe (standalone, inline, end-of-post, modal), event signup, and consent live under `src/components/islands/`. Marketing pages that mount those islands land in a later phase.

From the repo root:

```bash
pnpm web:dev     # http://localhost:4321
pnpm web:build
pnpm --filter web test
```

## Content

Posts, recipes, events, legal pages, authors, categories and tags live at the repository root under `content/`, outside this app. `src/content.config.ts` points the collections there; frontmatter is validated against those schemas on every build. Hero images referenced from frontmatter live in `content/images/` and are optimised at build time.
