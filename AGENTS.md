# AGENTS.md

Guidance for AI coding agents working on the Carinya Parc website monorepo.

## Project overview

Carinya Parc ([carinyaparc.com.au](https://carinyaparc.com.au)) is a working rural property in New South Wales. This repository is a **pnpm + Turborepo monorepo** that powers the public website and CMS.

- **Primary app:** `apps/site` — Next.js 16 (App Router) with Payload CMS 3, Postgres, Tailwind CSS 4, and React 19 (production until Astro cut-over).
- **Astro scaffold:** `apps/web` — Astro 6 + MDX, built alongside `apps/site`. Not production yet.
- **Content:** Blog posts and recipes from Payload (Postgres); legal pages from MDX in `content/legal/`.
- **Shared packages:** `@carinya/theme` (design tokens), `@repo/eslint-config`, `@repo/typescript-config`. UI primitives live in the app at `apps/site/src/components/ui/` (built on Base UI).
- **Brand:** `brand/voice.md` and `brand/positioning.md`. Product skill: `skills/carinya-parc/SKILL.md`.
- **Deployment:** Vercel (production). Payload admin at `/admin`; public marketing site, blog, and recipes share a common site root layout.

For product context and feature intent, read `docs/product.md` (what and why). For delivery phasing, read `docs/product/roadmap.md` (when). For architecture and debt, read `docs/architecture/solution.md` (how; §10). For routing and folders, read `docs/architecture/structure.md` (where). For engineering rules, read `docs/architecture/principles.md`.

## Project structure

```text
.
├── apps/
│   ├── site/                 # Next.js App Router app (production until Astro cut-over)
│   │   ├── content/          # MDX: legal pages; archived posts/recipes MDX
│   │   ├── public/           # Static assets (images, favicon, manifest)
│   │   └── src/
│   │       ├── app/          # Routes and layouts
│   │       │   ├── (payload)/  # Payload admin + API (separate root layout)
│   │       │   ├── (www)/      # Marketing pages (home, about, contact, …)
│   │       │   ├── (blog)/     # Blog index and post routes
│   │       │   └── (recipes)/  # Recipe routes
│   │       ├── collections/  # Payload CMS collection configs
│   │       ├── components/   # Shared UI (sections chrome, forms, ui/, …)
│   │       ├── features/     # Domain modules (blog/, recipes/, events/, …)
│   │       ├── hooks/        # Client hooks (use-*)
│   │       ├── lib/          # Cross-cutting utilities (payload client, security/, …)
│   │       ├── providers/    # App-wide React providers
│   │       └── styles/       # Site CSS (components, page overrides)
│   └── web/                  # Astro 6 + MDX public site (scaffold; not production yet)
├── packages/
│   ├── carinya-theme/        # @carinya/theme — CSS-first Tailwind 4 tokens
│   ├── eslint-config/        # @repo/eslint-config
│   └── typescript-config/    # @repo/typescript-config
├── brand/                    # Voice and positioning markdown (not a workspace package)
├── skills/
│   └── carinya-parc/         # Product-local agent skill (not a workspace package)
└── docs/                     # product/, architecture/
```

**Import aliases** (from `apps/site/tsconfig.json`):

- `@/*` → `./src/*`

Prefer aliases over deep relative paths (`../../../…`).

**Key conventions:**

- Route segments: **kebab-case** (`the-property`, `[post]`, `[recipe]`)
- Components: **PascalCase** files and exports (`SubscribeForm.tsx`)
- Hooks: **kebab-case** files, `use*` names (`use-mobile.ts`)
- `page.tsx` files stay thin — delegate domain UI/data to `features/{domain}/`, shared chrome to `components/sections/`

## Build and test commands

**Requirements:** Node `24.16.0` (see `.nvmrc`), pnpm `10.26.0` (see root `package.json`).

### Setup

```bash
pnpm install
cp apps/site/.env.example apps/site/.env.local   # then fill in values
docker compose -f apps/site/docker-compose.yml up -d   # Postgres for Payload /admin
```

### Development

```bash
pnpm dev              # all packages (Turbo)
pnpm site:dev         # site app only (Next.js + Turbopack)
pnpm web:dev          # Astro scaffold only
```

Site-only scripts from `apps/site`:

```bash
pnpm generate:types   # regenerate Payload types after schema changes
```

### Quality checks (run from repo root before finishing work)

GitHub Actions CI runs lint, typecheck, format check, and tests on every pull request
(`.github/workflows/ci.yml`). Run the same checks locally before merge:

```bash
pnpm lint             # ESLint across the monorepo
pnpm lint:fix         # auto-fix where possible
pnpm typecheck        # TypeScript (no emit)
pnpm format:check     # Prettier
pnpm test             # Vitest (site + web)
pnpm build            # production build (all packages)
pnpm site:build       # site app only
pnpm web:build        # Astro scaffold only
```

To scope work to a single package:

```bash
pnpm turbo run lint --filter=site
pnpm turbo run test --filter=site
pnpm turbo run build --filter=site
```

## Code style guidelines

**TypeScript:** strict mode is required (`packages/typescript-config`). Avoid `any`. Shared types live under `src/types/` or next to related modules.

**Formatting (Prettier):** single quotes, semicolons, trailing commas, 100-char print width, 2-space indent, LF line endings. ESLint enforces Prettier via `prettier/prettier: error`.

**React / Next.js:**

- Default to **Server Components**. Add `"use client"` only for browser APIs, state, or event handlers.
- Client components must not import server-only modules (database, session helpers, etc.).
- Data fetching belongs in server components or route handlers — not in UI components.
- Use `cn()` from `@/lib/cn` for conditional Tailwind classes.
- Reuse primitives from `@/components/ui` before adding new low-level UI.

**Styling:** Tailwind CSS 4. Design tokens live in `packages/carinya-theme` (`@carinya/theme`). Site-specific CSS stays in `apps/site/src/styles/` (`globals.css`, `components.css`, page overrides). `tailwind.config.ts` and `postcss.config.mjs` remain in the site app.

**Architecture (from `docs/architecture/principles.md`):**

- Separation of concerns: UI components must not contain side effects or business logic.
- Metadata: compose small helpers in `lib/metadata/`; JSON-LD via discrete functions in `lib/schema/`.
- Environment variables exposed to the browser must use the `NEXT_PUBLIC_` prefix and must not contain secrets.

**Scope of changes:** keep diffs focused. Match existing patterns in the file and directory you are editing. Do not refactor unrelated code.

## Testing instructions

**Runner:** Vitest (`apps/site/vitest.config.mjs`). Tests use the Node environment with `vitest.setup.ts`.

**Where tests live:** colocated with source as `*.test.ts` / `*.test.tsx` under `src/`. The `include` glob is `src/**/*.test.{ts,tsx}`.

**What to test:**

- API route handlers and input validation (Zod schemas, sanitisation)
- Non-trivial library logic (Payload helpers, schema generators, validation)
- UI primitives in `apps/site/src/components/ui/`

**What not to test by default:** presentational pages and static marketing sections unless they contain meaningful logic.

```bash
pnpm test                                    # all site tests
pnpm --filter site vitest run                # same, explicit filter
pnpm --filter site vitest run path/to/file   # single file
pnpm --filter site vitest run -t "test name" # by test name
```

Add or update tests when changing validation, API behaviour, or security-sensitive logic. Fix all lint, type, and test failures before considering work complete.

## Security considerations

**Secrets and environment:**

- Never commit `.env.local`, `.env.sentry-build-plugin`, or real API keys.
- Copy `apps/site/.env.example` to `.env.local` for local development.
- Required secrets include `PAYLOAD_SECRET`, `NEON_DATABASE_URL`, `SESSION_SECRET`, `MAILERLITE_API_KEY`, and (when enabled) `RESEND_API_KEY`. See `turbo.json` for the full env var list.
- Only `NEXT_PUBLIC_*` variables are safe for client-side code.

**Authentication and cookies:**

- Analytics consent in httpOnly `cp_consent` cookie — set via `setConsent` server action in `src/lib/consent/`.
- `cp_session` JWT helpers live in `src/lib/session/` (scaffold only; not wired to routes). Payload admin uses Payload Users authentication, not `cp_session`.
- Cookie name constants live in `src/lib/constants.ts`.

**HTTP security:**

- CSP, HSTS, and security headers are implemented in `src/lib/security/` and applied per request.
- CSP uses host allowlists + `'unsafe-inline'` for scripts (static/ISR public shell cannot use
  per-request script nonces). Do not reintroduce nonce/`strict-dynamic` on public routes without
  making those routes dynamic; do not weaken other directives without explicit approval.
- Feature flags: `SECURITY_CSP_ENABLED`, `SECURITY_CSP_REPORT_ONLY`.
- Middleware does not set `Cache-Control`; Next.js/Vercel own caching for HTML and static routes, and sensitive API routes set `no-store` in their handlers.

**Input handling:**

- Validate all external input with Zod schemas in `src/lib/validation/`.
- Sanitise user-provided HTML/text via utilities in `src/lib/validation/sanitize.ts` (plain-Node strip/escape; no DOMPurify).
- Contact and subscribe endpoints use in-memory rate limiting today; see `docs/architecture/solution.md` §10 for current debt and `docs/product/roadmap.md` Phase 1 for the fix.

**Payload CMS:**

- Admin UI at `/admin` uses a separate root layout from the public site.
- Regenerate Payload types after collection schema changes: `pnpm generate:types`.

**General rules for agents:**

- Do not log or expose secrets, session tokens, or PII in error messages or comments.
- Do not disable security headers, CSP, or validation to make tests pass.
- Do not add `"use client"` to modules that handle secrets or server-only credentials.
- When adding API routes, follow existing patterns for validation, rate limiting, and error responses.

## Additional resources

| Document                          | Role                                 |
| --------------------------------- | ------------------------------------ |
| `docs/product.md`                 | What and why                         |
| `docs/product/roadmap.md`         | When                                 |
| `docs/architecture/solution.md`   | How — architecture; debt in §10 only |
| `docs/architecture/structure.md`  | Where — routes and folders           |
| `docs/architecture/principles.md` | Engineering rules                    |
| `apps/site/.env.example`          | Required environment variables       |

When adding or changing user-visible features, update the relevant doc in `docs/` alongside code changes. Track technical debt only in `docs/architecture/solution.md` §10.
