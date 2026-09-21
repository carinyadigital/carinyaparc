# Project Structure

**Where** code and routes live — folder layout, naming, and conventions for the product monorepo and `apps/site`.

| Doc                                           | Role                            |
| --------------------------------------------- | ------------------------------- |
| [`product/product.md`](../product/product.md) | What and why                    |
| [`product/roadmap.md`](../product/roadmap.md) | When                            |
| [`solution.md`](solution.md)                  | How — architecture; debt in §10 |
| [`principles.md`](principles.md)              | Engineering rules               |

This document describes the repository layout and how to add features consistently. It does not track technical debt.

---

## High-level Repository Layout

At a high level, the monorepo is structured as:

```text
.
├── apps/
│   ├── site/                 # Next.js App Router app (production until Astro cut-over)
│   │   ├── content/          # MDX: legal pages; archived posts/recipes MDX
│   │   ├── public/           # Static assets (images, favicon, logo)
│   │   └── src/              # App Router, Payload collections, UI, lib
│   └── web/                  # Astro 6 + MDX public site (scaffold; not production yet)
│       ├── public/           # Favicons, robots.txt, scaffold images
│       └── src/
│           ├── content/      # MDX + YAML collections (empty until content migration)
│           ├── content.config.ts
│           ├── layouts/      # Base.astro, Site.astro
│           ├── components/   # Header, footer chrome
│           ├── pages/        # index, 404
│           ├── lib/          # metadata, schema, validation, security, email
│           └── styles/       # globals.css importing @carinya/theme
├── packages/
│   ├── carinya-theme/        # @carinya/theme — CSS-first Tailwind 4 tokens
│   ├── eslint-config/        # Shared ESLint configuration
│   └── typescript-config/    # Shared TypeScript configs
├── brand/                    # Voice and positioning markdown (not a workspace package)
├── skills/
│   └── carinya-parc/         # Product-local agent skill (not a workspace package)
├── specs/                    # Domain TDDs (board is GitHub issues)
├── docs/                     # Documentation (product/, architecture/)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── package.json              # Monorepo scripts and dev dependencies
```

The `docs/` directory contains [`product/product.md`](../product/product.md), architecture docs in [`architecture/`](.) ([`solution.md`](solution.md), [`principles.md`](principles.md)), [`product/roadmap.md`](../product/roadmap.md), and this file. Delivery work lives in GitHub issues; [`specs/`](../../specs/) holds domain TDDs those issues may link to. Update the relevant doc alongside code changes.

`pnpm-workspace.yaml` includes `apps/*` and `packages/*` only. `brand/` and `skills/` are source trees, not installable packages.

Voice and positioning live in `brand/voice.md` and `brand/positioning.md`. The product skill is `skills/carinya-parc/SKILL.md`.

Design tokens live in `packages/carinya-theme` (`@carinya/theme`). Site-specific CSS stays in `apps/site/src/styles/` today and is mirrored in `apps/web/src/styles/` for the Astro scaffold.

## Web App Structure (`apps/web`)

`apps/web` is the Astro 6 + MDX public site, built alongside `apps/site`. Production still deploys from `apps/site` until cut-over. The scaffold includes:

- `astro.config.mjs` — MDX, React, sitemap, Vercel adapter, Tailwind Vite plugin, `trailingSlash: 'always'`
- `src/content.config.ts` — posts, recipes, events, authors, categories, legal collection schemas
- `src/layouts/` — `Base.astro` (HTML head, fonts, Organization JSON-LD) and `Site.astro` (header/footer chrome)
- `src/pages/` — home and 404 only in this phase
- `src/lib/` — ported metadata, JSON-LD, validation, security, email, RSS, and duration helpers
- `src/data/tags.json` — tag slug → display name map (empty until content migration)

Run `pnpm web:dev` from the repo root. CI runs `pnpm turbo run build --filter=web` (no database secrets).

## Site App Structure (`apps/site`)

Within `apps/site`, the primary directories relevant to web behaviour are:

- `content/`
  - `posts/` – archived MDX (production blog reads Payload).
  - `recipes/` – archived MDX (production recipes read Payload).
  - `legal/` – legal pages (privacy, terms) in MDX; served at runtime.

- `public/`
  - `images/` – photography and UI placeholders. Use kebab-case, subject-descriptor names (e.g. `hero-home.jpg`, `farm-track-gate.jpg`); keep `404.jpg` for the not-found page.
  - `motifs/` – brand line icons (leaf, hills, sun, branch, sprout, grass).
  - `favicon/` – favicon.ico and PNG sizes; `logo.png`, `robots.txt`, `site.webmanifest`, etc.

- `src/app/`
  - `(payload)/` – Payload CMS admin (`/admin`) and API routes (`/api/*` for Payload collections). Own root layout (no site header/footer).
  - `(www)/` – main marketing site (shared site root layout):
    - `page.tsx` – home page.
    - `about/` with nested routes (e.g., `the-property`, `jonathan`).
    - `regenerate/` – regeneration overview.
    - `legal/[slug]/page.tsx` – legal pages resolved by slug.
    - `subscribe/page.tsx` – subscription / newsletter flows.
    - `contact/page.tsx` – contact form.
    - `get-involved/events/page.tsx` – upcoming events listing (Payload `events`).

  - `(blog)/` – routing group for blog content (shared site root layout):
    - `blog/page.tsx` – blog index at `/blog` (page 1 + pagination).
    - `blog/page/[page]/page.tsx` – paginated archive at `/blog/page/{n}`.
    - `blog/[slug]/page.tsx` – individual post at `/blog/{slug}` (Payload-backed).
    - `blog/category/[slug]/page.tsx`, `blog/tag/[tag]/page.tsx` – published-only archives.

  - `(recipes)/` – routing group for recipe content (shared site root layout):
    - `recipes/page.tsx` – recipes index at `/recipes`.
    - `recipes/[slug]/page.tsx` – individual recipe at `/recipes/{slug}` (Payload-backed).
    - Future: `recipes/category/[slug]/page.tsx`, `recipes/tag/[tag]/page.tsx`.

  - `api/` – API route handlers (`subscribe`, `contact`, `sentry`, `cron`).
  - `global-error.tsx`, `not-found.tsx`, `sitemap.ts`, and other app-wide files.
  - Optional route-level `loading.tsx`, `error.tsx`, and `layout.tsx` as needed.

- `src/collections/` – Payload CMS collection configs:
  - `Users.ts` – admin authentication.
  - `Authors.ts`, `Categories.ts`, `Tags.ts` – blog supporting entities.
  - `Posts.ts` – blog posts (title, slug, date, author, category, excerpt, body, tags, featured, image).
  - `Recipes.ts` – recipes (title, slug, times, servings, ingredients, instructions, tags, difficulty, SEO fields).
  - `Events.ts` – planting days / workshops (title, slug, startsAt, location, capacity, isFull, signupTarget, description).
  - `EventRegistrations.ts` – signup records against events (name, email, status registered/waitlisted).

- `src/fields/` – shared Payload field factories (`slugField`).
- `src/collections/recipeIngredient.ts` – recipe ingredient/instruction field defs (Recipes-only).

- `src/features/` – domain modules (product-area colocation; not full DDD).
  - `blog/` – journal UI, queries, RSS, article schema, blog layout wrapper.
    - `components/` – PostCard, FeaturedPosts, RelatedPosts, ShareBar, AuthorBlock, …
    - `queries/` – posts, related-posts, categories, tags, sitemap-posts.
    - `rss/` – RSS feed builder.
    - `schema/` – Article JSON-LD helper.
    - `layout/` – `blog-root-layout.tsx`.
    - `types.ts` – list `Post` type; re-exports common blog query helpers.
  - `recipes/` – recipe UI, queries, duration helpers, recipe schema.
    - `components/` – RecipeCard, RecipeGrid.
    - `queries/` – recipes list/detail/sitemap.
    - `lib/` – `format-duration.ts`.
    - `schema/` – Recipe JSON-LD helper.
  - `events/` – planting days / workshops listing, signup UI, queries, validation, confirmation email.
    - `components/` – EventCard, EventSignup, GetInvolvedCTA.
    - `queries/` – upcoming events, capacity, registration lookups.
    - `validation/` – event signup Zod schemas.
    - `email/` – Resend confirmation sender + template.
  - Prefer `@/features/{domain}` for domain code. Keep Next routes in `app/` and Payload
    collection configs in `collections/`.

- `src/components/`
  - `sections/` – shared page chrome only (hero, header, footer, page-header, regenerate, …).
  - `forms/` under `sections/` for reusable form UI (e.g. `ContactFormSection`, subscribe flows).
  - `layouts/` – shared layout-level components (site root shell).
  - `rich-text/` – Lexical rich-text renderer for Payload post bodies.
  - `subscribe/`, `pages/`, `ui/` – subscribe flows, page-specific extras, and shared UI primitives.

- `src/hooks/`
  - Hooks such as `use-mobile`, `use-toast`, etc.

- `src/lib/`
  - `cn.ts` – class name utility.
  - `payload/` – Payload client, cache wrappers, content mappers, access control, slugify.
    - `client.ts` – cached `getPayloadClient()` (server-only).
    - `cache.ts` – `unstable_cache` wrappers over feature query functions.
    - `queries/` – remaining non-feature query helpers (most content queries live under `features/`).
    - `map-content.ts` – maps Payload documents to list/detail shapes.
    - `urls.ts` – `/blog/{slug}` and `/recipes/{slug}` path helpers.
  - `metadata/` – helper functions for route metadata.
  - `schema/` – shared schema utilities (organization, breadcrumb, localBusiness) and `generateJsonLd` orchestrator; article/recipe generators live under `features/`.
  - `analytics/` – consent-gated GA/GTM helpers (`trackEvent`, typed funnel events); event schema in `specs/blog/tdd.md` §4; GA4 funnel explorations in `specs/blog/tdd.md` §8.
  - `consent/` – cookie-consent server actions (httpOnly `cp_consent` cookie).
  - `session/` – JWT helpers for a future `cp_session` cookie (scaffold only; not used by routes today).
  - `security/` – security utilities (CSP, headers, caching).
  - Other cross-cutting library code.

- `src/styles/`
  - `globals.css`, `components.css`, and page-level overrides. Design tokens live in `packages/carinya-theme` (`@carinya/theme`).

- `vitest.config.mjs`, `vitest.setup.ts` – Vitest config; tests colocated under `src/`

## Routing & Layout (Next.js App Router)

### Layout and error boundaries

- `src/components/layouts/site-root-layout.tsx`
  - Shared site root layout (HTML shell, providers, header, footer). Used by `(www)/layout.tsx`, `(blog)/layout.tsx`, and `(recipes)/layout.tsx`.
- `src/features/blog/layout/blog-root-layout.tsx`
  - Blog route-group layout wrapper (re-exported from `(blog)/layout.tsx`).
- `(payload)/layout.tsx`
  - Payload admin root layout — separate from the public site so `/admin` does not nest two `<html>` documents.

- `src/app/global-error.tsx`
  - Handles rendering for uncaught errors across the app.

- `src/app/not-found.tsx`
  - Default UI for unknown routes.

- `src/app/navigation.tsx`
  - Central navigation configuration (imported by layout or header components).

Each route or route group MAY also define:

- `layout.tsx` – layout for that subtree.
- `loading.tsx` – route-level loading UI.
- `error.tsx` – route-level error boundary.
- `template.tsx` – template for repeated segments (if needed).
- `route.ts` – handler for API routes or other HTTP endpoints.

### Routes

The current route structure includes (not exhaustive):

- `/` → `src/app/(www)/page.tsx` (home).
- `/about` → `src/app/(www)/about/page.tsx`.
- `/about/the-property` → `src/app/(www)/about/the-property/page.tsx`.
- `/about/jonathan` → `src/app/(www)/about/jonathan/page.tsx`.
- `/regenerate` → `src/app/(www)/regenerate/page.tsx`.
- `/blog` → `src/app/(blog)/blog/page.tsx`.
- `/blog/page/[page]` → `src/app/(blog)/blog/page/[page]/page.tsx`.
- `/blog/[slug]` → `src/app/(blog)/blog/[slug]/page.tsx`.
- `/recipes` → `src/app/(recipes)/recipes/page.tsx`.
- `/recipes/[slug]` → `src/app/(recipes)/recipes/[slug]/page.tsx`.
- `/feed.xml` → `src/app/feed.xml/route.ts` (RSS 2.0 feed of blog posts).
- `/legal/[slug]` → `src/app/(www)/legal/[slug]/page.tsx`.
- `/subscribe` → `src/app/(www)/subscribe/page.tsx`.
- `/contact` → `src/app/(www)/contact/page.tsx`.

API routes:

- `/api/subscribe` → `src/app/api/subscribe/route.ts`.
- `/api/contact` → `src/app/api/contact/route.ts`.
- `/api/events/signup` → `src/app/api/events/signup/route.ts`.
- `/api/csp-report` → `src/app/api/csp-report/route.ts`.

Cookie consent is not an API route. It uses the server action `setConsent` in `src/lib/consent/actions.ts`, called from `src/components/ui/Policy.tsx`. The root layout reads the httpOnly `cp_consent` cookie to gate analytics and banner visibility.

### Route groups

Route groups are structural only (they do not change URLs):

- `(www)/` – marketing, legal, contact, subscribe.
- `(blog)/` – blog index and posts.
- `(recipes)/` – recipes index and detail pages.
- `(payload)/` – Payload admin and CMS API (separate root layout).

If additional groups are introduced (e.g. `(functional)` for booking flows), document them here.

### Marketing vs functional pages

- **Marketing and storytelling:** `/`, `/about`, `/about/the-property`, `/regenerate`, `/blog`, `/recipes/*`.
- **Functional:** `/contact`, `/subscribe`, and API endpoints.

Future booking flows may live under `/stay` or `/visit` (see [`product.md`](product.md)).

## Components, Hooks & Utilities

### Components

- Shared chrome lives under `src/components/` with subfolders by concern:
  - `sections/` for large shared page sections (hero, footer, regenerate, etc.).
  - `forms/` for reusable form sections:
    - `ContactFormSection.tsx` – contact inquiry form
    - `SubscribeSection.tsx` – newsletter subscription
  - `ui/` for low-level UI primitives and wrappers (built on Base UI), e.g. `button.tsx`, `card.tsx`, `input.tsx`.
  - `pages/` for page-specific extras.
- Domain UI (blog, recipes) lives under `src/features/{domain}/components/`.

### Providers

- Live under `src/providers/`.
  - `Providers.tsx` - TanStack Query provider wrapper

**Naming convention:**

- Components use **PascalCase** file and export names: `HeroSection.tsx`, `SubscribeForm.tsx`, `BlogPostCard.tsx`.
- Each file should export a single main component as default or named export.

### Hooks

- Live under `src/hooks/`.

**Naming convention:**

- Hooks start with `use`, e.g., `useMobile`, `useToast`.
- File names are in kebab-case mirroring the hook name, e.g., `use-mobile.ts`.

### Utilities & lib

- Live under `src/lib/`.
- **Data-fetching and content utilities**:
  - Blog data: `src/features/blog/queries/` (cached via `lib/payload/cache.ts`).
  - Recipe data: `src/features/recipes/queries/` (cached via `lib/payload/cache.ts`).
  - Events data: `src/features/events/queries/`.
  - Legal pages: loaded from `content/legal/` MDX in route handlers.

- **Naming convention**:
  - Data-fetching helpers: `getX`, `listX`, `fetchX`.
  - Parsing/formatting helpers: `parseX`, `formatX`.

- **Module organisation:**
  - **Single files** (e.g., `cn.ts`, `posts.ts`) for focused utilities.
  - **Folders** (e.g., `metadata/`, `schema/`, `consent/`, `session/`, `security/`) for related functionality with:
    - Multiple implementation files
    - Separate type definitions
    - Co-located tests
    - A barrel export (`index.ts`) for clean imports

Examples of established folder patterns:

- `src/lib/metadata/` – metadata generation helpers with barrel export.
- `src/lib/security/` – CSP, headers, and cache control utilities.
- `src/lib/validation/` – Zod schemas and sanitization:
  - `contact-schema.ts` – contact form validation schema
  - `sanitize.ts` – plain-Node strip/escape utilities (no DOMPurify)
- `src/lib/email/` – email service integration:
  - `send-contact-notification.ts` - Resend SDK integration
  - `templates/contact-notification.ts` - Email HTML templates
- `src/lib/schema/` – shared schema generators (organization, breadcrumb, localBusiness) plus `generateJsonLd`.
- `src/features/blog/schema/` / `src/features/recipes/schema/` – article and recipe JSON-LD generators.
- `src/lib/consent/` – cookie-consent server actions:
  - `actions.ts` – `setConsent('accepted' | 'rejected')`; sets httpOnly `cp_consent` (defined in `constants.ts`).
- `src/lib/analytics/` – consent-gated blog funnel events (`subscribe_*`, `article_scroll_depth`, participation); schema in `specs/blog/tdd.md` §4; operator dashboard = GA4 Explorations (`specs/blog/tdd.md` §8).
- `src/lib/session/` – JWT helpers for future `cp_session` (scaffold; not wired to routes):
  - `server.ts` – `getSession`, `setSession`, `updateSession`, `clearSession`
  - `types.ts`, `index.ts` – types and barrel export
- `src/lib/security/` – security utilities (CSP, headers, caching) with types and tests.

### Cookies

Cookie names live in `src/lib/constants.ts`:

| Cookie       | Constant              | Purpose                       | In use                                                               |
| ------------ | --------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `cp_consent` | `CONSENT_COOKIE_NAME` | Analytics opt-in/out          | Yes — `setConsent` server action; read in site layout                |
| `cp_session` | `SESSION_COOKIE_NAME` | Future public-site auth (JWT) | No — helpers in `lib/session/` only; Payload admin uses Payload auth |

Both cookies are httpOnly and set only on the server.

## Naming Conventions

- **Route segments**:
  - Use **kebab-case** for folder and URL segments (e.g., `the-property`, `slow-roasted-dexter-beef-with-root-vegetables`).
  - Dynamic segments are wrapped in square brackets (e.g., `[post]`, `[recipe]`).

- **Components**:
  - PascalCase file and export names.

- **Hooks**:
  - `useSomething` naming with strong, focused purpose.

- **Tests**:
  - Colocated as `.test.ts` / `.test.tsx` under `src/`.
  - Current coverage: Payload mapping, collection config, recipe duration formatting; expand to API routes and validation per [`principles.md`](principles.md).
  - Run with `pnpm test` from the repo root.

## Import Aliases & Examples

From `apps/site/tsconfig.json`, the primary aliases are:

- `@/*` → `./src/*`
- `@/app/*` → `./src/app/*`
- `@/components/*` → `./src/components/*`
- `@/hooks/*` → `./src/hooks/*`
- `@/providers/*` → `./src/providers/*`
- `@/lib/*` → `./src/lib/*`
- `@/styles/*` → `./src/styles/*`
- `@/types/*` → `./src/types/*`

**Examples:**

```ts
// Importing shared chrome
import { RegenerateSection } from '@/components/sections/regenerate-section';

// Importing a domain feature
import { FeaturedPosts, getBlogPosts } from '@/features/blog';
import { RecipeGrid } from '@/features/recipes';

import { setConsent } from '@/lib/consent/actions';

// Importing a hook
import { useMobile } from '@/hooks/use-mobile';

// Importing a UI primitive
import { Button } from '@/components/ui/button';
```

Prefer these aliases over deep relative paths (e.g. `../../../components/...`).

## Guidelines for Adding New Features

When adding a new feature (page, component, or flow):

1. **Decide where it belongs in the URL space**
   - Is it mainly marketing/storytelling? Place routes under a top-level path like `/regenerate`, `/about`, `/stay`, etc.
   - Is it functional (forms, preferences, profile)? Use more app-like top-level paths (e.g., `/profile`, `/subscribe`, `/stay/enquire`).

2. **Add the route under `src/app/`** — use the appropriate route group, e.g. `(www)/`, `(blog)/`, or `(recipes)/`.
   - Create `page.tsx` for a new page.
   - Keep the page component light; delegate domain UI to `src/features/{domain}/` or shared chrome to `src/components/sections/`.

3. **Create or reuse components**
   - Add domain UI under `src/features/{domain}/components/`.
   - Add shared page chrome to `src/components/sections/`.
   - Reuse primitives and wrappers in `src/components/ui/`.
   - Avoid duplicating patterns already present in `features`, `sections`, `forms`, or `ui`.

4. **Add hooks or utilities if needed**
   - Place new hooks in `src/hooks/` (e.g., `use-experiences-filter.ts`).
   - Place domain queries under `src/features/{domain}/queries/`; keep Payload client/cache/mappers in `src/lib/payload/`.

5. **Add tests (when behaviour is non-trivial)**
   - Prefer tests for API routes and validation logic only (e.g. `route.test.ts` next to `route.ts`).

6. **Update navigation and metadata**
   - If the route should be discoverable, update `apps/site/src/app/navigation.tsx` and any header components.
   - Add or update metadata helpers in `apps/site/src/lib/metadata/` or inline `export const metadata` as per current patterns.

7. **Update docs where relevant**
   - `docs/product/product.md` — user-visible feature or scope change.
   - `docs/architecture/solution.md` — architecture, data model, or integration change (debt only in §10).
   - `docs/architecture/structure.md` — routing or folder convention change.
   - `docs/product/roadmap.md` — delivery phasing change.

## Worked Example: Adding a New “Experiences” Page

Goal: Add `/experiences` as a marketing page that introduces on-farm experiences (present or upcoming).

1. **Create the route**
   - File: `apps/site/src/app/(www)/experiences/page.tsx`

   Basic structure (sketch):

   ```tsx
   import { ExperiencesHero } from '@/components/sections/experiences-hero';
   import { ExperiencesList } from '@/components/sections/experiences-list';

   export default function ExperiencesPage() {
     return (
       <>
         <ExperiencesHero />
         <ExperiencesList />
       </>
     );
   }
   ```

2. **Add supporting components**
   - Files:
     - `apps/site/src/components/sections/experiences-hero.tsx`
     - `apps/site/src/components/sections/experiences-list.tsx`

   Use Tailwind classes and `@/components/ui` components to match existing visual language.

3. **Add content (optional but encouraged)**
   - For blog posts or recipes, create content in Payload admin at `/admin`.
   - For legal or static MDX pages, add files under `apps/site/content/legal/` or route-specific MDX as needed.

4. **Wire navigation and metadata**
   - Update `apps/site/src/app/navigation.tsx` to include an `/experiences` link where appropriate.
   - Add a metadata helper for `/experiences` under `apps/site/src/lib/metadata/` if that pattern exists (or inline `export const metadata` on the page).

5. **Add tests (optional)**
   - e.g. `apps/site/src/app/experiences/page.test.tsx` only if the page has non-trivial logic worth guarding.

6. **Run checks**
   - From the monorepo root:

     ```bash
     pnpm lint
     pnpm test
     pnpm build
     ```

   - All checks should pass before merging or shipping.
