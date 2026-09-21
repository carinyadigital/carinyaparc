---
type: Solution
scope: carinyaparc-website
version: '0.2'
owner: engineering
status: Draft
last_updated: 2026-09-21
related:
  - docs/product/product.md
  - docs/architecture/principles.md
  - docs/architecture/structure.md
  - docs/architecture/astro-migration.md
  - docs/product/roadmap.md
  - docs/decisions/ADR-0001-astro-mdx-replaces-payload.md
  - docs/decisions/ADR-0002-git-is-the-publish-gate.md
---

# Solution — Carinya Parc website

**How** the Carinya Parc website is built and behaves — architecture, runtime, data model, and integration boundaries.

| Doc                                           | Role                                                                |
| --------------------------------------------- | ------------------------------------------------------------------- |
| [`product/product.md`](../product/product.md) | What and why                                                        |
| [`product/roadmap.md`](../product/roadmap.md) | When                                                                |
| **This document**                             | How — plus risks, technical debt, and open questions (**§10 only**) |
| [`structure.md`](structure.md)                | Where — routes and folders                                          |
| [`principles.md`](principles.md)              | Engineering rules                                                   |

**Cut-over status.** Production still deploys from `apps/site` (Next.js + Payload) until Phase 7 of [`astro-migration.md`](astro-migration.md) points the Vercel project at `apps/web`. Everything below describes `apps/web`, which is the product from that point on.

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
┌──────┴───────┐  PR merge  │   POST /api/csp-report/   → Sentry         │
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

This system owns the public marketing site (home, about, regenerate, contact, subscribe, get-involved), the blog and recipe surfaces, the events listing, the legal pages, the four on-demand HTTP endpoints, security headers and CSP, SEO metadata and JSON-LD, and the static assets (photography, motifs, favicons, manifest). It also owns the content model in `content/` and the schemas that validate it.

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

- TypeScript strict mode; no `any` in new code ([`principles.md`](principles.md)).
- Australian English for user-visible copy ([`product.md`](../product/product.md)).
- One property and, in practice, one editor. Roles, approvals beyond PR review, and multi-tenant patterns are out of scope.
- Public pages are prerendered. Anything that needs a request (forms, reports) is an explicit on-demand endpoint under `src/pages/api/`.
- Monorepo shape: `apps/web` plus `packages/carinya-theme`, `packages/eslint-config`, `packages/typescript-config`, with `content/`, `brand/` and `skills/` at the root. It is not flattened to a single app.

---

## 3. Solution strategy

### 3.1 Architectural style

**Static site with islands, git as the CMS.** Astro 7 renders every public route to HTML at build time from `.astro` components and MDX content collections. React 19 islands hydrate only the contact, subscribe, event-signup and consent components. Four endpoints run as Vercel functions on demand. Content lives in `content/` at the repository root and is validated by Zod schemas in `apps/web/src/content.config.ts`; publishing is merging to `main`.

The trade-off accepted is the loss of a browser editing UI. Vercel preview deployments and PR review replace draft preview and publish approval; see [ADR-0002](../decisions/ADR-0002-git-is-the-publish-gate.md).

### 3.2 Key decisions and trade-offs

| Choice                                                 | Satisfies                                  | Trade-off accepted                                                                          |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Astro + MDX content collections instead of Payload     | Hermetic builds, security, ownable content | No browser editor; content changes need a PR and a deploy                                   |
| `content/` at the repository root                      | Authors and agents never touch `apps/`     | Collections reach out of the app (`CONTENT_ROOT = '../../content'`); path-scoped CODEOWNERS |
| `output: 'static'`, endpoints opt out with `prerender` | Fast TTFB, CDN-served HTML                 | Anything dynamic must be an explicit endpoint or an island                                  |
| React islands for forms and consent only               | Lean client JS                             | Two component flavours (`.astro` and `.tsx`) in one tree                                    |
| Event signups as MailerLite groups                     | No database                                | No capacity counting; `isFull` is set by hand in frontmatter                                |
| Security headers generated into `vercel.json`          | One source of truth, unit-tested policy    | CSP is host-allowlist + `'unsafe-inline'`; nonces are impossible on prerendered HTML        |
| `@carinya/theme` workspace package                     | Tokens shared with future surfaces         | A second package to version alongside the app                                               |
| Self-hosted fonts via fontsource                       | No third-party font hosts in CSP           | Fonts ship from our origin and count against page weight                                    |

### 3.3 Principles applied

From [`principles.md`](principles.md): pages load data and sections render; content queries in `src/lib/content/` so draft filtering and sorting live in one place; metadata and JSON-LD as small composable helpers; validation at the boundary; colocated tests for logic that is not trivially a template.

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

| Block                     | Responsibility                                                                                      | Location                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Collections**           | Six collections and their Zod schemas; `reference()` for author/category, `image()` for heroes      | `apps/web/src/content.config.ts`, `src/lib/content/schema.ts`         |
| **Content queries**       | Published-only filtering, sorting, card shapes, archives with at least one post, upcoming events    | `src/lib/content/{posts,recipes,events,dates}.ts`                     |
| **Pages**                 | One `.astro` file per route; `getStaticPaths` from the queries                                      | `src/pages/**`                                                        |
| **Layouts**               | `Base.astro` (head, metadata, Organization JSON-LD, consent island), `Site.astro` (header/footer)   | `src/layouts/`                                                        |
| **UI primitives**         | Button, Eyebrow, Breadcrumb, JsonLd, MotifTile, form fields                                         | `src/components/ui/`                                                  |
| **Sections and chrome**   | Hero, PageHeader, ImpactStats; header, footer; blog, recipes, marketing sections                    | `src/components/{sections,header,footer,blog,recipes,marketing}/`     |
| **Islands**               | ContactForm, SubscribeForm/Modal/Inline/EndOfPost, EventSignup, ConsentGate                         | `src/components/islands/`, `src/components/consent/`                  |
| **Endpoints**             | `prerender = false` routes delegating to handlers                                                   | `src/pages/api/`, `src/lib/api/`                                      |
| **Validation**            | Zod schemas, sanitisation, spam-email list                                                          | `src/lib/validation/`                                                 |
| **Rate limiting**         | In-memory per-key limiter shared by the handlers                                                    | `src/lib/rate-limit.ts`                                               |
| **Integrations**          | MailerLite client (subscribers, event groups), Resend notification email                            | `src/lib/mailerlite/`, `src/lib/email/`                               |
| **Security policy**       | Header presets, CSP directives, `vercel.json` generator, Gone routes                                | `src/lib/security/`, `scripts/generate-vercel-json.ts`                |
| **Build integrations**    | Merge headers and 410 routes into the Vercel output; make redirects accept a trailing slash         | `astro.config.mjs`, `integrations/vercel-redirect-trailing-slash.mjs` |
| **Metadata and schema**   | Title, description, canonical, OG/Twitter; Article, Recipe, Breadcrumb, LocalBusiness, Organization | `src/lib/metadata/`, `src/lib/schema/`, `src/lib/constants.ts`        |
| **Analytics and consent** | Cookie read/write, consent types, event tracking helpers, scroll depth                              | `src/lib/consent/`, `src/lib/analytics/`, `src/lib/client/`           |
| **Observability**         | Sentry capture and metric counters used by the handlers                                             | `src/lib/observability/metrics.ts`                                    |
| **Feed**                  | RSS builder for `/feed.xml`                                                                         | `src/lib/blog/build-feed.ts`, `src/pages/feed.xml.ts`                 |
| **Theme**                 | Design tokens consumed by `src/styles/globals.css`                                                  | `packages/carinya-theme`                                              |

### 4.3 Repository layout

See [`structure.md`](structure.md) for the directory map. Architectural rule: **pages load data through `src/lib/content/`; components render; `src/lib/` holds integrations and side effects; `content/` holds only content.**

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

### 6.4 Glossary

| Term                   | Definition                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Entry**              | One file in a collection; its id is the filename stem and the public slug            |
| **Island**             | A React component hydrated in the browser (`client:visible` / `client:idle`)         |
| **On-demand endpoint** | A `src/pages/api/*` route with `prerender = false`, deployed as a Vercel function    |
| **Featured post**      | `featured: true`; drives home-page highlights                                        |
| **ISO duration**       | Recipe times such as `PT20M`, formatted for display by `format-duration`             |
| **Preview**            | The Vercel deployment of a pull request; the draft preview for authors and reviewers |

---

## 7. Cross-cutting concepts

### 7.1 Security

- **Headers.** `src/lib/security/` defines HSTS (two years, preload), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation off) and the CSP. `pnpm --filter web generate:vercel-json` writes them to `vercel.json`; the `vercelSecurityConfig` integration also merges them into `.vercel/output/config.json` at build so they apply even where the platform ignores `vercel.json`.
- **CSP.** Host allowlist plus `'unsafe-inline'` for scripts and styles, because prerendered HTML cannot carry per-request nonces and Astro inlines small scripts. Fonts are self-hosted so no font hosts are allowlisted. The header ships as `Content-Security-Policy-Report-Only` while `CSP_REPORT_ONLY_UNTIL_CUTOVER` is `true` in `src/lib/security/constants.ts`; cut-over flips it to enforced. Reports go to `/api/csp-report/`.
- **Retired surfaces.** `/admin`, `/api/graphql` and `/api/graphql-playground` (and anything below them) return **410 Gone** from a CDN route; matching on-demand endpoints exist so local preview behaves the same.
- **Rate limiting.** Each endpoint keeps an in-memory map keyed by email, per function instance. It stops a single browser repeating a form; it does not stop a distributed attempt and resets whenever an instance is recycled. Honeypot and timing checks run first. Durable abuse control is a Vercel WAF rate-limit rule on `/api/*`, configured at cut-over (§10).
- **Cookies.** `cp_consent` only, set by the browser, not httpOnly. No session cookie exists.
- **Validation.** Zod schemas in `src/lib/validation/`; `sanitize.ts` strips control characters and HTML-significant characters before anything reaches email or MailerLite. Validation errors return field details; upstream failures return a generic message and 503.
- **Secrets.** `MAILERLITE_API_KEY`, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN` are server-only. Only `PUBLIC_*` variables reach the browser.

### 7.2 Observability

- **Sentry** (`@sentry/astro`) on client and server when a DSN is set; source maps upload when `SENTRY_AUTH_TOKEN` is present. Handlers call `captureException` and `countMetric` through `src/lib/observability/metrics.ts`.
- **Vercel Analytics and Speed Insights** load only after consent, from the `ConsentGate` island.
- **Logging.** Endpoints log rejection reasons and the email domain, never the address or message body.

### 7.3 Error handling

- **404** — `src/pages/404.astro`, served by Vercel for any unmatched path.
- **410** — retired Payload paths (§7.1).
- **Endpoints** — structured JSON `{ error }` with 400/404/409/429/500/503 as appropriate; a thrown error inside a handler is captured to Sentry and returns a generic 500.
- **Build** — a schema error, a missing referenced file or a missing image fails `astro build`, which fails CI and the Vercel deployment; nothing partial ships.

### 7.4 Caching and content freshness

Every public page is static HTML on the Vercel CDN and changes only when a build runs. Freshness is therefore "last merge to `main`": there is no revalidation, no ISR and no cache tags to keep in sync. Images referenced from frontmatter are optimised at build by Astro (sharp) into hashed files; marketing photography in `src/assets/images/` is handled the same way; `public/` is served as-is. Function responses are not cached.

### 7.5 Metadata and structured data

`src/lib/metadata/` composes title, description, canonical (always with a trailing slash), robots, Open Graph and Twitter tags; `Base.astro` renders them and the Organization JSON-LD on every page. `src/lib/schema/` builds Article, Recipe (with instructions and image), BreadcrumbList and LocalBusiness JSON-LD; page-level `<JsonLd>` emits them. `LOCAL_BUSINESS` in `src/lib/constants.ts` holds the address and coordinates. The sitemap comes from `@astrojs/sitemap` (`/sitemap-index.xml`, with `/sitemap.xml` redirected to it) and the feed from `@astrojs/rss` at `/feed.xml`.

### 7.6 Accessibility

Semantic HTML from `.astro` templates, one `h1` per page, meaningful `alt` from `imageAlt`, visible focus ring from the theme, forms with labels and inline status messages rather than toasts. No automated accessibility gate runs in CI yet; Lighthouse accessibility is compared against the baseline by hand ([`astro-migration.md`](astro-migration.md) §5).

### 7.7 Testing strategy

| Layer         | What                                                                                                                                                                                  | Command                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Unit (Vitest) | Handlers, validation, sanitisation, rate limiter, MailerLite client, metadata, schema, security policy, consent, islands                                                              | `pnpm --filter web test`                      |
| Parity        | `dist/` against `docs/architecture/astro-migration/baseline/`: URLs, intentional removals, metadata, common `<head>`                                                                  | `pnpm --filter web test:parity` (after build) |
| Dist          | Internal links and images resolve, first-party resources stay inside the CSP allowlist, hero `fetchpriority`/`loading`, Vercel output carries headers, 410 routes and report-only CSP | `pnpm --filter web test:dist` (after build)   |
| Typecheck     | `astro check`                                                                                                                                                                         | `pnpm --filter web typecheck`                 |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, tests, `turbo run build --filter=web` and `test:dist` on every pull request and push to `main`. The parity and dist suites skip themselves when `dist/` is absent, so `pnpm test` is safe without a build. There is no browser end-to-end suite; form submission is verified by hand on a preview deployment.

### 7.8 Public HTTP surface

| Route                                            | Method | Purpose                                         | Notes                                              |
| ------------------------------------------------ | ------ | ----------------------------------------------- | -------------------------------------------------- |
| `/api/contact/`                                  | POST   | Contact form → Resend notification              | GET returns 405                                    |
| `/api/subscribe/`                                | POST   | Newsletter subscription → MailerLite subscriber | One submission per email per day                   |
| `/api/events/signup/`                            | POST   | Event signup → MailerLite group for the event   | 404 draft/unknown, 400 past or external, 409 full  |
| `/api/csp-report/`                               | POST   | CSP violation reports → Sentry                  | 204 for reports from other origins                 |
| `/admin/**`, `/api/graphql*`                     | any    | Retired Payload surfaces                        | 410 Gone                                           |
| `/feed.xml`, `/sitemap-index.xml`, `/robots.txt` | GET    | Syndication and crawling                        | Static; `/sitemap.xml` and `/favicon.ico` redirect |

Request and response shapes are the Zod schemas in `src/lib/validation/` and the JSON helpers in `src/lib/api/json.ts`. All other paths are static HTML with a trailing slash; ten retired blog slugs redirect (301) to their replacements per `astro.config.mjs`.

---

## 8. Deployment and environments

### 8.1 Topology

| Environment    | How                                       | Data                           | Notes                                                        |
| -------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| **Local**      | `pnpm web:dev` (`astro dev`)              | `content/` in the working tree | Drafts visible; `.env` from `apps/web/.env.example`          |
| **Preview**    | Vercel deployment per pull request        | The PR branch                  | CSP report-only; the draft preview for authors and reviewers |
| **Production** | Vercel project, root directory `apps/web` | `main`                         | Secrets in Vercel environment variables                      |

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
      → Vercel adapter: static output + four functions
      → integrations patch .vercel/output/config.json (headers, 410s, redirects)
  → deploy
```

Rollout is trunk-based: merge to `main` is the production release, every pull request gets a preview. Rollback is redeploying the previous Vercel deployment. Content and code share one pipeline; there is no separate content release.

### 8.4 Cut-over

The steps that move production from `apps/site` to `apps/web` — re-export, pointing the Vercel root at `apps/web`, pruning environment variables, enforcing CSP, adding the WAF rule, deleting `apps/site` — are Phase 7 of [`astro-migration.md`](astro-migration.md) and are not repeated here.

---

## 9. Architectural decisions

| ID       | Decision                                                                                | Status                                                                                    |
| -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| ADR-0001 | [Astro + MDX replaces Payload CMS](../decisions/ADR-0001-astro-mdx-replaces-payload.md) | Accepted 2026-09-21                                                                       |
| ADR-0002 | [Git is the publish gate](../decisions/ADR-0002-git-is-the-publish-gate.md)             | Accepted 2026-09-21                                                                       |
| —        | `content/` at the repository root rather than inside `apps/web`                         | Candidate; recorded in ADR-0001 consequences for now                                      |
| —        | Public CSP: host allowlist + `'unsafe-inline'`, not nonce + `'strict-dynamic'`          | Candidate; rationale in `src/lib/security/constants.ts`; revisit only if pages go dynamic |
| —        | Event signups as MailerLite groups, no capacity counting                                | Candidate; open decision 1 in `astro-migration.md` §7, taken as the default               |
| —        | `@carinya/theme` as a workspace package; UI primitives stay inlined in the app          | Candidate; shipped in roadmap Phase 3                                                     |

---

## 10. Risks, technical debt, and open questions

### 10.1 Risks

| Risk                                                        | Likelihood | Impact | Mitigation direction                                                                                  |
| ----------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Form abuse across function instances                        | Medium     | Medium | Honeypot and timing today; Vercel WAF rate-limit rule on `/api/*` at cut-over                         |
| CSP enforcement breaks a third-party script                 | Low        | Medium | Report-only on preview until cut-over; reports reach Sentry; enforce, then watch                      |
| Events list stale between deploys                           | Medium     | Low    | Content merges redeploy; a scheduled deploy hook if events become frequent                            |
| Draft leaks through a new query that bypasses `isPublished` | Low        | High   | Queries in `src/lib/content/` only; parity test on sitemap; review new `getCollection` calls          |
| Editor friction without a browser UI                        | Medium     | Medium | Templates and the authoring contract in `astro-migration.md` §3; optional git-backed editor (roadmap) |

### 10.2 Technical debt

- **Rate limiting is in-memory per instance** until the WAF rule exists. `createRateLimiter` is honest about this; nothing durable backs it.
- **CSP carries `'unsafe-inline'`** for scripts and styles. Prerendered HTML cannot nonce inline scripts; the policy relies on host allowlists. Report-only until cut-over.
- **Events freshness is tied to deploys.** An event flips from upcoming to past only when the site rebuilds. `isFull` is set by hand.
- **Mid-article inline subscribe was not ported.** Production split the post body at its midpoint to insert a form; MDX bodies render whole. The `InlineSubscribe` island exists (used on the blog index band and the regenerate page) and could become an MDX component authors place explicitly.
- **Placeholder `imageAlt` values.** Converted content carried filename-derived alt text; posts have been rewritten with real descriptions, but `content/recipes/winter-root-vegetable-stew.mdx` still reads `imageAlt: "Hero home"`. `imageAlt` is optional in the schema, so nothing enforces quality.
- **`LOCAL_BUSINESS.geo` is a placeholder** (`-32.0, 152.0` in `src/lib/constants.ts`); the LocalBusiness JSON-LD publishes it.
- **`apps/site` is still in the tree** with its Payload, Next.js and seed dependencies, `docker-compose.yml`, the export and convert scripts, and the `import:content-seeds:validate` CI step. All of it goes in Phase 7.
- **`turbo.json` still lists Payload-era variables** (`PAYLOAD_SECRET`, `NEON_DATABASE_URL`, `NEXT_PUBLIC_*`, `SESSION_SECRET`, `SECURITY_CSP_*`); prune with `apps/site`.
- **No browser end-to-end tests**; islands are unit-tested with jsdom and forms verified on previews by hand.
- **Not carried over from production**: `article:published_time` and `article:author` Open Graph tags on posts.
- **TypeScript** stays at `~6.0.3` in `apps/web` (root declares `~7.0.2`); typescript-eslint does not yet support 7.

### 10.3 Open questions

- **Editorial tooling.** Is a PR-based workflow with previews enough for the editor, or is a git-backed editor (Decap, Keystatic, or GitHub's web editor with templates) worth adding? Decide after a month of publishing through PRs.
- **Recipe tags.** Recipe-only tags have no archive page today; surface `/recipes/tag/` pages, or leave recipe tags as labels only.
- **Dynamic social images.** Generate per-post OG images at build (Satori or similar) or keep the hero/home fallback.
- **Event signup source of truth.** MailerLite groups hold the list; if a capacity or attendance record is ever needed it has to come from MailerLite exports.

Mitigation timing is in [`product/roadmap.md`](../product/roadmap.md). Do not track debt elsewhere in this doc set.

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

Until then, these remain conventions inside `apps/web` documented in [`structure.md`](structure.md) and [`AGENTS.md`](../../AGENTS.md).
