---
type: Architecture
scope: carinyaparc-website
state: current
version: '0.4'
owner: engineering
status: Draft
last_updated: 2026-09-22
related:
  - docs/product/product.md
  - docs/PRINCIPLES.md
  - docs/product/roadmap.md
  - docs/decisions/ADR-0001-astro-mdx.md
  - docs/decisions/ADR-0002-git-is-the-publish-gate.md
---

# Architecture — Carinya Parc website

> **Ownership rule.** When the authoring model, runtime split, public routes, content contract, security policy, or deployment topology change, this document must be updated in the same PR.

> **State.** `current` (as-is). Architecture decisions live in [`docs/decisions/`](decisions/).

**How** the Carinya Parc website is built and behaves — architecture, runtime, data model, integration boundaries — and **where** code, content and routes live.

| Doc                                        | Role                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| [`product/product.md`](product/product.md) | What and why                                                                  |
| [`product/roadmap.md`](product/roadmap.md) | When                                                                          |
| **This document**                          | How and where — plus risks, technical debt, and open questions (**§10 only**) |
| [`PRINCIPLES.md`](PRINCIPLES.md)           | Engineering rules                                                             |

---

## 1. Context and scope

### 1.1 System context

```text
                          ┌────────────────────────────────────────────┐
                          │ Downstream services (HTTPS)                │
                          │  MailerLite  · Resend · Sentry             │
                          │  Google Tag Manager · Vercel Analytics     │
                          └───────▲───────────────▲────────────────────┘
                                  │               │ consent-gated beacons
        static HTML, CSS, images  │ server calls  │ (browser → GTM / Vercel)
┌──────────────┐    HTTPS   ┌─────┴───────────────┴──────────────────────┐
│   Visitor    │───────────>│ Vercel                                     │
│   browser    │<───────────│  CDN: prerendered pages from apps/web      │
└──────────────┘            │  Functions (on demand, prerender = false): │
       ▲                    │   POST /api/contact/      → Resend         │
       │ preview URL        │   POST /api/subscribe/    → MailerLite     │
       │                    │   POST /api/events/signup/→ MailerLite grp │
       │                    │   POST /api/csp-report/   → Sentry         │
┌──────┴───────┐  PR merge  │   POST /monitoring/       → Sentry tunnel  │
│ Author /     │───────────>│  Build: astro build from git (content/)    │
│ reviewer     │  (GitHub)  └────────────────────────────────────────────┘
└──────────────┘
                     No database. Content is MDX and YAML in the repository.
```

**Actors**

- **Public visitor** — reads marketing pages, the blog, recipes and events; submits the contact, subscribe or event-signup forms.
- **Author** — a person or a content agent who writes MDX under `content/` in a branch and opens a pull request.
- **Reviewer** — a human who approves and merges the pull request. Merging is publishing.
- **Operator** — manages the Vercel project, environment variables and third-party API keys.

### 1.2 System boundary

This system owns the public marketing site (home, about, regenerate, contact, subscribe, get-involved), the blog and recipe surfaces, the events listing, the legal pages, the five on-demand HTTP endpoints, security headers and CSP, SEO metadata and JSON-LD, and the static assets (photography, motifs, favicons, manifest). It also owns the content model in `content/` and the schemas that validate it.

It does not own newsletter CRM logic beyond the MailerLite API, payments, booking or inventory, social media publishing, agronomic or property operations, or multi-property tenancy. There is no admin UI, no database and no authentication of any kind.

**Upstream and downstream**

| System                                | Relationship                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| GitHub (`carinyadigital/carinyaparc`) | System of record for code and content; branch protection is the publish gate |
| Vercel                                | Hosting, CDN, on-demand functions, image optimisation, preview per PR        |
| MailerLite                            | Downstream — newsletter subscribers and one group per event for signups      |
| Resend                                | Downstream — contact-form notification email                                 |
| Sentry                                | Downstream — client and server errors, CSP violation reports                 |
| Google Tag Manager / Vercel Analytics | Downstream — usage analytics and Speed Insights, loaded only after consent   |

---

## 2. Quality goals and constraints

Ordered by priority for architectural trade-offs.

| Priority | Quality goal                         | Implication                                                                                                                     |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Trust and security**               | Security headers and CSP on every response; Zod-validated input; no secrets in the client bundle; no admin surface to protect   |
| 2        | **Hermetic builds**                  | `astro build` needs only the repository; CI builds every pull request without secrets; content validation fails the build early |
| 3        | **Performance on regional mobile**   | Static HTML from the CDN; zero client JavaScript by default, React islands only for forms and consent; optimised images         |
| 4        | **Editorial reliability**            | One content pipeline (MDX in git); drafts excluded from production; every change reviewed and previewed before it is live       |
| 5        | **Maintainability for a small team** | Thin pages; content queries and integrations in `src/lib/`; colocated Vitest for logic; one place to change a schema            |

**Constraints**

- TypeScript strict mode; no `any` in new code ([`PRINCIPLES.md`](PRINCIPLES.md)).
- Australian English for user-visible copy ([`product.md`](product/product.md)).
- One property and, in practice, one editor. Roles, approvals beyond PR review, and multi-tenant patterns are out of scope.
- Public pages are prerendered. Anything that needs a request (forms, reports, the Sentry tunnel) is an explicit on-demand endpoint (`src/pages/api/` or `src/pages/monitoring.ts`).
- Monorepo shape: `apps/web` plus `packages/carinya-theme`, `packages/eslint-config`, `packages/typescript-config`, with `content/`, `brand/` and `skills/` at the root. It is not flattened to a single app.

---

## 3. Solution strategy

### 3.1 Architectural style

**Static site with islands, git as the CMS.** Astro 7 renders every public route to HTML at build time from `.astro` components and MDX content collections. React 19 islands hydrate only the contact, subscribe, event-signup and consent components. Five endpoints run as Vercel functions on demand. Content lives in `content/` at the repository root and is validated by Zod schemas in `apps/web/src/content.config.ts`; publishing is merging to `main`.

The trade-off accepted is the loss of a browser editing UI. Vercel preview deployments and PR review replace draft preview and publish approval; see [ADR-0002](decisions/ADR-0002-git-is-the-publish-gate.md).

### 3.2 Key decisions and trade-offs

| Choice                                                 | Satisfies                                  | Trade-off accepted                                                                          |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Astro + MDX content collections                        | Hermetic builds, security, ownable content | No browser editor; content changes need a PR and a deploy                                   |
| `content/` at the repository root                      | Authors and agents never touch `apps/`     | Collections reach out of the app (`CONTENT_ROOT = '../../content'`); path-scoped CODEOWNERS |
| `output: 'static'`, endpoints opt out with `prerender` | Fast TTFB, CDN-served HTML                 | Anything dynamic must be an explicit endpoint or an island                                  |
| React islands for forms and consent only               | Lean client JS                             | Two component flavours (`.astro` and `.tsx`) in one tree                                    |
| Event signups as MailerLite groups                     | No database                                | No capacity counting; `isFull` is set by hand in frontmatter                                |
| Security headers generated into `vercel.json`          | One source of truth, unit-tested policy    | CSP is host-allowlist + `'unsafe-inline'`; nonces are impossible on prerendered HTML        |
| `@carinya/theme` workspace package                     | Tokens shared with future surfaces         | A second package to version alongside the app                                               |
| Self-hosted fonts via fontsource                       | No third-party font hosts in CSP           | Fonts ship from our origin and count against page weight                                    |

### 3.3 Principles applied

From [`PRINCIPLES.md`](PRINCIPLES.md): pages load data and sections render; content queries in `src/lib/content/` so draft filtering and sorting live in one place; metadata and JSON-LD as small composable helpers; validation at the boundary; colocated tests for logic that is not trivially a template.

---

## 4. Building block view

### 4.1 Containers

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Repository                                                           │
│                                                                      │
│  content/                       apps/web (Astro 7)                   │
│  ├─ posts/*.mdx      ───────┐   ├─ astro.config.mjs                  │
│  ├─ recipes/*.mdx           │   ├─ vercel.json (generated)           │
│  ├─ events/*.mdx            ├──>├─ src/content.config.ts             │
│  ├─ legal/*.mdx             │   ├─ src/pages/  (routes + api/)       │
│  ├─ authors/*.yaml          │   ├─ src/layouts/ (Base, Site)         │
│  ├─ categories/*.yaml       │   ├─ src/components/                   │
│  ├─ tags.json               │   ├─ src/lib/                          │
│  └─ images/          ───────┘   ├─ src/assets/images/ · public/      │
│                                 ├─ integrations/ · scripts/          │
│  packages/carinya-theme ───────>└─ tests/ (parity, security)         │
│  packages/eslint-config, typescript-config                           │
│  brand/ · skills/carinya-parc                                        │
└──────────────────────────────────────────────────────────────────────┘
                 │ astro build (Vercel adapter)
                 v
   dist/ static HTML + assets  ·  .vercel/output (functions, routes, headers)
```

### 4.2 Components

| Block                     | Responsibility                                                                                                              | Location                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Collections**           | Six collections and their Zod schemas; `reference()` for author/category, `image()` for heroes                              | `apps/web/src/content.config.ts`, `src/lib/content/schema.ts`         |
| **Content queries**       | Published-only filtering, sorting, card shapes, archives with at least one post, upcoming events                            | `src/lib/content/{posts,recipes,events,dates}.ts`                     |
| **Pages**                 | One `.astro` file per route; `getStaticPaths` from the queries                                                              | `src/pages/**`                                                        |
| **Layouts**               | `Base.astro` (head, metadata, Organization JSON-LD, consent island), `Site.astro` (header, `#stay` newsletter band, footer) | `src/layouts/`                                                        |
| **UI primitives**         | Button, Eyebrow, Breadcrumb, JsonLd, MotifTile, form fields                                                                 | `src/components/ui/`                                                  |
| **Sections and chrome**   | Hero, PageHeader, ImpactStats; header, footer; blog, recipes, marketing sections                                            | `src/components/{sections,header,footer,blog,recipes,marketing}/`     |
| **Islands**               | ContactForm, SubscribeForm/Modal/Inline/EndOfPost, EventSignup, ConsentGate                                                 | `src/components/islands/`, `src/components/consent/`                  |
| **Endpoints**             | `prerender = false` routes delegating to handlers                                                                           | `src/pages/api/`, `src/pages/monitoring.ts`, `src/lib/api/`           |
| **Validation**            | Zod schemas, sanitisation, spam-email list                                                                                  | `src/lib/validation/`                                                 |
| **Rate limiting**         | In-memory per-key limiter shared by the handlers                                                                            | `src/lib/rate-limit.ts`                                               |
| **Integrations**          | MailerLite client (subscribers, event groups), Resend notification email                                                    | `src/lib/mailerlite/`, `src/lib/email/`                               |
| **Security policy**       | Header presets, CSP directives, `vercel.json` generator, Gone routes                                                        | `src/lib/security/`, `scripts/generate-vercel-json.ts`                |
| **Build integrations**    | Merge headers and 410 routes into the Vercel output; make redirects accept a trailing slash                                 | `astro.config.mjs`, `integrations/vercel-redirect-trailing-slash.mjs` |
| **Metadata and schema**   | Title, description, canonical, OG/Twitter; Article, Recipe, Breadcrumb, LocalBusiness, Organization                         | `src/lib/metadata/`, `src/lib/schema/`, `src/lib/constants.ts`        |
| **Analytics and consent** | Cookie read/write, consent types, event tracking helpers, scroll depth                                                      | `src/lib/consent/`, `src/lib/analytics/`, `src/lib/client/`           |
| **Observability**         | Sentry capture and metric counters used by the handlers                                                                     | `src/lib/observability/metrics.ts`                                    |
| **Feed**                  | RSS builder for `/feed.xml`                                                                                                 | `src/lib/blog/build-feed.ts`, `src/pages/feed.xml.ts`                 |
| **Theme**                 | Design tokens consumed by `src/styles/globals.css`                                                                          | `packages/carinya-theme`                                              |

### 4.3 Repository layout

Architectural rule: **pages load data through `src/lib/content/`; components render; `src/lib/` holds integrations and side effects; `content/` holds only content.**

```text
.
├── apps/
│   └── web/                  # Astro 7 + MDX public site — the product
├── content/                  # The CMS: MDX, YAML, images, tags.json
├── packages/
│   ├── carinya-theme/        # @carinya/theme — CSS-first Tailwind 4 tokens and theme
│   ├── eslint-config/        # @repo/eslint-config (base, react-internal, next)
│   └── typescript-config/    # @repo/typescript-config (base, react-library, nextjs)
├── brand/                    # voice.md, positioning.md (not a workspace package)
├── skills/
│   └── carinya-parc/         # Product-local agent skill (not a workspace package)
├── docs/
│   ├── ARCHITECTURE.md       # this file
│   ├── PRINCIPLES.md
│   ├── product/
│   └── decisions/
├── .github/workflows/ci.yml  # Lint, typecheck, format, test, build web, dist tests
├── pnpm-workspace.yaml       # apps/web and packages/*
├── turbo.json                # Task graph and declared env vars
├── prettier.config.mjs       # Shared Prettier config (+ prettier-plugin-astro)
└── package.json              # Root scripts: web:dev, web:build, lint, typecheck, format, test
```

`pnpm-workspace.yaml` includes `apps/web` and `packages/*`. `brand/`, `skills/`, `docs/` and `content/` are source trees, not installable packages. `content/` sits outside `apps/` deliberately: a writer or content agent never needs to open application code, and the app reaches it through a relative `CONTENT_ROOT` in `src/content.config.ts`.

### 4.4 `apps/web` layout

```text
apps/web/
├── astro.config.mjs          # site URL, static output, trailingSlash 'always', redirects, integrations
├── vercel.json               # generated by scripts/generate-vercel-json.ts — headers, CSP, favicon redirect
├── integrations/
│   └── vercel-redirect-trailing-slash.mjs
├── scripts/
│   └── generate-vercel-json.ts
├── public/                   # copied verbatim to the site root
│   ├── favicon/              # favicon.ico and PNG sizes
│   ├── images/               # fallback and placeholder images used by plain <img>
│   ├── motifs/               # brand line icons
│   ├── robots.txt
│   └── site.webmanifest
├── src/
│   ├── content.config.ts     # the six collections and their Zod schemas
│   ├── config/navigation.ts  # header and footer navigation
│   ├── pages/                # routes (§4.5)
│   ├── layouts/              # Base.astro, Site.astro
│   ├── components/           # by concern (§4.4.1)
│   ├── lib/                  # by concern (§4.4.2)
│   ├── styles/               # globals.css, components.css, pages/{blog,legal,recipes}.css
│   └── assets/images/        # photographs imported by pages and optimised at build
├── tests/
│   ├── baseline/             # production URL and metadata snapshot
│   ├── parity.test.ts        # dist/ against tests/baseline/
│   └── security.test.ts      # dist/ links, images, CSP hosts, headers in .vercel/output/config.json
├── tsconfig.json             # extends astro/tsconfigs/strict; @/* → ./src/*
├── vitest.config.ts          # Astro getViteConfig; src/**/*.test.{ts,tsx} and tests/**/*.test.ts
├── vitest.setup.ts
├── eslint.config.mjs
└── .env.example
```

#### 4.4.1 Components

Everything under `src/components/` is an `.astro` component unless it is an island.

| Folder       | Holds                                                                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/`        | Primitives: `Button`, `Breadcrumb`, `Eyebrow`, `JsonLd`, `MotifTile` (`.astro`) and the form primitives islands share (`Input`, `Select`, `Textarea`, `FormField`, `Alert`, `Button.tsx`)                                                                        |
| `sections/`  | Shared page chrome: `Hero`, `HeroText`, `PageHeader`, `PageIntro`, `ImpactStats`                                                                                                                                                                                 |
| `header/`    | `Header.astro` (mounts `SubscribeModalHost` with `client:idle`)                                                                                                                                                                                                  |
| `footer/`    | `Footer`, `FooterNav`, `SocialLinks`                                                                                                                                                                                                                             |
| `blog/`      | Journal UI: `PostCard`, `FeaturedPosts`, `LatestPosts`, `PaginatedPosts`, `PaginationNav`, `BlogPostArticle`, `AuthorBlock`, `RelatedPosts`, `BlogTopicNav`, `JournalIntro`, `JournalPostGrid`, `JournalSubscribeBand`, `EndOfPostSubscribe`, `ShareBar`         |
| `recipes/`   | `RecipeCard`, `RecipeGrid`, `RecipeMeta`, `RecipeIngredients`, `RecipeInstructions`, `RecipeTags`                                                                                                                                                                |
| `marketing/` | Sections for the marketing pages: `SectionWithImage`, `WaysToHelpSection`, `PartnersSection`, `GetInvolvedCTA`, `SubscribeSection`, `ContactFormSection`, `InlineSubscribeForm`, `NewsletterBand`, `EventCard`, `EventSignup`, `EventsEmptyState`, `Icon`, `Tag` |
| `islands/`   | The only React components that ship to the browser: `ConsentGate`, `ContactForm`, `SubscribeForm`, `InlineSubscribe`, `EndOfPostSubscribe`, `SubscribeModal`, `SubscribeModalHost`, `EventSignup`                                                                |
| `consent/`   | `ConsentBanner.tsx`, rendered by `ConsentGate`                                                                                                                                                                                                                   |
| `subscribe/` | `SubscribePrivacyNote.tsx`, shared by the subscribe islands                                                                                                                                                                                                      |
| `share/`     | `ShareBar.astro` (generic share strip)                                                                                                                                                                                                                           |
| `analytics/` | `ArticleScrollDepth.astro` — binds `lib/client/scroll-depth` on pages that render an `<article>`                                                                                                                                                                 |

An island is always wrapped by a small `.astro` component that owns the `client:*` directive (for example `marketing/ContactFormSection.astro` mounts `islands/ContactForm.tsx` with `client:visible`). Pages import the wrapper, never the island; only `Base.astro` (`ConsentGate`) and `Header.astro` (`SubscribeModalHost`) mount one directly.

#### 4.4.2 Library

| Folder or file   | Holds                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/`       | Read-side helpers over the collections: `posts.ts` (`getPublishedPosts`, `getFeaturedPosts`, `getRelatedPosts`, `getCategoriesWithPosts`, `getTagsWithPosts`, `toPostSummary`, `tagName`, `isPublished`), `recipes.ts`, `events.ts` (`getUpcomingEvents`), `dates.ts`, `schema.ts` (regexes shared with `content.config.ts`) |
| `urls.ts`        | `postUrl`, `categoryUrl`, `tagUrl`, `recipeUrl`, `eventsListingUrl`, the `API_*_PATH` constants, and `SENTRY_TUNNEL_PATH` — all with trailing slashes                                                                                                                                                                        |
| `constants.ts`   | `BASE_URL` (from `PUBLIC_SITE_URL`), site title and description, default OG image, favicon paths, `LOCAL_BUSINESS`, social profiles, breadcrumb names                                                                                                                                                                        |
| `metadata/`      | `generatePageMetadata` composed from `title`, `description`, `canonical`, `openGraph`, `twitter`, `robots`, `icons`, `viewport`; `types.ts`                                                                                                                                                                                  |
| `schema/`        | JSON-LD generators: `organization` (and `organization-json` for the `<head>`), `breadcrumb`, `localBusiness`, `article`, `recipe`; `index.ts` re-exports                                                                                                                                                                     |
| `validation/`    | Zod schemas (`contact-schema`, `subscribe-schema`, `event-signup-schema`), `sanitize.ts` (plain-Node strip and escape), `spam-email.ts`                                                                                                                                                                                      |
| `api/`           | Endpoint handlers: `contact.ts`, `subscribe.ts`, `events-signup.ts`, `csp-report.ts`, `sentry-tunnel.ts`, plus `json.ts` (`jsonResponse`, `readJsonBody`, `methodNotAllowed`)                                                                                                                                                |
| `rate-limit.ts`  | `createRateLimiter` — in-memory, per instance                                                                                                                                                                                                                                                                                |
| `mailerlite/`    | MailerLite client: subscriber upsert, per-event group resolution                                                                                                                                                                                                                                                             |
| `email/`         | `send-contact-notification.ts` (Resend) and `templates/`                                                                                                                                                                                                                                                                     |
| `events/`        | `catalog.ts` — `getPublicEventBySlug` for the signup endpoint (drafts return `null`)                                                                                                                                                                                                                                         |
| `security/`      | `csp.ts`, `headers.ts`, `gone.ts`, `constants.ts`, `vercel-config.ts` (`generateVercelJson`, `mergeSecurityIntoVercelOutput`, `GONE_PATH_PATTERNS`)                                                                                                                                                                          |
| `consent/`       | `cookie.ts` (read and write `cp_consent` in the browser), `types.ts`                                                                                                                                                                                                                                                         |
| `analytics/`     | Consent-gated `trackEvent`, typed funnel events, `consent.ts`                                                                                                                                                                                                                                                                |
| `client/`        | Browser-side helpers used by inline scripts: `scroll-depth`, `share`, `site-header`                                                                                                                                                                                                                                          |
| `subscribe/`     | `client.ts` — the fetch wrapper the subscribe islands call                                                                                                                                                                                                                                                                   |
| `blog/`          | `build-feed.ts` — RSS 2.0 builder for `/feed.xml`                                                                                                                                                                                                                                                                            |
| `recipes/`       | `format-duration.ts` — ISO 8601 durations to display text                                                                                                                                                                                                                                                                    |
| `observability/` | `metrics.ts` — `countMetric`, `captureException` (Sentry when configured)                                                                                                                                                                                                                                                    |
| `cn.ts`          | `clsx` + `tailwind-merge`                                                                                                                                                                                                                                                                                                    |

Folders with several files carry their own `types.ts` and tests; `metadata/`, `schema/`, `security/` and `analytics/` have an `index.ts` barrel.

#### 4.4.3 Styles, tests, integrations

`src/styles/globals.css` is the single entry: it imports the two font packages, `@carinya/theme`, the typography plugin and `components.css`. Per-page CSS (`pages/blog.css`, `pages/legal.css`, `pages/recipes.css`) is imported at the top of the page that needs it, so it is only bundled where it is used. Tokens are never redefined in the app; they come from `packages/carinya-theme`.

Unit tests are colocated as `*.test.ts` / `*.test.tsx` under `src/` and run with `pnpm --filter web test`. `tests/parity.test.ts` and `tests/security.test.ts` read the built output and skip themselves when `dist/` is absent; CI runs `pnpm turbo run build --filter=web` and then `pnpm --filter web test:dist`. `test:parity` compares the build against the production baseline in `apps/web/tests/baseline/`.

- `vercel-security-config` (defined inline in `astro.config.mjs`) merges the generated headers and the 410 routes into `.vercel/output/config.json` after every build, so they apply on Vercel without a separate `vercel.json` deploy step.
- `integrations/vercel-redirect-trailing-slash.mjs` rewrites redirect sources from `^/path$` to `^/path/?$`. Without it, the adapter's redirect for `/blog/old/` only matches `/blog/old`, and the trailing-slash form falls through to the 404 page.
- `scripts/generate-vercel-json.ts` writes `vercel.json` from `src/lib/security/vercel-config.ts`. Run it (`pnpm --filter web generate:vercel-json`) after changing anything in `lib/security` and commit the result.
- `@astrojs/sitemap` writes `sitemap-index.xml`; `/sitemap.xml` redirects to it so `robots.txt` and Search Console keep working. `@sentry/astro` is added only when a DSN is present.

### 4.5 Routes

Every public URL ends in `/` (`trailingSlash: 'always'`, `build.format: 'directory'`). Static routes are built to `dist/`; the on-demand endpoints run as Vercel functions.

| URL                      | File                               | Source                                                   |
| ------------------------ | ---------------------------------- | -------------------------------------------------------- |
| `/`                      | `pages/index.astro`                | Hard-coded sections + latest and featured posts          |
| `/about/`                | `pages/about/index.astro`          | Hard-coded                                               |
| `/about/the-property/`   | `pages/about/the-property.astro`   | Hard-coded                                               |
| `/about/jonathan/`       | `pages/about/jonathan.astro`       | Hard-coded                                               |
| `/regenerate/`           | `pages/regenerate.astro`           | Hard-coded                                               |
| `/contact/`              | `pages/contact.astro`              | `ContactForm` island                                     |
| `/subscribe/`            | `pages/subscribe.astro`            | `SubscribeForm` island                                   |
| `/get-involved/events/`  | `pages/get-involved/events.astro`  | `events` collection, upcoming only; `EventSignup` island |
| `/blog/`                 | `pages/blog/index.astro`           | `posts`, first 6                                         |
| `/blog/page/[page]/`     | `pages/blog/page/[page].astro`     | `paginate()`, 6 per page, page 1 omitted                 |
| `/blog/[slug]/`          | `pages/blog/[slug].astro`          | One `posts` entry, related posts, Article JSON-LD        |
| `/blog/category/[slug]/` | `pages/blog/category/[slug].astro` | Categories with at least one published post              |
| `/blog/tag/[tag]/`       | `pages/blog/tag/[tag].astro`       | Tags used by at least one published post                 |
| `/recipes/`              | `pages/recipes/index.astro`        | `recipes` collection                                     |
| `/recipes/[slug]/`       | `pages/recipes/[slug].astro`       | One `recipes` entry, Recipe JSON-LD                      |
| `/legal/[slug]/`         | `pages/legal/[slug].astro`         | `legal` collection                                       |
| `/feed.xml`              | `pages/feed.xml.ts`                | RSS 2.0, newest 20 posts                                 |
| `/404`                   | `pages/404.astro`                  | Served by Vercel for unknown paths                       |
| `/sitemap-index.xml`     | `@astrojs/sitemap`                 | `/sitemap.xml` 301s here                                 |

On-demand endpoints (`export const prerender = false`; `POST` only, `GET` returns 405). The Sentry tunnel lives at `/monitoring/` rather than under `/api/`, matching the previous tunnel path and staying outside ad-blocker lists that key on `sentry`:

| URL                   | File                         | Handler                    |
| --------------------- | ---------------------------- | -------------------------- |
| `/api/contact/`       | `pages/api/contact.ts`       | `lib/api/contact.ts`       |
| `/api/subscribe/`     | `pages/api/subscribe.ts`     | `lib/api/subscribe.ts`     |
| `/api/events/signup/` | `pages/api/events/signup.ts` | `lib/api/events-signup.ts` |
| `/api/csp-report/`    | `pages/api/csp-report.ts`    | `lib/api/csp-report.ts`    |
| `/monitoring/`        | `pages/monitoring.ts`        | `lib/api/sentry-tunnel.ts` |

Retired routes: `pages/admin.ts`, `pages/admin/[...path].ts`, `pages/api/graphql.ts`, `pages/api/graphql/[...path].ts`, `pages/api/graphql-playground.ts` and `pages/api/graphql-playground/[...path].ts` all return 410 Gone through `lib/security/gone.ts`, and the same patterns are added as 410 routes in the Vercel config so the function is rarely invoked.

Redirects live in `astro.config.mjs`: `/favicon.ico` → `/favicon/favicon.ico`, `/sitemap.xml` → `/sitemap-index.xml`, and ten retired post slugs that 301 to the nearest current piece.

### 4.6 Layouts, trailing slashes, and how to add things

**Layouts.** `layouts/Base.astro` owns the HTML document: `<head>` built from a `PageMetadata` object (title, description, canonical, robots, Open Graph, Twitter, icons, RSS link), the Organization JSON-LD, `globals.css`, and the `ConsentGate` island at the end of `<body>`. `layouts/Site.astro` wraps `Base` with the header, `<main>`, the `#stay` newsletter band, footer and the scroll-depth reporter. Pages pass `title`, `description`, `path` and optionally `image`, `type` (`website` | `article`), `overlay` (transparent header over a hero), `showFooter` and `showNewsletter`. `showNewsletter` defaults to on; blog routes pass `false` so journal subscribe modules do not stack a second band, and the 404 page hides it with the footer. `Site` calls `generatePageMetadata` from those props; a page that needs more control (extra keywords, `noIndex`) builds the object itself and passes `metadata`. Every page uses `Site`. Nothing uses `Base` directly.

**Trailing slashes.** `trailingSlash: 'always'` means Astro dev and Vercel both redirect `/blog` to `/blog/`. Consequences:

- Internal links come from `lib/urls.ts` or are written with a trailing slash.
- Endpoint paths (`API_*_PATH`) end in `/` so a `POST` is not 308-redirected and turned into a `GET`.
- Redirect sources in `astro.config.mjs` are written with the trailing slash; the trailing-slash integration makes the compiled route accept both forms.

**Metadata and JSON-LD.** Metadata is data, not markup. `lib/metadata/index.ts` composes the `PageMetadata` object from small functions (`generateTitle`, `generateCanonicalUrl`, `generateOpenGraph`, …) and `Base.astro` is the only place that turns it into `<meta>` tags. JSON-LD is layered: `Base.astro` always emits Organization; a page adds `<JsonLd />` for BreadcrumbList (derived from the path unless `breadcrumbs` is passed) and, where relevant, `article`, `recipe` or `includeLocalBusiness`. The generators in `lib/schema/` are pure functions with tests.

**A page.** Create `src/pages/<kebab-name>.astro` (or `<name>/index.astro` for a section root). Wrap the content in `<Site title description path>`, add `<JsonLd />`, and compose existing components from `sections/` and `marketing/`. If the page should appear in the header or footer, add it to `src/config/navigation.ts`. Static pages need no `getStaticPaths`.

**A content-driven section.** Add a collection in `content.config.ts` pointing at `${CONTENT_ROOT}/<name>`, a read helper in `lib/content/<name>.ts` that applies `isPublished` and sorting, a URL helper in `lib/urls.ts`, then a `[slug].astro` whose `getStaticPaths` maps the helper's result to `{ params: { slug: entry.id }, props: { entry } }`. Create the `content/<name>/` folder and a first entry so the build has something to validate. Document the frontmatter in §6.4.

**An island.** Write the React component under `src/components/islands/`, keep it free of server imports, and mount it from a small `.astro` wrapper with `client:visible` (or `client:idle` for chrome that is not in the first viewport). Put the fetch in `lib/<feature>/client.ts` and post to a path from `lib/urls.ts`. Add a colocated test if it holds state.

**An endpoint.** Add `src/pages/api/<name>.ts` with `export const prerender = false`, a `POST` that delegates to `lib/api/<name>.ts`, and a `GET` that returns `methodNotAllowed()`. In the handler: `readJsonBody`, a Zod schema from `lib/validation/`, honeypot and timing checks, `createRateLimiter`, sanitisation, then the side effect. Add the path constant to `lib/urls.ts`, any new env var to `.env.example`, `turbo.json` and `eslint.config.mjs`, and a handler test alongside.

**A redirect.** Add it to `redirects` in `astro.config.mjs` with the trailing slash on the source. Do not edit `vercel.json` by hand for redirects; it is generated.

**A security header or CSP host.** Change `lib/security/constants.ts`, run `pnpm --filter web generate:vercel-json`, and update `tests/security.test.ts` if the expected host list changes.

Then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm web:build` and `pnpm --filter web test:dist` from the root, and update this document.

---

## 5. Runtime view

### 5.1 Page build from content

```text
astro build
  → content.config.ts loads the six collections from ../../content via glob()
  → Zod schemas validate frontmatter; reference() resolves author and category;
    image() registers hero files for optimisation (a bad entry fails the build)
  → src/pages/blog/[slug].astro getStaticPaths()
      → getPublishedPosts()  (draft: true excluded unless import.meta.env.DEV)
  → render: Site layout → BlogPostArticle → MDX body, Article + Breadcrumb JSON-LD
  → sitemap-index.xml, feed.xml, 404.html
  → vercel adapter writes .vercel/output; integrations merge security headers,
    410 routes and trailing-slash-tolerant redirects into config.json
```

Archive pages (`/blog/category/[slug]/`, `/blog/tag/[tag]/`, `/blog/page/[page]/`) are generated only for categories, tags and pages that have at least one published post.

### 5.2 Publish via pull request

```text
Author (human or agent)
  → branch; add or edit content/posts/{slug}.mdx (draft: true while unfinished)
  → open PR → CI: lint, typecheck, format, tests, astro build, dist tests
  → Vercel preview deployment = draft preview URL
Reviewer
  → reads the preview, reviews the diff, approves (branch protection requires it)
  → merge to main → Vercel production build → CDN serves the new HTML
```

There is no revalidation step: every merge is a full build. A post that must sit on `main` unpublished keeps `draft: true`.

### 5.3 Contact form submission

```text
Browser: ContactForm island (react-hook-form + Zod) → POST /api/contact/ (JSON)
Function: handleContactPost
  → CONTACT_FORM_ENABLE check (503 if disabled)
  → Zod contactFormSchema (400 with field details)
  → honeypot `website` filled → 200 with success message, counted as spam
  → submissionTime < 2 s → same
  → in-memory rate limit by email (3 per 24 h by default) → 429
  → sanitise → Resend notification to CONTACT_EMAIL_RECIPIENT → 200
```

### 5.4 Event signup

```text
Browser: EventSignup island → POST /api/events/signup/ { eventSlug, name, email, ... }
Function: handleEventSignupPost
  → Zod → honeypot → timing → spam-email list → in-memory rate limit (5 per 24 h)
  → getPublicEventBySlug (drafts count as missing → 404)
  → event in the past → 400; event has signupTarget → 400 (external signup)
  → event.isFull → 409 with a waitlist hint
  → resolveEventGroupId(slug): find or create the MailerLite group named for the event
  → upsert subscriber with source `event:{slug}` and that group → 200
```

Subscribe (`/api/subscribe/`) is the same shape without the event lookup: one submission per email per day, then a MailerLite upsert with interests and source.

### 5.5 Consent flow

```text
Page loads with no analytics scripts in the HTML
  → ConsentGate island (client:idle) reads cp_consent from document.cookie
  → no cookie → ConsentBanner
  → accepted → write cp_consent (Path=/, Max-Age 1 year, SameSite=Lax, Secure on https)
             → inject GTM (PUBLIC_GTM_ID) and Vercel Analytics + Speed Insights
  → rejected → nothing loads
```

The cookie is readable by client script by design; consent state is not sensitive and there is no server that needs to read it.

### 5.6 CSP violation report

```text
Browser → POST /api/csp-report/ (report-uri; trailing slash so the POST is not redirected)
Function: handleCspReportPost
  → body ≤ 32 KB, JSON, legacy `csp-report` or Reporting API array
  → keep reports whose document-uri is our origin or a *.vercel.app preview
  → console.warn each, forward up to 10 per minute per instance to Sentry as warnings
  → 204
```

---

## 6. Data model

### 6.1 Collections

All six are declared in `apps/web/src/content.config.ts` and loaded from `content/` with Astro's `glob()` loader. An entry's id is its filename without extension, so **slug uniqueness is filesystem uniqueness** and the public URL is derived from the filename.

| Collection     | Files                       | Key fields                                                                                                                                                                                |
| -------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **posts**      | `content/posts/*.mdx`       | title, date, author → authors, category → categories (optional), tags[], featured, excerpt, description, image, imageAlt, draft; MDX body                                                 |
| **recipes**    | `content/recipes/*.mdx`     | title, date, author, difficulty, servings, prepTime/cookTime/totalTime (ISO 8601), excerpt, description, image, imageAlt, tags[], ingredients[], instructions[], draft; optional MDX body |
| **events**     | `content/events/*.mdx`      | title, startsAt, location, isFull, signupTarget (optional http(s) URL), draft                                                                                                             |
| **legal**      | `content/legal/*.mdx`       | title, description; MDX body                                                                                                                                                              |
| **authors**    | `content/authors/*.yaml`    | name, imageUrl, bio                                                                                                                                                                       |
| **categories** | `content/categories/*.yaml` | name, description                                                                                                                                                                         |

`content/tags.json` is a slug → display-name map, not a collection. A tag is any string in a post or recipe's `tags`; unknown slugs display as themselves.

### 6.2 Relationships

```text
Post ──author──> Author            Recipe ──author──> Author
Post ──category──> Category (opt)  Recipe ──tags──> tag slugs (tags.json for names)
Post ──tags──> tag slugs
Event (standalone; signups live in MailerLite as a group named for the event slug)
Legal (standalone)
```

### 6.3 Invariants

- **References resolve at build time.** `reference('authors')` and `reference('categories')` fail the build if the target file does not exist.
- **Drafts.** `draft: true` (posts, recipes, events) excludes an entry from production builds, archives, the feed and the sitemap; `astro dev` shows drafts so they can be previewed. The event-signup endpoint treats a draft event as missing.
- **Dates.** `date` on posts and recipes is required and drives ordering; `startsAt` on events decides whether an event is upcoming.
- **Images.** `image` is a relative path to `content/images/*` validated by Astro's `image()` helper, so the file must exist and is optimised at build. `imageAlt` is optional in the schema and falls back to the title.
- **Recipes** must have at least one ingredient and one instruction; durations must match the ISO 8601 pattern in `src/lib/content/schema.ts`.
- **Empty archives are not generated.** A category or tag with no published post has no page and no sitemap entry.

### 6.4 Frontmatter contract

```text
content/
├── posts/*.mdx           # journal
├── recipes/*.mdx
├── events/*.mdx          # empty is fine — the listing renders an empty state
├── legal/*.mdx           # privacy-policy, terms-of-service
├── authors/*.yaml        # referenced by id from posts and recipes
├── categories/*.yaml     # referenced by id from posts
├── images/*.jpg          # hero images referenced from frontmatter
└── tags.json             # { "slug": "Display name" }
```

Rules common to every collection:

- The entry id, and therefore the URL slug, is the filename without its extension. Use lowercase kebab-case (`SLUG_PATTERN` in `lib/content/schema.ts`).
- Frontmatter is validated by the Zod schemas in `apps/web/src/content.config.ts` on every build and by `astro check`. An invalid file fails the build; a missing optional field takes its default.
- `image` is an image import resolved relative to the entry file (`"../images/hero-home.jpg"`). Astro validates that the file exists and optimises it at build. Paths must resolve to a file on disk relative to the entry; `public/` URLs are not accepted here.
- `draft: true` (where the collection has it) excludes the entry from production builds, the sitemap and the RSS feed. In `astro dev` drafts render so they can be previewed. Legal, authors and categories have no draft flag.
- Dates are ISO strings (`"2026-04-18"`) and are coerced to `Date`.

#### 6.4.1 `posts`

| Field         | Type                      | Required | Notes                                             |
| ------------- | ------------------------- | -------- | ------------------------------------------------- |
| `title`       | string, ≤ 200             | yes      |                                                   |
| `date`        | date                      | yes      | Sort key, newest first                            |
| `author`      | reference to `authors`    | yes      | `"jonno"`                                         |
| `category`    | reference to `categories` | no       | Drives `/blog/category/[slug]/` and related posts |
| `tags`        | string[]                  | no       | Default `[]`; drives `/blog/tag/[tag]/`           |
| `featured`    | boolean                   | no       | Default `false`; surfaces on the home and journal |
| `excerpt`     | string, ≤ 500             | yes      | Card and feed copy                                |
| `description` | string, ≤ 300             | no       | Meta description; falls back to `excerpt`         |
| `image`       | image                     | no       | Hero and `og:image`; default site image otherwise |
| `imageAlt`    | string                    | no       | Falls back to `title` — set it anyway             |
| `draft`       | boolean                   | no       | Default `false`                                   |

```mdx
---
title: 'Our first planting day: 1,150 trees, 26 people, one brown snake'
date: '2026-04-18'
author: 'jonno'
category: 'regeneration'
tags: ['restoration', 'regeneration', 'agroforestry']
featured: true
excerpt: 'We opened the gate for the first time and 26 people turned up with gloves.'
description: "Carinya Parc's first community planting day along the Branch River."
image: '../images/river-valley-aerial.jpg'
imageAlt: 'The Branch River bend at Carinya Parc'
draft: false
---
```

#### 6.4.2 `recipes`

| Field          | Type                         | Required | Notes                        |
| -------------- | ---------------------------- | -------- | ---------------------------- |
| `title`        | string, ≤ 200                | yes      |                              |
| `date`         | date                         | yes      |                              |
| `author`       | reference to `authors`       | yes      |                              |
| `difficulty`   | `easy` \| `medium` \| `hard` | no       |                              |
| `servings`     | integer ≥ 1                  | no       |                              |
| `prepTime`     | ISO 8601 duration (`PT10M`)  | no       | Hours, minutes, seconds only |
| `cookTime`     | ISO 8601 duration            | no       |                              |
| `totalTime`    | ISO 8601 duration            | no       | Used in Recipe JSON-LD       |
| `excerpt`      | string, ≤ 500                | yes      |                              |
| `description`  | string, ≤ 300                | no       | Falls back to `excerpt`      |
| `image`        | image                        | no       |                              |
| `imageAlt`     | string                       | no       |                              |
| `tags`         | string[]                     | no       | Default `[]`                 |
| `ingredients`  | `{ item: string }[]`, ≥ 1    | yes      |                              |
| `instructions` | `{ step: string }[]`, ≥ 1    | yes      | Rendered in order            |
| `draft`        | boolean                      | no       | Default `false`              |

The MDX body is optional prose above or below the structured ingredients and steps.

#### 6.4.3 `events`

| Field          | Type          | Required | Notes                                                                        |
| -------------- | ------------- | -------- | ---------------------------------------------------------------------------- |
| `title`        | string, ≤ 200 | yes      |                                                                              |
| `startsAt`     | date-time     | yes      | Listing shows events starting after build time; rebuild to drop a past event |
| `location`     | string, ≤ 200 | yes      |                                                                              |
| `isFull`       | boolean       | no       | Default `false`; set by hand — there is no capacity counter                  |
| `signupTarget` | http(s) URL   | no       | When set, the card links out instead of showing the on-site form             |
| `draft`        | boolean       | no       | Default `false`; the signup endpoint also refuses drafts                     |

On-site signups (`/api/events/signup/`) are added to a MailerLite group named for the event slug. Nothing is stored in this repository or on the server.

#### 6.4.4 `legal`

| Field         | Type   | Required |
| ------------- | ------ | -------- |
| `title`       | string | yes      |
| `description` | string | yes      |

The body is the policy text; the page renders it with the `legal-prose` styles.

#### 6.4.5 `authors` and `categories` (YAML)

| Collection   | Fields                               |
| ------------ | ------------------------------------ |
| `authors`    | `name` (required), `imageUrl`, `bio` |
| `categories` | `name` (required), `description`     |

The filename is the id other entries reference. Categories only get an archive page once a published post uses them.

#### 6.4.6 `tags.json`

A flat object mapping tag slug to display name. `tagName(slug)` in `lib/content/posts.ts` falls back to the slug itself, so an entry is only needed when the label differs from the slug (`"comfort-food": "Comfort Food"`).

### 6.5 Glossary

| Term                   | Definition                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| **Entry**              | One file in a collection; its id is the filename stem and the public slug                       |
| **Island**             | A React component hydrated in the browser (`client:visible` / `client:idle`)                    |
| **On-demand endpoint** | A `prerender = false` route deployed as a Vercel function (`src/pages/api/*` or `/monitoring/`) |
| **Featured post**      | `featured: true`; drives home-page highlights                                                   |
| **ISO duration**       | Recipe times such as `PT20M`, formatted for display by `format-duration`                        |
| **Preview**            | The Vercel deployment of a pull request; the draft preview for authors and reviewers            |

---

## 7. Cross-cutting concepts

### 7.1 Security

- **Headers.** `src/lib/security/` defines HSTS (two years, preload), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off) and the CSP. `pnpm --filter web generate:vercel-json` writes them to `vercel.json`; the `vercelSecurityConfig` integration also merges them into `.vercel/output/config.json` at build so they apply even where the platform ignores `vercel.json`.
- **CSP.** Host allowlist plus `'unsafe-inline'` for scripts and styles, because prerendered HTML cannot carry per-request nonces and Astro inlines small scripts. Fonts are self-hosted so no font hosts are allowlisted. `connect-src` includes `'self'`, which covers the browser Sentry tunnel at `/monitoring/`; `https://*.sentry.io` stays for server-side ingest. The header is `Content-Security-Policy` (`CSP_REPORT_ONLY` is `false` in `src/lib/security/constants.ts`). Violations still POST to `/api/csp-report/`.
- **Retired surfaces.** `/admin`, `/api/graphql` and `/api/graphql-playground` (and anything below them) return **410 Gone** from a CDN route; matching on-demand endpoints exist so local preview behaves the same.
- **Rate limiting.** Each form endpoint keeps an in-memory map keyed by email, per function instance. It stops a single browser repeating a form; it does not stop a distributed attempt and resets whenever an instance is recycled. Honeypot and timing checks run first. The Sentry tunnel uses a separate fixed one-minute window keyed by client IP, because envelopes have no email. Durable abuse control is a Vercel WAF rate-limit rule on `POST` to `/api/contact`, `/api/subscribe` and `/api/events`; include `/monitoring/` if tunnel abuse needs the same control.
- **Cookies.** `cp_consent` only, set by the browser, not httpOnly. No session cookie exists.
- **Validation.** Zod schemas in `src/lib/validation/`; `sanitize.ts` strips control characters and HTML-significant characters before anything reaches email or MailerLite. Validation errors return field details; upstream failures return a generic message and 503.
- **Secrets.** `MAILERLITE_API_KEY`, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN` are server-only. Only `PUBLIC_*` variables reach the browser.

### 7.2 Observability

- **Sentry** (`@sentry/astro`) on client and server when a DSN is set; source maps upload when `SENTRY_AUTH_TOKEN` is present. The browser SDK is initialised from `sentry.client.config.ts` on every page, independent of the analytics consent gate, and posts envelopes to `/monitoring/`. That route forwards only an envelope whose DSN matches the configured Sentry project. The server SDK is initialised from `sentry.server.config.ts` and posts straight to the DSN. Handlers call `captureException` and `countMetric` through `src/lib/observability/metrics.ts`.
- **Vercel Analytics and Speed Insights** load only after consent, from the `ConsentGate` island.
- **Logging.** Endpoints log rejection reasons and the email domain, never the address or message body.

### 7.3 Error handling

- **404** — `src/pages/404.astro`, served by Vercel for any unmatched path.
- **410** — retired admin and GraphQL paths (§7.1).
- **Endpoints** — structured JSON `{ error }` with 400/404/409/429/500/503 as appropriate; a thrown error inside a handler is captured to Sentry and returns a generic 500.
- **Build** — a schema error, a missing referenced file or a missing image fails `astro build`, which fails CI and the Vercel deployment; nothing partial ships.

### 7.4 Caching and content freshness

Every public page is static HTML on the Vercel CDN and changes only when a build runs. Freshness is therefore "last merge to `main`": there is no revalidation, no ISR and no cache tags to keep in sync. Images referenced from frontmatter are optimised at build by Astro (sharp) into hashed files; marketing photography in `src/assets/images/` is handled the same way; `public/` is served as-is. Function responses are not cached.

### 7.5 Metadata and structured data

`src/lib/metadata/` composes title, description, canonical (always with a trailing slash), robots, Open Graph and Twitter tags; `Base.astro` renders them and the Organization JSON-LD on every page. `src/lib/schema/` builds Article, Recipe (with instructions and image), BreadcrumbList and LocalBusiness JSON-LD; page-level `<JsonLd>` emits them. `LOCAL_BUSINESS` in `src/lib/constants.ts` holds the address and coordinates. The sitemap comes from `@astrojs/sitemap` (`/sitemap-index.xml`, with `/sitemap.xml` redirected to it) and the feed from `@astrojs/rss` at `/feed.xml`.

### 7.6 Accessibility

Semantic HTML from `.astro` templates, one `h1` per page, meaningful `alt` from `imageAlt`, visible focus ring from the theme, forms with labels and inline status messages rather than toasts. No automated accessibility gate runs in CI yet; Lighthouse accessibility is compared against the production baseline by hand.

### 7.7 Testing strategy

| Layer         | What                                                                                                                                                                               | Command                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Unit (Vitest) | Handlers, validation, sanitisation, rate limiter, MailerLite client, metadata, schema, security policy, consent, islands                                                           | `pnpm --filter web test`                      |
| Parity        | `dist/` against `apps/web/tests/baseline/`: URLs, intentional removals, metadata, common `<head>`                                                                                  | `pnpm --filter web test:parity` (after build) |
| Dist          | Internal links and images resolve, first-party resources stay inside the CSP allowlist, hero `fetchpriority`/`loading`, Vercel output carries headers, 410 routes and enforced CSP | `pnpm --filter web test:dist` (after build)   |
| Typecheck     | `astro check`                                                                                                                                                                      | `pnpm --filter web typecheck`                 |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, tests, `turbo run build --filter=web` and `test:dist` on every pull request and push to `main`. The parity and dist suites skip themselves when `dist/` is absent, so `pnpm test` is safe without a build. There is no browser end-to-end suite; form submission is verified by hand on a preview deployment.

### 7.8 Public HTTP surface

| Route                                            | Method | Purpose                                         | Notes                                              |
| ------------------------------------------------ | ------ | ----------------------------------------------- | -------------------------------------------------- |
| `/api/contact/`                                  | POST   | Contact form → Resend notification              | GET returns 405                                    |
| `/api/subscribe/`                                | POST   | Newsletter subscription → MailerLite subscriber | One submission per email per day                   |
| `/api/events/signup/`                            | POST   | Event signup → MailerLite group for the event   | 404 draft/unknown, 400 past or external, 409 full  |
| `/api/csp-report/`                               | POST   | CSP violation reports → Sentry                  | 204 for reports from other origins                 |
| `/monitoring/`                                   | POST   | Browser Sentry envelopes → the project DSN      | Same-origin tunnel; GET returns 405                |
| `/admin/**`, `/api/graphql*`                     | any    | Retired admin and GraphQL paths                 | 410 Gone                                           |
| `/feed.xml`, `/sitemap-index.xml`, `/robots.txt` | GET    | Syndication and crawling                        | Static; `/sitemap.xml` and `/favicon.ico` redirect |

Request and response shapes are the Zod schemas in `src/lib/validation/` and the JSON helpers in `src/lib/api/json.ts`. All other paths are static HTML with a trailing slash; ten retired blog slugs redirect (301) to their replacements per `astro.config.mjs`.

---

## 8. Deployment and environments

### 8.1 Topology

| Environment    | How                                       | Data                           | Notes                                                               |
| -------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| **Local**      | `pnpm web:dev` (`astro dev`)              | `content/` in the working tree | Drafts visible; `.env` from `apps/web/.env.example`                 |
| **Preview**    | Vercel deployment per pull request        | The PR branch                  | Same CSP as production; the draft preview for authors and reviewers |
| **Production** | Vercel project, root directory `apps/web` | `main`                         | Secrets in Vercel environment variables                             |

### 8.2 Configuration

From `apps/web/.env.example`:

| Variable                                                                                                         | Purpose                                                |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `PUBLIC_SITE_URL`                                                                                                | Canonical origin for metadata, JSON-LD and the sitemap |
| `PUBLIC_GTM_ID`                                                                                                  | GTM container, injected after consent                  |
| `PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`                           | Sentry; the integration is skipped when no DSN is set  |
| `MAILERLITE_API_KEY`                                                                                             | Subscribe and event-signup endpoints                   |
| `RESEND_API_KEY`, `CONTACT_EMAIL_RECIPIENT`, `CONTACT_EMAIL_FROM`                                                | Contact notification email                             |
| `CONTACT_FORM_ENABLE`, `CONTACT_FORM_RATE_LIMITING`, `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_HOURS` | Contact endpoint switches                              |
| `EVENT_SIGNUP_RATE_LIMITING`, `EVENT_SIGNUP_RATE_LIMIT_MAX`, `EVENT_SIGNUP_RATE_LIMIT_WINDOW_HOURS`              | Event-signup switches                                  |

No variable is required to build. `turbo.json` lists the build-relevant variables so Turborepo's cache keys include them.

### 8.3 Build and release

```text
push / merge → Vercel build (root: apps/web)
  → pnpm install (workspace)
  → turbo run build --filter=web → astro build
      → validate content, prerender pages, optimise images, write sitemap and feed
      → Vercel adapter: static output + five functions
      → integrations patch .vercel/output/config.json (headers, 410s, redirects)
  → deploy
```

Rollout is trunk-based: merge to `main` is the production release, every pull request gets a preview. Rollback is redeploying the previous Vercel deployment. Content and code share one pipeline; there is no separate content release.

---

## 9. Architectural decisions

Decisions live in [`docs/decisions/`](decisions/). Accepted records that govern this architecture:

| ID       | Decision                                                                              | Status                                                                                    |
| -------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| ADR-0001 | [Astro + MDX is the platform for carinyaparc.com.au](decisions/ADR-0001-astro-mdx.md) | Accepted 2026-09-21                                                                       |
| ADR-0002 | [Git is the publish gate](decisions/ADR-0002-git-is-the-publish-gate.md)              | Accepted 2026-09-21                                                                       |
| —        | `content/` at the repository root rather than inside `apps/web`                       | Candidate; recorded in ADR-0001 consequences for now                                      |
| —        | Public CSP: host allowlist + `'unsafe-inline'`, not nonce + `'strict-dynamic'`        | Candidate; rationale in `src/lib/security/constants.ts`; revisit only if pages go dynamic |
| —        | Event signups as MailerLite groups, no capacity counting                              | Candidate; taken as the default in ADR-0001                                               |
| —        | `@carinya/theme` as a workspace package; UI primitives stay inlined in the app        | Candidate; shipped                                                                        |

---

## 10. Risks, technical debt, and open questions

### 10.1 Risks

| Risk                                                        | Likelihood | Impact | Mitigation direction                                                                                      |
| ----------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Form abuse across function instances                        | Medium     | Medium | Honeypot and timing in the handler; Vercel WAF rate-limit on form POSTs                                   |
| CSP enforcement breaks a third-party script                 | Low        | Medium | Violations POST to `/api/csp-report/` and Sentry; watch after allowlist changes                           |
| Events list stale between deploys                           | Medium     | Low    | Content merges redeploy; a scheduled deploy hook if events become frequent                                |
| Draft leaks through a new query that bypasses `isPublished` | Low        | High   | Queries in `src/lib/content/` only; parity test on sitemap; review new `getCollection` calls              |
| Editor friction without a browser UI                        | Medium     | Medium | Templates and the authoring contract in [`AGENTS.md`](../AGENTS.md); optional git-backed editor (roadmap) |

### 10.2 Technical debt

- **Rate limiting is in-memory per instance** as well as a Vercel WAF rule on form POSTs. `createRateLimiter` still resets when an instance is recycled; the WAF is the durable control. The Sentry tunnel at `/monitoring/` sits outside `/api/*`, so a durable WAF rule for that path has to name it explicitly.
- **CSP carries `'unsafe-inline'`** for scripts and styles. Prerendered HTML cannot nonce inline scripts; the policy relies on host allowlists. The policy is enforced.
- **Events freshness is tied to deploys.** An event flips from upcoming to past only when the site rebuilds. `isFull` is set by hand.
- **Posts render the full MDX body.** There is no automatic midpoint subscribe form. The `InlineSubscribe` island exists (used on the blog index band and the regenerate page) and could become an MDX component authors place explicitly (roadmap Phase 4).
- **Placeholder `imageAlt` values.** `content/recipes/winter-root-vegetable-stew.mdx` still reads `imageAlt: "Hero home"`. `imageAlt` is optional in the schema, so nothing enforces quality.
- **`LOCAL_BUSINESS.geo` is a placeholder** (`-32.0, 152.0` in `src/lib/constants.ts`); the LocalBusiness JSON-LD publishes it.
- **No browser end-to-end tests**; islands are unit-tested with jsdom and forms verified on previews by hand.
- **Posts do not emit** `article:published_time` or `article:author` Open Graph tags (JSON-LD `Article` is present).
- **TypeScript** stays at `~6.0.3` in `apps/web` (root declares `~7.0.2`); typescript-eslint does not yet support 7.

### 10.3 Open questions

- **Editorial tooling.** Is a PR-based workflow with previews enough for the editor, or is a git-backed editor (Decap, Keystatic, or GitHub's web editor with templates) worth adding? Decide after a month of publishing through PRs.
- **Recipe tags.** Recipe-only tags have no archive page today; surface `/recipes/tag/` pages, or leave recipe tags as labels only.
- **Dynamic social images.** Generate per-post OG images at build (Satori or similar) or keep the hero/home fallback.
- **Event signup source of truth.** MailerLite groups hold the list; if a capacity or attendance record is ever needed it has to come from MailerLite exports.

Mitigation timing is in [`product/roadmap.md`](product/roadmap.md). Do not track debt elsewhere in this doc set.

---

## 11. Graduation candidates

Patterns that may lift to a shared package if a second product or surface adopts them.

| Pattern                                                                              | Trigger for graduation                                   |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Security policy generator** (`src/lib/security` → `vercel.json` + output merge)    | A second Astro or static site on Vercel in the portfolio |
| **Content query layer** (`src/lib/content/` with draft filtering and card shapes)    | A second content site sharing the collection shapes      |
| **Metadata + JSON-LD composer split**                                                | A third site requiring the same SEO structure            |
| **Form endpoint pipeline** (Zod → honeypot → timing → limiter → sanitise → upstream) | Reused by another form-bearing site                      |
| **Consent gate island**                                                              | Any other consent-gated analytics surface                |

Until then, these remain conventions inside `apps/web` documented in this file and [`AGENTS.md`](../AGENTS.md).
