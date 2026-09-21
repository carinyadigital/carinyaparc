---
type: Migration plan
scope: carinyaparc-website
version: '0.1'
owner: engineering
status: Draft
last_updated: 2026-09-21
related:
  - docs/architecture/solution.md
  - docs/architecture/structure.md
  - docs/product/roadmap.md
---

# Migration — Next.js + Payload to Astro + MDX

**Decision:** replace `apps/site` (Next.js 16 + Payload CMS 3 on Neon Postgres) with a new `apps/web` (Astro 6 + MDX content collections), built alongside the current app, verified for route-for-route parity against production, then cut over on Vercel. Content moves from Postgres into git as MDX; publishing becomes "merge to `main`". The database, the admin UI, and every runtime dependency on Payload are removed.

Settled choices for this migration:

| Choice | Decision |
| --- | --- |
| Interactive UI | Astro components by default (zero client JS). React islands only for the contact, subscribe, and event-signup forms. `framer-motion` and `@tanstack/react-query` are dropped. |
| Events and registrations | Events become MDX content. Signups post to an external service (MailerLite group or an external `signupTarget` URL); no database, no capacity counting. |
| Repo shape | New `apps/web` built next to `apps/site`; `apps/site` deleted after cut-over. |
| Content export | A one-shot export script in `apps/site` (run locally against Neon) writes JSON; a converter turns it into MDX. |

---

## 1. Why

The site is a content site with one editor and a handful of forms, and the content pipeline is already git-first: agents author seed JSON in PRs, humans merge, then a script imports into Payload as drafts for a second human review in `/admin`. The CMS is a second copy of a workflow git already provides, and it carries the operational cost that has generated most recent incidents and debt:

- Production builds and CI require a live Postgres connection (`generateStaticParams` queries Neon), so CI cannot run `pnpm build` today.
- Neon cold starts surfaced as production errors (WEBSITE-R connection timeouts); the fix was a 30 s timeout.
- The public CSP had to be weakened to `'unsafe-inline'` because the static shell cannot nonce Next.js flight scripts, and the Payload admin under production CSP is an unverified risk.
- Revalidation hooks, `unstable_cache` tags, ISR fallbacks, and mapper layers exist only to keep static pages in sync with a database.
- Every content type still stores images as text paths; the media library was never built.

Astro with MDX removes all of that. Content is files, builds are hermetic, previews are Vercel preview deployments of the PR, and the "agent stages, human publishes" gate becomes PR review — enforced by branch protection rather than by CMS access control. The trade-off accepted is the loss of a browser editing UI; see §8 for the editorial workflow that replaces it.

---

## 2. What exists today (inventory)

### 2.1 Public routes

| Route | Source today | Astro target |
| --- | --- | --- |
| `/` | `(www)/page.tsx` — hard-coded sections + latest posts | `src/pages/index.astro` |
| `/about`, `/about/the-property`, `/about/jonathan` | hard-coded TSX | `.astro` pages |
| `/regenerate` | hard-coded TSX | `.astro` page |
| `/contact` | TSX + `ContactFormSection` (client) | `.astro` page + React island |
| `/subscribe` | TSX + subscribe form | `.astro` page + React island |
| `/get-involved/events` | Payload `events` + `EventSignup` (client) | `.astro` page over `events` collection + React island |
| `/legal/[slug]` | MDX in `content/legal/` | `legal` collection |
| `/blog`, `/blog/page/[n]` | Payload `posts`, 9 per page | `paginate()` over `posts` collection |
| `/blog/[slug]` | Payload `posts` (Lexical body) | `posts` collection entry |
| `/blog/category/[slug]`, `/blog/tag/[tag]` | Payload | derived from frontmatter |
| `/recipes`, `/recipes/[slug]` | Payload `recipes` | `recipes` collection |
| `/feed.xml` | `features/blog/rss` | `@astrojs/rss` |
| `/sitemap.xml` | `app/sitemap.ts` | `@astrojs/sitemap` |
| `robots.txt`, `site.webmanifest`, favicons, motifs | `public/` | `public/` (unchanged) |
| 404 | `not-found.tsx` + `404.jpg` | `src/pages/404.astro` |
| `/admin`, `/api/[...slug]`, `/api/graphql` | Payload | **removed** (404) |

Config to preserve: `trailingSlash: true` → Astro `trailingSlash: 'always'` + `build.format: 'directory'`. Redirect `/favicon.ico` → `/favicon/favicon.ico`.

### 2.2 Public API endpoints

| Endpoint | Does | Astro target |
| --- | --- | --- |
| `POST /api/contact` | Zod → honeypot → timing → in-memory rate limit → sanitise → Resend | on-demand endpoint, same pipeline |
| `POST /api/subscribe` | Zod → MailerLite | on-demand endpoint |
| `POST /api/events/signup` | writes `event-registrations` in Payload, sends Resend confirmation | on-demand endpoint → MailerLite group (or removed if `signupTarget` is external) |
| `POST /api/csp-report` | validates and forwards to Sentry | on-demand endpoint |
| `GET /api/consent` + `setConsent` server action | httpOnly `cp_consent` cookie | client-set (non-httpOnly) cookie; `ConsentGate` island reads it directly — no endpoint |

Endpoints use `export const prerender = false` with the Vercel adapter; everything else is prerendered.

### 2.3 Content model (Payload collections → collections)

| Collection | Fields | Target |
| --- | --- | --- |
| `posts` | title, slug, date, author→authors, category→categories, tags→tags[], featured, excerpt, description, image (path), body (Lexical), `_status` | `src/content/posts/{slug}.mdx`; body converted Lexical → Markdown; drafts get `draft: true` |
| `recipes` | title, slug, date, author, difficulty, servings, prepTime/cookTime/totalTime (ISO 8601), excerpt, description, image, tags, ingredients[{item}], instructions[{step}] | `src/content/recipes/{slug}.mdx`; ingredients and instructions as frontmatter arrays; body optional |
| `events` | title, slug, startsAt, location, capacity, isFull, signupTarget, description (Lexical) | `src/content/events/{slug}.mdx`; `capacity` dropped |
| `authors` | name, slug, imageUrl, bio | `src/content/authors/{slug}.yaml` (`file()`/`glob()` loader); posts reference by `reference('authors')` |
| `categories` | name, slug, description | `src/content/categories/{slug}.yaml` |
| `tags` | name, slug | `src/data/tags.json` (slug → display name); post frontmatter carries tag slugs |
| `users`, `event-registrations`, `payload-migrations` | admin/auth, signups | **not migrated** (registrations exported to CSV for the record) |
| legal (MDX) | frontmatter-less MDX, metadata hard-coded in page | `src/content/legal/*.mdx` with title/description moved into frontmatter |

Images: `image`/`imageUrl` are public paths (`/images/*.jpg`, 15 files, 5.6 MB). The converter rewrites them to relative `src/assets/images/*` references so the `image()` schema helper and `<Image>` optimise them at build time (AVIF/WebP, sized). Motifs and favicons stay in `public/`.

### 2.4 What ports with little change

`lib/metadata/*`, `lib/schema/*` (JSON-LD), `lib/validation/*`, `lib/email/*`, `features/blog/rss/build-feed.ts`, `features/recipes/lib/format-duration.ts`, `lib/security/csp.ts` (as a config generator for `vercel.json`), and `@carinya/theme`. These are pure TypeScript and keep their unit tests. `src/styles/*.css` ports directly.

### 2.5 What is removed

`payload`, `@payloadcms/*`, `next`, `@next/*`, `@sentry/nextjs` (→ `@sentry/astro`), `framer-motion`, `@tanstack/react-query`, `sonner`, `jose` and `lib/session/` (unused scaffold), `graphql`, `sharp` as a direct dep (Astro brings it), `docker-compose.yml`, `src/migrations/`, `payload-types.ts`, `collections/`, `fields/`, `lib/payload/`, `components/rich-text/`, `proxy.ts`, the seed JSON pipeline and its import script (superseded by authoring MDX directly), `content/archive/` (superseded once history is in git as MDX). Env vars removed: `PAYLOAD_SECRET`, `NEON_DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SERVER_URL`; `NEXT_PUBLIC_*` → `PUBLIC_*`.

---

## 3. Target architecture

```text
apps/web (Astro 6)
├── astro.config.mjs        # mdx, react, sitemap, vercel adapter; trailingSlash 'always'
├── vercel.json             # security headers + CSP (generated from lib/security), redirects
├── src/
│   ├── content.config.ts   # posts, recipes, events, authors, categories, legal
│   ├── content/            # MDX + YAML — the CMS
│   ├── assets/images/      # optimised at build
│   ├── layouts/            # Base.astro (html shell, head, fonts, consent island), Site.astro (header/footer)
│   ├── components/         # .astro chrome, sections, cards, ui; islands/ for the three React forms
│   ├── pages/              # routes mirror §2.1; pages/api/* are prerender=false endpoints
│   ├── lib/                # metadata, schema, validation, email, security, analytics (ported)
│   └── styles/             # globals.css importing @carinya/theme
└── tests/                  # vitest (unit) + build-output assertions on dist/
```

Rendering: `output: 'static'` with `@astrojs/vercel` so only `pages/api/*` become serverless functions. No middleware on public pages (they are CDN-served HTML); security headers come from `vercel.json`. CSP policy is unchanged in shape (host allowlist + `'unsafe-inline'` for scripts) — Astro inlines small scripts and cannot nonce prerendered pages either; `build.inlineStylesheets: 'auto'` is kept to the default and the style-src allowlist accommodates it.

Styling: Tailwind 4 via `@tailwindcss/vite`; `@import '@carinya/theme'` and `@plugin '@tailwindcss/typography'` as today. Fonts: self-hosted via `@fontsource-variable/hanken-grotesk` and `@fontsource/marcellus` (replacing `next/font`), exposing the same `--font-hanken` / `--font-marcellus` variables so the theme is untouched.

Islands: `ContactForm`, `SubscribeForm` (modal, inline, end-of-post variants), `EventSignup` in React with `client:visible`/`client:idle`, using `react-hook-form` + Zod as today but `fetch` instead of react-query. Mobile menu, scroll-depth tracking, and share bar become small `<script>` blocks. The consent gate becomes a tiny island that reads the cookie and injects GTM/Vercel Analytics.

Observability: `@sentry/astro` (client + server), `@vercel/analytics` and `@vercel/speed-insights` via their framework-agnostic inject scripts, gated by consent as now.

Content authoring contract (what agents and humans write):

```mdx
---
title: Midwinter Pasture: Reading the Land at The Branch
date: 2026-07-14
author: jonno
category: field-reports
tags: [pasture, winter, regenerative-agriculture]
featured: false
excerpt: >-
  Lush green pasture in midwinter...
description: Midwinter pasture recovery at Carinya Parc — ...
image: ../../assets/images/highland-cattle-dam.jpg
imageAlt: Highland cattle beside the dam in winter light
draft: false
---
## Green grass in winter
...
```

The Zod schema in `content.config.ts` is the new "collection config": required fields, max lengths, ISO duration regex, `reference()` for author/category, `image()` for hero. Validation runs on every build and in CI, which replaces both `import:content-seeds:validate` and Payload's field validation.

---

## 4. Phases

Each phase ends with a PR to `main`; `apps/site` keeps deploying to production until Phase 7.

### Phase 0 — Freeze and baseline

- Add `apps/site/scripts/export-payload.ts` (uses Payload local API; run once locally with `NEON_DATABASE_URL`) writing `content-export/{posts,recipes,events,authors,categories,tags,event-registrations}.json` including drafts and `_status`. Bodies exported both as Lexical JSON and as Markdown via `convertLexicalToMarkdown`.
- Declare a content freeze in `/admin` from the export date; anything authored after must be re-exported.
- Capture production baseline: full URL list from `/sitemap.xml`, per-URL `<title>`, meta description, canonical, JSON-LD, and status codes; Lighthouse for `/`, `/blog/`, one post, one recipe. Stored under `apps/web/tests/baseline/`.
- Exit: export files committed (or attached to the PR), baseline captured.

### Phase 1 — Scaffold `apps/web`

- `pnpm create astro` into `apps/web`; add `@astrojs/mdx`, `@astrojs/react`, `@astrojs/sitemap`, `@astrojs/vercel`, `@astrojs/rss`, `@tailwindcss/vite`, fontsource packages, `@sentry/astro`.
- `content.config.ts` with the six collections and schemas from §2.3.
- `Base.astro` / `Site.astro` layouts; header, footer, navigation config; `globals.css`.
- Port `lib/metadata`, `lib/schema`, `lib/validation`, `lib/security`, `lib/email`, `format-duration`, `build-feed` with their tests; Vitest configured through `getViteConfig()`.
- Turbo: add `apps/web` build/lint/typecheck/test; CI now runs `pnpm build` for `apps/web` (no secrets needed).
- Exit: empty site builds and deploys as a Vercel preview with header/footer and 404.

### Phase 2 — Content migration

- `apps/web/scripts/convert-export.ts`: JSON → MDX/YAML per §2.3. Rewrites image paths, maps author/category IDs to slugs, converts ISO dates, marks Payload drafts `draft: true`, and writes `tags.json`.
- Re-check the converted Markdown against the Lexical source for every post (small set — manual read-through is feasible). Fix by hand in the MDX, not the converter, once it is right for the common cases.
- Move `content/legal/*.mdx` into the `legal` collection with frontmatter.
- Move `public/images/*` to `src/assets/images/` (keep `404.jpg`, placeholders in `public/`).
- Exit: `astro check` and `astro build` pass with all content; every published slug from the baseline URL list exists as an entry.

### Phase 3 — Pages

- Marketing pages: `index`, `about/*`, `regenerate`, `contact`, `subscribe` — port JSX sections to `.astro`, copy unchanged. Hero, ImpactStats, MotifTile, SectionWithImage, PageHeader, cards, badges, buttons become `.astro` components.
- Blog: index with `paginate()` (9 per page), post page with article JSON-LD, breadcrumb, author block, related posts, end-of-post subscribe island; category and tag archives (published-only, non-empty only); RSS; sitemap.
- Recipes: index grid, detail with Recipe JSON-LD, ingredients and method from frontmatter.
- Events: upcoming-events listing from the collection (`startsAt >= now` at build time; note that this means the list is only as fresh as the last deploy — a scheduled weekly redeploy or the natural cadence of content merges covers it).
- Legal, 404.
- Exit: every URL in the baseline list renders; `title`, description, canonical, and JSON-LD `@type` match the baseline (automated diff test).

### Phase 4 — Interactivity and endpoints

- React islands: `ContactForm`, `SubscribeForm` variants, `EventSignup`. Toasts replaced with inline status.
- Endpoints under `src/pages/api/`: `contact`, `subscribe`, `csp-report`, `events/signup`. Same Zod schemas, honeypot, timing check, sanitisation. Rate limiting: the in-memory map is carried over as-is for now (it was per-instance before too); the durable fix is a Vercel WAF rate-limit rule on `/api/*`, configured at cut-over.
- Consent: client-side cookie + `ConsentGate` island; GTM and Vercel Analytics load only after consent.
- Mobile menu, share bar, scroll-depth as inline scripts.
- Exit: all four forms submit successfully on a preview deployment; consent gating verified in the network panel.

### Phase 5 — Security, SEO, and performance parity

- `vercel.json` headers generated from `lib/security` (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP with the existing allowlist minus Next-specific hosts). CSP report-only first on preview, enforced at cut-over.
- Redirects: `/favicon.ico`; `/admin` and `/api/graphql*` → 404 (or 410); trailing-slash normalisation.
- Lighthouse and Core Web Vitals on preview vs baseline; image sizes and `loading`/`fetchpriority` on heroes.
- Link check across `dist/` (no dangling internal links, all images resolve).
- Exit: no P1 findings; CSP report-only shows no violations from the site's own pages.

### Phase 6 — Docs and cleanup (pre-cut-over)

- Rewrite `AGENTS.md`, `docs/architecture/structure.md`, `solution.md` (§3 strategy, §4 blocks, §5 runtime, §6 data model, §7.4 caching, §8 build, §10 debt), and `docs/product/roadmap.md` (Phase 1 CMS items become moot; see §8).
- ADRs: `docs/decisions/ADR-0001-astro-mdx-replaces-payload.md` (this decision, with the rejected alternatives), `ADR-0002-git-is-the-publish-gate.md`.
- Update `skills/carinya-parc` and any agent instructions that reference seeds or `/admin`.
- Exit: docs describe `apps/web` as the product; no doc still instructs someone to run Payload.

### Phase 7 — Cut-over

1. Final content re-export and convert if anything changed in `/admin` after the freeze; export `event-registrations` to CSV for the record.
2. Vercel: point the project's root directory at `apps/web`, prune env vars (§2.5), enable CSP enforcement, add WAF rate-limit rule on `/api/*`.
3. Deploy; verify the baseline URL list returns 200 with trailing slashes; submit sitemap in Search Console; watch Sentry and Vercel logs for 48 hours.
4. Follow-up PR: delete `apps/site`, Payload/Next dependencies, `docker-compose.yml`, seed pipeline, `content/archive/`; drop the Neon database once registrations CSV is confirmed saved.

Rollback at any point before step 4 is "set the Vercel root directory back to `apps/site`".

---

## 5. Verification (what "parity" means)

- **URL parity**: every URL from the production sitemap and the baseline crawl returns 200 in `dist/` (test reads `tests/baseline/urls.json`).
- **Metadata parity**: `<title>`, `meta[name=description]`, `link[rel=canonical]`, OG image, and JSON-LD `@type` per URL equal the baseline, with a documented allow-list of intentional changes.
- **Content parity**: each post's rendered text (whitespace-normalised) contains the same headings as the Lexical source; recipes have the same ingredient and step counts.
- **Forms**: contact, subscribe, event signup succeed on preview against real Resend/MailerLite sandboxes.
- **Quality gates**: `pnpm lint`, `typecheck`, `format:check`, `test`, `build` green in CI for `apps/web`.
- **Performance**: Lighthouse performance and accessibility not lower than baseline on the four sampled pages.

---

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Lexical → Markdown loses formatting (links, lists, embedded uploads) | Export both Lexical and Markdown; manual read-through per post; fix in MDX. Content volume is small. |
| SEO regression from URL or metadata drift | Baseline diff test in CI; trailing-slash config; canonical unchanged; sitemap resubmitted. |
| Content edited in `/admin` after export | Declared freeze; re-export at cut-over is one command. |
| Events list goes stale between deploys | Content merges redeploy; add a weekly scheduled deploy hook if needed. |
| Form abuse without shared rate limiting | Honeypot + timing carried over; Vercel WAF rule at cut-over (better than today's per-instance map). |
| Editors lose the browser UI | PR-based workflow with Vercel previews (§8); optional git-backed editor later. |
| Consent cookie is no longer httpOnly | Consent state is not sensitive; documented as an accepted change in the ADR. |

---

## 7. Open decisions (recommended default in bold)

1. Event signups: **MailerLite group per event** (`events/signup` endpoint adds the subscriber to a group named by event slug) vs. always using an external `signupTarget` URL and removing the endpoint.
2. Tag display names: **derive from `tags.json` exported once**, or just title-case slugs and delete the file.
3. Recipes body: **keep an optional MDX body for an intro/notes**, ingredients and steps stay structured in frontmatter.
4. Fonts: **fontsource self-hosting** vs. Astro's fonts API.
5. Whether to keep `NEXT_PUBLIC_GTM_ID`-driven GTM at all alongside Vercel Analytics — **keep**, behaviour unchanged.

---

## 8. Editorial workflow after migration

- Authoring: agents (content-writer) and humans write MDX under `apps/web/src/content/` in a branch and open a PR. Schema validation and build run in CI; the Vercel preview URL is the draft preview (replaces Payload's `preview` and `_status: draft`).
- Review: `content-seo-review` and a human reviewer on the PR. Branch protection on `main` requires a human approval — this is the "agent stages, human publishes" gate, enforced by GitHub rather than by Payload access control.
- Publish: merge to `main` deploys. `draft: true` keeps an entry out of the build if it must live on `main` unpublished.
- Roadmap consequences: Phase 1 items "on-demand revalidation", "media library", "site globals", and "scoped rich-text" are closed as not needed; "SEO controls per document" is delivered by frontmatter; "Stay information" and CI-runs-build carry forward. Phase 2 "production admin verified under CSP" is closed; shared rate limiting moves to the WAF rule.
