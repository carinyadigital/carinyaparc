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

| Choice                   | Decision                                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interactive UI           | Astro components by default (zero client JS). React islands only for the contact, subscribe, and event-signup forms. `framer-motion` and `@tanstack/react-query` are dropped. |
| Events and registrations | Events become MDX content. Signups post to an external service (MailerLite group or an external `signupTarget` URL); no database, no capacity counting.                       |
| Repo shape               | New `apps/web` built next to `apps/site`; `apps/site` deleted after cut-over.                                                                                                 |
| Content export           | A one-shot export script in `apps/site` (run locally against Neon) writes JSON; a converter turns it into MDX.                                                                |

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

| Route                                              | Source today                                          | Astro target                                          |
| -------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `/`                                                | `(www)/page.tsx` — hard-coded sections + latest posts | `src/pages/index.astro`                               |
| `/about`, `/about/the-property`, `/about/jonathan` | hard-coded TSX                                        | `.astro` pages                                        |
| `/regenerate`                                      | hard-coded TSX                                        | `.astro` page                                         |
| `/contact`                                         | TSX + `ContactFormSection` (client)                   | `.astro` page + React island                          |
| `/subscribe`                                       | TSX + subscribe form                                  | `.astro` page + React island                          |
| `/get-involved/events`                             | Payload `events` + `EventSignup` (client)             | `.astro` page over `events` collection + React island |
| `/legal/[slug]`                                    | MDX in `content/legal/`                               | `legal` collection                                    |
| `/blog`, `/blog/page/[n]`                          | Payload `posts`, 9 per page                           | `paginate()` over `posts` collection                  |
| `/blog/[slug]`                                     | Payload `posts` (Lexical body)                        | `posts` collection entry                              |
| `/blog/category/[slug]`, `/blog/tag/[tag]`         | Payload                                               | derived from frontmatter                              |
| `/recipes`, `/recipes/[slug]`                      | Payload `recipes`                                     | `recipes` collection                                  |
| `/feed.xml`                                        | `features/blog/rss`                                   | `@astrojs/rss`                                        |
| `/sitemap.xml`                                     | `app/sitemap.ts`                                      | `@astrojs/sitemap`                                    |
| `robots.txt`, `site.webmanifest`, favicons, motifs | `public/`                                             | `public/` (unchanged)                                 |
| 404                                                | `not-found.tsx` + `404.jpg`                           | `src/pages/404.astro`                                 |
| `/admin`, `/api/[...slug]`, `/api/graphql`         | Payload                                               | **removed** (404)                                     |

Config to preserve: `trailingSlash: true` → Astro `trailingSlash: 'always'` + `build.format: 'directory'`. Redirect `/favicon.ico` → `/favicon/favicon.ico`.

### 2.2 Public API endpoints

| Endpoint                                        | Does                                                               | Astro target                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `POST /api/contact`                             | Zod → honeypot → timing → in-memory rate limit → sanitise → Resend | on-demand endpoint, same pipeline                                                      |
| `POST /api/subscribe`                           | Zod → MailerLite                                                   | on-demand endpoint                                                                     |
| `POST /api/events/signup`                       | writes `event-registrations` in Payload, sends Resend confirmation | on-demand endpoint → MailerLite group (or removed if `signupTarget` is external)       |
| `POST /api/csp-report`                          | validates and forwards to Sentry                                   | on-demand endpoint                                                                     |
| `GET /api/consent` + `setConsent` server action | httpOnly `cp_consent` cookie                                       | client-set (non-httpOnly) cookie; `ConsentGate` island reads it directly — no endpoint |

Endpoints use `export const prerender = false` with the Vercel adapter; everything else is prerendered.

### 2.3 Content model (Payload collections → collections)

| Collection                                           | Fields                                                                                                                                                                | Target                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `posts`                                              | title, slug, date, author→authors, category→categories, tags→tags[], featured, excerpt, description, image (path), body (Lexical), `_status`                          | `content/posts/{slug}.mdx`; body converted Lexical → Markdown; drafts get `draft: true`         |
| `recipes`                                            | title, slug, date, author, difficulty, servings, prepTime/cookTime/totalTime (ISO 8601), excerpt, description, image, tags, ingredients[{item}], instructions[{step}] | `content/recipes/{slug}.mdx`; ingredients and instructions as frontmatter arrays; body optional |
| `events`                                             | title, slug, startsAt, location, capacity, isFull, signupTarget, description (Lexical)                                                                                | `content/events/{slug}.mdx`; `capacity` dropped                                                 |
| `authors`                                            | name, slug, imageUrl, bio                                                                                                                                             | `content/authors/{slug}.yaml` (`glob()` loader); posts reference by `reference('authors')`      |
| `categories`                                         | name, slug, description                                                                                                                                               | `content/categories/{slug}.yaml`                                                                |
| `tags`                                               | name, slug                                                                                                                                                            | `content/tags.json` (slug → display name); post frontmatter carries tag slugs                   |
| `users`, `event-registrations`, `payload-migrations` | admin/auth, signups                                                                                                                                                   | **not migrated** (registrations exported to CSV for the record)                                 |
| legal (MDX)                                          | frontmatter-less MDX, metadata hard-coded in page                                                                                                                     | `content/legal/*.mdx` with title/description moved into frontmatter                             |

Images: `image`/`imageUrl` are public paths (`/images/*.jpg`, 15 files, 5.6 MB). The converter rewrites them to relative `content/images/*` references so the `image()` schema helper and `<Image>` optimise them at build time (AVIF/WebP, sized). Motifs, favicons and page photography that is not content stay in `apps/web/public/`.

### 2.4 What ports with little change

`lib/metadata/*`, `lib/schema/*` (JSON-LD), `lib/validation/*`, `lib/email/*`, `features/blog/rss/build-feed.ts`, `features/recipes/lib/format-duration.ts`, `lib/security/csp.ts` (as a config generator for `vercel.json`), and `@carinya/theme`. These are pure TypeScript and keep their unit tests. `src/styles/*.css` ports directly.

### 2.5 What is removed

`payload`, `@payloadcms/*`, `next`, `@next/*`, `@sentry/nextjs` (→ `@sentry/astro`), `framer-motion`, `@tanstack/react-query`, `sonner`, `jose` and `lib/session/` (unused scaffold), `graphql`, `sharp` as a direct dep (Astro brings it), `docker-compose.yml`, `src/migrations/`, `payload-types.ts`, `collections/`, `fields/`, `lib/payload/`, `components/rich-text/`, `proxy.ts`, the seed JSON pipeline and its import script (superseded by authoring MDX directly), `content/archive/` (superseded once history is in git as MDX). Env vars removed: `PAYLOAD_SECRET`, `NEON_DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SERVER_URL`; `NEXT_PUBLIC_*` → `PUBLIC_*`.

---

## 3. Target architecture

```text
content/                    # the CMS — repository root, outside apps/, owned by content workflows
├── posts/{slug}.mdx
├── recipes/{slug}.mdx
├── events/{slug}.mdx
├── legal/{slug}.mdx
├── authors/{slug}.yaml
├── categories/{slug}.yaml
├── tags.json               # slug → display name
└── images/                 # hero images referenced from frontmatter; optimised at build

apps/web (Astro 6)
├── astro.config.mjs        # mdx, react, sitemap, vercel adapter; trailingSlash 'always'
├── vercel.json             # security headers + CSP (generated from lib/security), redirects
├── src/
│   ├── content.config.ts   # collections point at ../../content via the glob loader
│   ├── layouts/            # Base.astro (html shell, head, fonts, consent island), Site.astro (header/footer)
│   ├── components/         # .astro chrome, sections, cards, ui; islands/ for the three React forms
│   ├── pages/              # routes mirror §2.1; pages/api/* are prerender=false endpoints
│   ├── lib/                # metadata, schema, validation, email, security, analytics (ported)
│   └── styles/             # globals.css importing @carinya/theme
└── tests/                  # vitest (unit) + build-output assertions on dist/
```

MDX is for content people write — posts, recipes, events, legal — plus the small YAML/JSON data around it. Every page, layout and section is an `.astro` component, and marketing copy stays in components as it does today. Keeping `content/` at the repository root means content authors and agents never touch `apps/`, and branch protection or CODEOWNERS can be scoped by path.

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
image: ../images/highland-cattle-dam.jpg
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

- `apps/site/scripts/export-payload.ts` (`pnpm --filter site export:payload`) uses the Payload local API with access control bypassed and writes `apps/site/content-export/` (gitignored — it holds drafts and registrant email addresses): one JSON file per collection with relationships resolved to slugs, rich text exported both as Lexical JSON and as Markdown via `convertLexicalToMarkdown`, a `manifest.json` with counts and the published slug list per collection, and `markdown/` side files for reading the conversion. Run once locally with `NEON_DATABASE_URL` and `PAYLOAD_SECRET` in `.env.local`.
- Production baseline captured by hand (the production firewall answers scripted requests with 429) and committed to `docs/architecture/astro-migration/baseline/`: `urls.json` (the 80 sitemap paths plus non-sitemap routes and known-broken URLs), `metadata.json` (observed `<head>` and JSON-LD facts for representative URLs), `sitemap.xml`, and a `README.md` with findings.
- Content decision: all ten posts and four recipes are imported as MDX in their current published state, so URLs and search presence carry over unchanged; editorial rewrites happen afterwards by PR.
- Content freeze from the export date is declared in `apps/site/content/seeds/README.md`; anything authored in `/admin` afterwards is picked up by re-running the export at cut-over.
- Lighthouse for `/`, `/blog/`, one post, one recipe is captured by hand from the Vercel or PageSpeed report and saved alongside the baseline.
- Exit: export and baseline captured locally; `manifest.json` counts noted in the Phase 2 PR description.

### Phase 1 — Scaffold `apps/web`

- `pnpm create astro` into `apps/web`; add `@astrojs/mdx`, `@astrojs/react`, `@astrojs/sitemap`, `@astrojs/vercel`, `@astrojs/rss`, `@tailwindcss/vite`, fontsource packages, `@sentry/astro`.
- `content.config.ts` with the six collections and schemas from §2.3.
- `Base.astro` / `Site.astro` layouts; header, footer, navigation config; `globals.css`.
- Port `lib/metadata`, `lib/schema`, `lib/validation`, `lib/security`, `lib/email`, `format-duration`, `build-feed` with their tests; Vitest configured through `getViteConfig()`.
- Turbo: add `apps/web` build/lint/typecheck/test; CI now runs `pnpm build` for `apps/web` (no secrets needed).
- Exit: empty site builds and deploys as a Vercel preview with header/footer and 404.

### Phase 2 — Content migration

- `apps/site/scripts/convert-export.ts` (`pnpm --filter site convert:export`) turns `content-export/` into the collections under the repository-root `content/`: authors and categories as YAML, posts and recipes as MDX with frontmatter matching `content.config.ts` (ingredients and instructions as structured arrays), legal pages copied from `apps/site/content/legal/` with title and description frontmatter, `content/tags.json` as the slug → display-name lookup, and the referenced hero images copied to `content/images/` with `image` rewritten to a relative path so Astro optimises them. The published version of each document is used; documents that exist only as drafts get `draft: true`, and unpublished edits on top of a published document are reported rather than written.
- Body fidelity: the Markdown from `convertLexicalToMarkdown` needed one repair — the archive-era posts carried literal asterisks that Payload had escaped as `\*…\*`, restored to real emphasis by the converter. No body contains `<` or `{`, so nothing needed MDX escaping.
- `imageAlt` is a placeholder derived from the filename (for example "Highland cattle dam"); replace with real descriptions by PR.
- Verified: all six collections load under `astro build` with images and author references resolved, and every post and legal page renders through MDX (10 posts, 4 recipes, 1 author, 5 categories, 2 legal, 0 events).
- Exit: content committed under `content/`; every published slug from the baseline exists as an entry.

### Phase 3 — Pages

- Every public route is an `.astro` page under `apps/web/src/pages/`, with copy carried over verbatim: home, about (three pages), regenerate, contact, subscribe, events, blog (index, `/blog/page/[n]/`, post, category, tag), recipes (index, detail), legal, 404, `/feed.xml`, and the generated sitemap. Marketing copy lives in the page and section components; only content comes from `content/`.
- Shared primitives in `src/components/`: `ui/` (Button, Eyebrow, MotifTile, Breadcrumb, JsonLd), `sections/` (Hero with CSS-keyframe drift replacing framer-motion, HeroText, ImpactStats, PageHeader, PageIntro), `blog/` (PostCard, LatestPosts, FeaturedPosts, PaginatedPosts, RelatedPosts, AuthorBlock, ShareBar, EndOfPostSubscribe…), `marketing/` (sections, event cards, static forms), `recipes/`. Content queries live in `src/lib/content/` (posts, recipes, events, dates) so draft filtering, sorting and card shapes stay in one place.
- Forms are plain HTML posting to `/api/contact/`, `/api/subscribe/` and `/api/events/signup/`, marked `data-form="…"` for the Phase 4 islands; the honeypot field and all labels are unchanged.
- Archive pages are generated only for categories and tags with at least one published post, so 15 of the 80 production URLs (four empty categories and eleven recipe-only tag pages) are dropped deliberately and recorded under `intentionallyRemoved` in the baseline. `/legal/*` and `/blog/page/2/` now build (broken in production). Titles carry the site suffix once. `googlebot` meta and `/sitemap.xml` → `/sitemap-index.xml` redirect added.
- `apps/web/tests/parity.test.ts` (`pnpm --filter web test:parity`, after `astro build`) checks `dist/` against the baseline: every production URL still built except the recorded removals, removals absent from the sitemap, the broken routes fixed, representative pages' title/description/canonical/og:type/robots/JSON-LD types unchanged, the common `<head>` set on every page, and one trailing-slash canonical per page.
- Not carried over: the mid-article inline subscribe form (the Lexical body was split at its midpoint; MDX cannot be split — candidate for an MDX component in Phase 4), ShareBar copy-link/native share (needs JS), scroll-depth analytics (Phase 4), the home header's transparent-until-scrolled behaviour (Phase 4), and `article:published_time`/`article:author` OG tags.
- Exit: 70 pages build; `astro check`, the unit suite (89 tests) and the parity test pass.

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

- **URL parity**: every path in `docs/architecture/astro-migration/baseline/urls.json` returns 200 in `dist/`, except the intentionally removed empty archives (which must 404 and be absent from the generated sitemap) and the documented production fixes (`/legal/*`, `/blog/page/2/`) which must now be 200.
- **Metadata parity**: for the representative URLs in `baseline/metadata.json`, `description`, `canonical`, `og:type`, `robots` and the set of JSON-LD `@type`s match, `title` matches after normalising production's doubled site suffix, and every page emits the common `<head>` set recorded there.
- **Content parity**: each post's rendered text (whitespace-normalised) contains the same headings as the Lexical source; recipes have the same ingredient and step counts.
- **Forms**: contact, subscribe, event signup succeed on preview against real Resend/MailerLite sandboxes.
- **Quality gates**: `pnpm lint`, `typecheck`, `format:check`, `test`, `build` green in CI for `apps/web`.
- **Performance**: Lighthouse performance and accessibility not lower than baseline on the four sampled pages.

---

## 6. Risks

| Risk                                                                 | Mitigation                                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Lexical → Markdown loses formatting (links, lists, embedded uploads) | Export both Lexical and Markdown; manual read-through per post; fix in MDX. Content volume is small. |
| SEO regression from URL or metadata drift                            | Baseline diff test in CI; trailing-slash config; canonical unchanged; sitemap resubmitted.           |
| Content edited in `/admin` after export                              | Declared freeze; re-export at cut-over is one command.                                               |
| Events list goes stale between deploys                               | Content merges redeploy; add a weekly scheduled deploy hook if needed.                               |
| Form abuse without shared rate limiting                              | Honeypot + timing carried over; Vercel WAF rule at cut-over (better than today's per-instance map).  |
| Editors lose the browser UI                                          | PR-based workflow with Vercel previews (§8); optional git-backed editor later.                       |
| Consent cookie is no longer httpOnly                                 | Consent state is not sensitive; documented as an accepted change in the ADR.                         |

---

## 7. Open decisions (recommended default in bold)

1. Event signups: **MailerLite group per event** (`events/signup` endpoint adds the subscriber to a group named by event slug) vs. always using an external `signupTarget` URL and removing the endpoint.
2. Tag display names: **derive from `tags.json` exported once**, or just title-case slugs and delete the file.
3. Recipes body: **keep an optional MDX body for an intro/notes**, ingredients and steps stay structured in frontmatter.
4. Fonts: **fontsource self-hosting** vs. Astro's fonts API.
5. Whether to keep `NEXT_PUBLIC_GTM_ID`-driven GTM at all alongside Vercel Analytics — **keep**, behaviour unchanged.

---

## 8. Editorial workflow after migration

- Authoring: agents (content-writer) and humans write MDX under `content/` in a branch and open a PR. Schema validation and build run in CI; the Vercel preview URL is the draft preview (replaces Payload's `preview` and `_status: draft`).
- Review: `content-seo-review` and a human reviewer on the PR. Branch protection on `main` requires a human approval — this is the "agent stages, human publishes" gate, enforced by GitHub rather than by Payload access control.
- Publish: merge to `main` deploys. `draft: true` keeps an entry out of the build if it must live on `main` unpublished.
- Roadmap consequences: Phase 1 items "on-demand revalidation", "media library", "site globals", and "scoped rich-text" are closed as not needed; "SEO controls per document" is delivered by frontmatter; "Stay information" and CI-runs-build carry forward. Phase 2 "production admin verified under CSP" is closed; shared rate limiting moves to the WAF rule.
