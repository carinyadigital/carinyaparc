# AGENTS.md

Guidance for AI coding agents working on the Carinya Parc website monorepo.

## Project overview

Carinya Parc ([carinyaparc.com.au](https://carinyaparc.com.au)) is a regenerative farm in The Branch, NSW. This repository is a **pnpm + Turborepo monorepo** that builds the public website.

- **The app:** `apps/web` — Astro 7 with MDX content collections, React 19 islands for the few interactive forms, Tailwind CSS 4, deployed on Vercel as static HTML plus four on-demand endpoints.
- **The CMS:** `content/` at the repository root. Posts, recipes, events and legal pages are MDX; authors and categories are YAML; `tags.json` maps tag slugs to display names. There is no database and no admin UI. Git is the publish gate: a merge to `main` is a publish.
- **Shared packages:** `@carinya/theme` (design tokens and the Tailwind theme), `@repo/eslint-config`, `@repo/typescript-config`.
- **Brand and skill:** `brand/voice.md`, `brand/positioning.md`, and the product-local agent skill at `skills/carinya-parc/SKILL.md`.

For product context read `docs/product/product.md` (what and why). For delivery phasing read `docs/product/roadmap.md` (when). For architecture read `docs/architecture/solution.md` (how; debt is tracked in its §10 only). For routes and folders read `docs/architecture/structure.md` (where). For engineering rules read `docs/architecture/principles.md`.

**Cut-over status.** Production still deploys from `apps/site` (the previous Next.js + Payload app) until the Vercel project is pointed at `apps/web`. Until then `apps/site` remains in the tree but is not the product: do not add features to it, do not document it, and do not run its database or admin tooling. The cut-over steps are Phase 7 of `docs/architecture/astro-migration.md`.

## Project structure

```text
.
├── apps/
│   └── web/                  # Astro 7 + MDX public site (see apps/web/README.md)
│       ├── astro.config.mjs  # static output, trailingSlash 'always', redirects, integrations
│       ├── vercel.json       # generated: security headers, CSP, favicon redirect
│       ├── integrations/     # vercel-redirect-trailing-slash.mjs
│       ├── scripts/          # generate-vercel-json.ts
│       ├── public/           # favicon/, images/ (fallbacks), motifs/, robots.txt, site.webmanifest
│       ├── src/
│       │   ├── pages/        # routes (.astro pages, .ts endpoints)
│       │   ├── layouts/      # Base.astro, Site.astro
│       │   ├── components/   # ui/, sections/, blog/, recipes/, marketing/, islands/, header/, footer/, …
│       │   ├── lib/          # content/, metadata/, schema/, validation/, security/, api/, …
│       │   ├── styles/       # globals.css, components.css, pages/*.css
│       │   ├── config/       # navigation.ts
│       │   ├── assets/       # images imported by pages (optimised at build)
│       │   └── content.config.ts
│       └── tests/            # parity.test.ts, security.test.ts (run against dist/)
├── content/                  # The CMS: posts/, recipes/, events/, legal/, authors/, categories/, images/, tags.json
├── packages/
│   ├── carinya-theme/        # @carinya/theme — CSS-first Tailwind 4 tokens
│   ├── eslint-config/        # @repo/eslint-config
│   └── typescript-config/    # @repo/typescript-config
├── brand/                    # voice.md, positioning.md (not a workspace package)
├── skills/carinya-parc/      # Product-local agent skill (not a workspace package)
├── specs/                    # Domain TDDs linked from GitHub issues
└── docs/                     # product/, architecture/, decisions/
```

**Import alias** (from `apps/web/tsconfig.json`): `@/*` → `apps/web/src/*`. Prefer it over deep relative paths.

**Naming conventions:**

- Pages and most components are `.astro` files. Route files under `src/pages/` are kebab-case (`the-property.astro`) and dynamic segments use brackets (`[slug].astro`, `[page].astro`). Public URLs are kebab-case and always end in `/`.
- Components are PascalCase files with one main export (`PostCard.astro`, `ContactForm.tsx`).
- React islands live only under `src/components/islands/` and are mounted from `.astro` files with a `client:*` directive (`client:visible` for forms, `client:idle` for the consent gate and subscribe modal host). Nothing else ships client JavaScript by default.
- `lib/` modules are kebab-case files (`rate-limit.ts`, `send-contact-notification.ts`); read helpers are `getX`, formatters are `formatX`.
- Tests are colocated as `*.test.ts` / `*.test.tsx` next to the module they cover.

## Build and test commands

**Requirements:** Node `24.16.0` (see `.nvmrc`), pnpm `10.26.0` (see root `package.json`). No database, no Docker.

### Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # then fill in values you need locally
```

`PUBLIC_SITE_URL` is the only value a local build needs. Sentry, MailerLite and Resend keys are optional; endpoints that depend on them return a clear error when the key is absent.

### Development

```bash
pnpm web:dev          # Astro dev server at http://localhost:4321 (drafts visible)
pnpm web:build        # production build to apps/web/dist and .vercel/output
pnpm dev              # every workspace package (Turbo)
```

### Quality checks (run from the repo root before finishing work)

```bash
pnpm lint             # ESLint across the monorepo
pnpm lint:fix         # auto-fix where possible
pnpm typecheck        # astro check (apps/web), no emit
pnpm format:check     # Prettier (pnpm format to write)
pnpm test             # Vitest unit tests
pnpm build            # production build (all packages)
```

App-scoped scripts:

```bash
pnpm --filter web test          # unit tests plus tests/ (dist tests skip if dist/ is absent)
pnpm --filter web test:parity   # built site against the production baseline (needs a build first)
pnpm --filter web test:dist     # links, images, CSP hosts and headers in dist/ (needs a build first)
pnpm --filter web generate:vercel-json   # regenerate vercel.json after changing lib/security
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, tests, `pnpm turbo run build --filter=web` and `pnpm --filter web test:dist` on every pull request and push to `main`. Vercel builds a preview deployment for each pull request.

## Code style guidelines

**TypeScript:** strict mode via `astro/tsconfigs/strict`. Avoid `any`. Types live next to the module that owns them (`lib/metadata/types.ts`, `lib/security/types.ts`).

**Formatting (Prettier):** single quotes, semicolons, trailing commas, 100-char print width, 2-space indent, LF line endings; `.astro` files are formatted by `prettier-plugin-astro`. ESLint enforces Prettier on `.ts`/`.tsx`/`.mjs` via `prettier/prettier: error`. `content/` is excluded from formatting.

**Astro:**

- Pages are thin: `getStaticPaths`, a few collection calls through `src/lib/content/*`, metadata, then components. Rendering belongs in components; side effects belong in `lib/`.
- Read content through the helpers in `src/lib/content/` (`getPublishedPosts`, `getPublishedRecipes`, `getUpcomingEvents`, …) rather than calling `getCollection` in a page, so draft filtering and sorting stay in one place.
- Build URLs with `src/lib/urls.ts` so every internal link keeps its trailing slash.
- Use `.astro` components for anything without interaction. Add a React island only for state, browser APIs or event handlers, and keep it under `src/components/islands/`. Islands must not import server-only modules (`lib/api`, `lib/email`, `lib/mailerlite`, anything that reads a secret).
- Use `cn()` from `@/lib/cn` for conditional Tailwind classes and reuse `src/components/ui/` before adding a new primitive.

**Styling:** Tailwind CSS 4 via `@tailwindcss/vite`. Tokens and the theme live in `packages/carinya-theme` and are imported once in `src/styles/globals.css`. Site-wide component CSS is `src/styles/components.css`; per-page CSS lives in `src/styles/pages/` and is imported by the page that needs it.

**Metadata and structured data:** every page renders through `Site.astro`, which composes metadata with `generatePageMetadata` from `src/lib/metadata/`. Page-level JSON-LD goes through `src/components/ui/JsonLd.astro`, which calls the per-type generators in `src/lib/schema/`. Do not hand-write `<meta>` tags or JSON-LD in pages.

**Scope of changes:** keep diffs focused. Match existing patterns in the file and directory you are editing. Do not refactor unrelated code.

## Content authoring

Content is the CMS. An agent writing content edits files under `content/` and nothing under `apps/`.

- **Schemas** are in `apps/web/src/content.config.ts` and are enforced on every build; `astro check` and `pnpm web:build` fail on bad frontmatter. Field-by-field detail is in `docs/architecture/structure.md`.
- **Slug = filename.** `content/posts/first-planting-day.mdx` is `/blog/first-planting-day/`. Slugs are lowercase kebab-case. Renaming a file changes a public URL; add a redirect in `astro.config.mjs` if the old URL was ever live.
- **Images** referenced from frontmatter live in `content/images/` and are referenced relative to the entry, for example `image: "../images/river-valley-aerial.jpg"`. Astro optimises them at build time. Always set `imageAlt`.
- **Drafts.** `draft: true` keeps posts, recipes and events out of the production build and the sitemap but shows them in `pnpm web:dev`. The events signup endpoint refuses drafts.
- **Tags** are free-form slugs on posts and recipes. Add a display name to `content/tags.json` when the slug is not its own label (`"cover-crops": "cover crops"`). Category and tag archive pages are only generated for values that have at least one published entry.
- **Authors and categories** are YAML files referenced by id (`author: "jonno"`, `category: "regeneration"`).
- **Events** carry `startsAt`, `location`, `isFull` and an optional external `signupTarget`. On-site signups go to a MailerLite group named per event; there is no capacity counter, so set `isFull: true` by hand when a day is booked out.
- Copy follows `brand/voice.md`, in Australian English.

### Editorial workflow

1. Branch from `main` and write or edit files under `content/`.
2. Open a pull request. CI validates the frontmatter and builds the site; Vercel deploys a preview URL for the branch. That preview is the draft review.
3. A human approves the pull request. Branch protection on `main` requires that approval: agents stage, humans publish.
4. Merging to `main` deploys production. There is no other publish step.

## Testing instructions

**Runner:** Vitest through `apps/web/vitest.config.ts` (`getViteConfig` from Astro, Node environment, `vitest.setup.ts` sets `PUBLIC_SITE_URL`).

**Where tests live:** colocated as `*.test.ts` / `*.test.tsx` under `apps/web/src/`, plus two dist-level suites in `apps/web/tests/` that read `dist/` and `.vercel/output/config.json` after a build.

**What to test:**

- Endpoint handlers in `src/lib/api/` (validation, honeypot, timing, rate limit, error responses)
- Zod schemas and sanitisation in `src/lib/validation/`
- Metadata, JSON-LD, security header and CSP generators
- Islands with meaningful state (`ConsentGate`, `EventSignup`, `InlineSubscribe`)

**What not to test by default:** presentational `.astro` components and marketing pages. Route-level output is covered by `test:parity` and `test:dist`.

```bash
pnpm test                                        # all unit tests via Turbo
pnpm --filter web vitest run src/lib/api         # a folder
pnpm --filter web vitest run -t "honeypot"       # by test name
pnpm web:build && pnpm --filter web test:dist    # dist checks
```

Add or update tests when changing validation, endpoint behaviour, or security-sensitive logic. Fix all lint, type and test failures before considering work complete.

## Security considerations

**Secrets and environment:**

- Never commit `.env` or real API keys. `apps/web/.env.example` lists every variable.
- Secrets (`MAILERLITE_API_KEY`, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN`) are read only in server code: endpoint handlers under `src/lib/api/` and the service clients in `src/lib/mailerlite/`, `src/lib/email/`. Endpoints under `src/pages/api/` are the only files that may call those handlers.
- Only `PUBLIC_*` variables reach the browser (`PUBLIC_SITE_URL`, `PUBLIC_GTM_ID`, `PUBLIC_SENTRY_DSN`). Never put a secret behind a `PUBLIC_` name. New variables must also be added to the `turbo.json` env lists and the `turbo/no-undeclared-env-vars` allow list in `apps/web/eslint.config.mjs`.

**HTTP security:**

- Headers and CSP are generated by `src/lib/security/` into `vercel.json` (`pnpm --filter web generate:vercel-json`) and merged into the Vercel Build Output config at build time by the `vercel-security-config` integration in `astro.config.mjs`. `tests/security.test.ts` asserts they are present.
- CSP is a host allowlist with `'unsafe-inline'` for scripts, because static HTML cannot carry per-request nonces. It ships as `Content-Security-Policy-Report-Only` until cut-over, with violations posted to `/api/csp-report/`, then is enforced. Do not add hosts or loosen directives without explicit approval.
- `/admin` and `/api/graphql*` return 410 Gone (`src/lib/security/gone.ts` and the Vercel routes in `vercel-config.ts`). Keep them.
- Never weaken `vercel.json` headers, CSP, or input validation to make a test or a build pass.

**Endpoints and input handling:**

- The four on-demand endpoints are `/api/contact/`, `/api/subscribe/`, `/api/events/signup/` and `/api/csp-report/`, each `export const prerender = false` with the handler in `src/lib/api/`. Apart from the 410 handlers for retired routes, every other route is static.
- Validate all external input with the Zod schemas in `src/lib/validation/` and sanitise text with `src/lib/validation/sanitize.ts` before it reaches an email or a third party.
- A new form endpoint follows the existing pattern: `readJsonBody` (JSON or form-encoded), Zod parse, honeypot field (`website`) that returns a fake success, minimum `submissionTime` of 2000 ms, `createRateLimiter` keyed by lowercased email, `jsonResponse` with `Cache-Control: no-store`, and a `GET` that returns 405.
- Rate limiting is in-memory per serverless instance. It is a nuisance filter, not a guarantee; durable abuse control is a Vercel WAF rule on `/api/*` configured at cut-over.

**Consent and analytics:**

- Analytics consent is the client-set `cp_consent` cookie (not httpOnly) written by `src/lib/consent/cookie.ts`. `ConsentGate` injects GTM and the Vercel Analytics and Speed Insights beacons only after acceptance. Do not load tracking scripts anywhere else.

**General rules for agents:**

- Do not log or expose secrets, tokens, or personal data in error messages, metrics tags or comments (handlers log the email domain, never the address).
- Do not disable security headers, CSP, validation or rate limiting to make something work.
- Do not import server-only modules into anything under `src/components/`.

## Additional resources

| Document                                 | Role                                              |
| ---------------------------------------- | ------------------------------------------------- |
| `docs/product/product.md`                | What and why                                      |
| `docs/product/roadmap.md`                | When                                              |
| `docs/architecture/solution.md`          | How — architecture; debt in §10 only              |
| `docs/architecture/structure.md`         | Where — routes, folders, content contract         |
| `docs/architecture/principles.md`        | Engineering rules                                 |
| `docs/architecture/astro-migration.md`   | Migration plan; Phase 7 is the cut-over checklist |
| `docs/decisions/`                        | Architecture decision records                     |
| `apps/web/README.md`                     | App-level commands and layout                     |
| `apps/web/.env.example`                  | Every environment variable                        |
| `brand/voice.md`, `brand/positioning.md` | How the site speaks                               |

When adding or changing user-visible features, update the relevant doc in `docs/` alongside code changes. Track technical debt only in `docs/architecture/solution.md` §10.
