# Carinya Parc Website

Website for [Carinya Parc](https://carinyaparc.com.au) — a regenerative farm in The Branch, NSW.

## Features

- **Astro 7** static site with **MDX** content collections (`apps/web`)
- **React 19** islands for the contact, subscribe and event-signup forms only; every other page ships no JavaScript
- **Content in git** at `content/` — posts, recipes, events, legal pages, authors, categories. No database, no admin UI; merging to `main` publishes
- **Tailwind CSS 4** with design tokens in `packages/carinya-theme`
- **pnpm** + **Turborepo** monorepo, deployed on **Vercel** with generated security headers and CSP

**Cut-over status:** production still deploys from the previous app in `apps/site` until the Vercel project is pointed at `apps/web`; remaining work is Phase 2 of [`docs/product/roadmap.md`](docs/product/roadmap.md).

## Documentation

See [`docs/`](docs/) — architecture ([`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)), product (`docs/product/`) and decisions (`docs/decisions/`). Guidance for coding agents is in [`AGENTS.md`](AGENTS.md); the app's own notes are in [`apps/web/README.md`](apps/web/README.md).

## Getting started

**Requirements:** Node `24.16.0` (see `.nvmrc`) and pnpm `10.26.0`.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # optional keys; the site builds without them
pnpm web:dev                              # http://localhost:4321
```

Drafts (`draft: true`) are visible in the dev server and excluded from production builds.

## Quality checks

Run from the repo root before merge; CI runs the same set plus the dist checks.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm web:build && pnpm --filter web test:dist
```

## License

This project is available under the MIT license. It is freely available for any agricultural business to copy, modify, and deploy for their own farm website.
