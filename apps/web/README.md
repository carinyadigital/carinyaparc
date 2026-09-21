# `apps/web` — Carinya Parc public site

Astro 7 + MDX. Static HTML for every page, React islands for the contact, subscribe and event-signup forms, and five on-demand endpoints running as Vercel functions. Folder-by-folder detail is in `docs/ARCHITECTURE.md`; the rules are in `docs/PRINCIPLES.md`.

## Commands

From the repo root:

```bash
pnpm web:dev                    # http://localhost:4321, drafts visible
pnpm web:build                  # dist/ and .vercel/output/
pnpm --filter web test          # Vitest: src/**/*.test.ts(x) plus tests/ (dist suites skip without a build)
pnpm --filter web test:dist     # links, images, CSP hosts, headers — run after a build
pnpm --filter web test:parity   # built site vs tests/baseline/
pnpm --filter web generate:vercel-json   # regenerate vercel.json from src/lib/security
pnpm lint && pnpm typecheck && pnpm format:check   # from the root, across the monorepo
```

## Content

Posts, recipes, events, legal pages, authors, categories and `tags.json` live at the repository root under `content/`, outside this app. `src/content.config.ts` points the six collections there (`CONTENT_ROOT = '../../content'`) and validates frontmatter on every build. Hero images referenced from frontmatter live in `content/images/` and are optimised at build time. Slug = filename; `draft: true` hides an entry from production.

## Endpoints

The form, report, and Sentry tunnel endpoints are on-demand (`prerender = false`); each delegates to a handler in `src/lib/api/`:

| Path                  | Does                                                           |
| --------------------- | -------------------------------------------------------------- |
| `/api/contact/`       | Validates, rate-limits and emails the enquiry via Resend       |
| `/api/subscribe/`     | Adds the subscriber to MailerLite with interests               |
| `/api/events/signup/` | Adds the subscriber to the MailerLite group for the event slug |
| `/api/csp-report/`    | Receives CSP violation reports                                 |
| `/monitoring/`        | Forwards browser Sentry envelopes to the configured project    |

`/admin`, `/api/graphql` and `/api/graphql-playground` return 410 Gone. Redirects are in `astro.config.mjs`; security headers and the CSP are generated into `vercel.json` and merged into the Vercel Build Output config at build time.

## Tests

Unit tests are colocated under `src/` (`*.test.ts`, `*.test.tsx`) and cover the endpoint handlers, validation, sanitisation, security, metadata, JSON-LD and the stateful islands. `tests/security.test.ts` and `tests/parity.test.ts` read `dist/` and `.vercel/output/config.json`; CI builds first and then runs `test:dist`.

## Environment

Copy `.env.example` to `.env`. Nothing is required for a local build. `PUBLIC_*` variables are the only ones the browser sees (`PUBLIC_SITE_URL`, `PUBLIC_GTM_ID`, `PUBLIC_SENTRY_DSN`). `MAILERLITE_API_KEY`, `RESEND_API_KEY` and the `CONTACT_*` / `EVENT_SIGNUP_*` settings are read by the endpoint handlers only; Sentry is enabled when a DSN is present. Browser reports go through `/monitoring/`. A new variable must also be added to `turbo.json` and the allow list in `eslint.config.mjs`.
