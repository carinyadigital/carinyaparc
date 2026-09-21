---
type: Tasks
epic: site
epic_id: SITE
version: '0.3'
owner: site
status: In progress
last_updated: 2026-08-13
related:
  - specs/site/tdd.md
  - docs/ARCHITECTURE.md
  - docs/product/roadmap.md
---

# Tasks — Site hardening (SITE)

Remaining open hardening items. Task IDs are stable (never reused). Closed items
are listed in §6 only so they are not re-opened here.

## 1. Summary

- **Epic.** SITE — Site hardening
- **Phase.** Mostly Phase 2 (production hardening); a few items are Phase 1 woven
  work (CI build) or Phase 4 polish (skip nav, dynamic OG).
- **Priority.** P0–P4
- **Estimate.** 54 points across 24 remaining tasks

**Out of this list (do not add back):** on-site search (product non-goal);
chronological prev/next on posts (superseded by related posts); recipe index
filtering (catalogue is too small); a standalone recipes epic (nav + error
boundary live here as SITE-16 / SITE-08).

## 2. Conventions

| Convention | Value                        |
| ---------- | ---------------------------- |
| Task ID    | `SITE-{nn}` — never reused   |
| Priority   | P0 (blocking) → P4 (cleanup) |
| Acceptance | Gherkin required per task    |
| Checkbox   | `[ ]` open · `[x]` done      |

## 3. Prioritised checklist

Work top-to-bottom within each tier unless a dependency blocks progress.

### P0 — Quality gates and correctness

- [ ] **[SITE-01] Draft exclusion integration test**
  - **Status:** Open | **Priority:** P0 | **Estimate:** 3
  - **Depends on:** —
  - **Deliverable:** Vitest (or Payload local API test) that creates a post/recipe with `_status: 'draft'` and asserts it is absent from `getBlogPosts`, `getBlogPostBySlug`, `getBlogPostSlugs`, `getPostSitemapEntries`, and recipe equivalents. Contract tests already assert `overrideAccess: false`; this task is the create-and-assert gap.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Draft post never appears in public listings
      Given a draft post exists in Payload with a unique slug
      When getBlogPosts and getBlogPostSlugs are called
      Then the draft slug is not present in the results

    Scenario: Draft post returns null from slug lookup
      Given a draft post exists in Payload with slug "draft-only-post"
      When getBlogPostBySlug("draft-only-post") is called
      Then the result is null

    Scenario: Draft post is excluded from sitemap entries
      Given a draft post exists in Payload
      When getPostSitemapEntries is called
      Then no entry URL contains the draft slug
    ```

- [ ] **[SITE-02] Add production build to CI**
  - **Status:** Open | **Priority:** P0 | **Estimate:** 3
  - **Overlaps:** Phase 1 roadmap CI gate; `ARCHITECTURE.md` §10.2
  - **Depends on:** —
  - **Deliverable:** `.github/workflows/ci.yml` job runs `pnpm build` (or `pnpm site:build`) when DB/build secrets are available; document required secrets in workflow comments or `AGENTS.md`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: CI runs a production build on pull requests
      Given a pull request targets main
      When the CI workflow completes
      Then a build step runs pnpm build or pnpm site:build
      And the job fails if the build fails
    ```

### P1 — Security, accessibility, and broken user paths

- [ ] **[SITE-03] Harden subscribe API error responses**
  - **Status:** Open | **Priority:** P1 | **Estimate:** 2
  - **Depends on:** —
  - **Deliverable:** `api/subscribe/route.ts` returns generic public messages on misconfiguration and MailerLite failures; detailed errors logged server-side / Sentry only. Today a missing key still mentions `.env.local` and `MAILERLITE_API_KEY`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Missing API key does not leak setup instructions
      Given MAILERLITE_API_KEY is unset
      When POST /api/subscribe is called with valid input
      Then the response body does not mention .env.local or MAILERLITE_API_KEY
      And the status is 503 or 500 with a generic error message

    Scenario: MailerLite failure returns a generic message
      Given MailerLite returns a 422 or 401 response
      When POST /api/subscribe is called
      Then the response body does not echo MailerLite error payloads verbatim
    ```

- [ ] **[SITE-04] Wire Resend AbortSignal timeout**
  - **Status:** Open | **Priority:** P1 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** `send-contact-notification.ts` passes `controller.signal` to the Resend SDK call (or equivalent fetch) so the 10 s timeout aborts in-flight requests.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Resend send honours the abort signal
      Given send-contact-notification is invoked
      When the Resend client call is inspected
      Then the abort signal from AbortController is passed to the network call
    ```

- [ ] **[SITE-05] Fix remaining broken and placeholder internal links**
  - **Status:** Open | **Priority:** P1 | **Estimate:** 2
  - **Depends on:** SITE-06
  - **Deliverable:** Homepage "Join the journey" / Experience CTAs currently target `/#stay` but no element has `id="stay"` (the Experience section is `id="visit"`). Point them at a real route (`/subscribe`, `/get-involved/events/`, or `/#visit`) or remove until Stay pages exist. Hidden nav items still use `href: '#'` — leave hidden or give real hrefs before making them visible.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: No placeholder hash links on homepage primary CTAs
      Given the home page source is read
      When primary hero and Experience CTAs are listed
      Then none use href="#"
      And none target a fragment that does not exist on the page
    ```

- [ ] **[SITE-06] Extend internal-link regression test coverage**
  - **Status:** Open | **Priority:** P1 | **Estimate:** 2
  - **Depends on:** —
  - **Deliverable:** `internal-links.test.ts` also scans `href: '...'` / `href: "..."` in object literals and arrays (e.g. `navigation.tsx`). JSX `href="..."` is already covered.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Data-array hrefs are validated against static routes
      Given navigation defines an item as { href: "/missing-path" }
      When internal-links.test.ts runs
      Then the test fails with the broken href and file path
    ```

### P2 — Trust, SEO, API hardening, and editor safety

- [ ] **[SITE-07] Shared rate limiting on contact and subscribe**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 5
  - **Overlaps:** Phase 2 roadmap; `ARCHITECTURE.md` §10.2
  - **Depends on:** —
  - **Deliverable:** Replace per-instance in-memory limits with a shared store (Vercel KV / Upstash or equivalent) keyed by first-hop `x-forwarded-for` **and** normalised email. Do not treat a tighter in-memory limiter as done.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Rate limit applies per IP independent of email
      Given two submissions from the same IP with different email addresses
      When the configured per-IP limit is exceeded
      Then the second submission receives 429

    Scenario: Rate limit applies per email independent of IP
      Given two submissions with the same email from different x-forwarded-for values
      When the configured per-email limit is exceeded
      Then the second submission receives 429

    Scenario: Limit holds across serverless instances
      Given two submissions that would hit different function instances
      When the shared-store limit is exceeded
      Then the later submission receives 429
    ```

- [ ] **[SITE-08] Add recipes route-group error boundary**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** `(recipes)/error.tsx` matching the pattern in `(blog)/error.tsx` and `(www)/error.tsx`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Recipes route group has an error boundary
      Given the file apps/site/src/app/(recipes)/error.tsx exists
      When a rendering error is thrown under the recipes segment
      Then the error boundary UI is shown instead of an unhandled stack trace
    ```

- [ ] **[SITE-09] Home page metadata**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** `(www)/page.tsx` exports page-specific `title`, `description`, and `alternates.canonical` via `generatePageMetadata`. Regenerates already does this.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Home page has unique metadata
      Given the home page module is loaded
      When its metadata export is resolved
      Then title and description are not identical to the generic site root defaults
      And alternates.canonical ends with a trailing slash
    ```

- [ ] **[SITE-10] Recipe detail Open Graph images**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 2
  - **Overlaps:** media library (MEDIA)
  - **Depends on:** —
  - **Deliverable:** `recipes/[slug]/page.tsx` `generateMetadata` includes `openGraph.images` (and Twitter card image) when a recipe image field is populated. Prefer the media relation once MEDIA lands; do not reintroduce text-path fields.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Recipe with image emits OG image metadata
      Given a published recipe with a populated hero image
      When generateMetadata runs for that slug
      Then openGraph.images contains an absolute URL for the image
    ```

- [ ] **[SITE-11] Payload draft preview for editors**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 5
  - **Depends on:** SITE-01
  - **Deliverable:** Next.js draft mode (or Payload preview secret) wired so `admin.preview` URLs render draft content for authenticated preview requests without weakening public `overrideAccess: false` queries. Posts already expose a preview URL that currently hits the public route (404 for drafts).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Public visitors never see draft content
      Given a post remains in draft status
      When an unauthenticated visitor requests /blog/{slug}/
      Then the response is 404

    Scenario: Editor preview renders draft content
      Given a post remains in draft status
      When an editor opens the Payload preview URL with a valid preview token or draft mode
      Then the draft body is rendered on the public route template
    ```

- [ ] **[SITE-12] Remove deprecated X-XSS-Protection header**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** `lib/security/headers.ts` sets `X-XSS-Protection: 0` or omits the header; test updated if present.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: X-XSS-Protection is not mode=block
      Given security headers are generated for a production response
      When the X-XSS-Protection header value is read
      Then it is not "1; mode=block"
    ```

- [ ] **[SITE-13] Set document language to en-AU**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** `site-static-shell.tsx` renders `<html lang="en-AU">`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Root html element declares Australian English
      Given the static shell layout is rendered
      When the html element lang attribute is read
      Then its value is "en-AU"
    ```

- [ ] **[SITE-14] Generate robots.txt from app/robots.ts**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 2
  - **Depends on:** —
  - **Deliverable:** `app/robots.ts` using `BASE_URL`; remove stale `Disallow: /profile/` from `public/robots.txt`; reference sitemap and RSS feed; delete or redirect `public/robots.txt` if superseded.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Robots.txt is generated with the production base URL
      Given the app robots module is evaluated
      When the sitemap URL is read
      Then it uses the configured BASE_URL host

    Scenario: Robots.txt does not disallow non-existent paths
      Given the generated robots rules are read
      Then no rule disallows "/profile/"
    ```

- [ ] **[SITE-15] Skip-navigation link**
  - **Status:** Open | **Priority:** P2 | **Estimate:** 2
  - **Overlaps:** Phase 4 a11y; `ARCHITECTURE.md` §10.2
  - **Depends on:** —
  - **Deliverable:** Visually hidden skip link as first focusable element in the public layout; targets `<main>` or equivalent landmark.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Skip link is the first tab stop
      Given a public marketing page is loaded
      When the user presses Tab once
      Then focus moves to a skip-navigation link
      And activating the link moves focus to the main content landmark
    ```

### P3 — Discoverability

- [ ] **[SITE-16] Wire recipes into site navigation**
  - **Status:** Open | **Priority:** P3 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** `navigation.tsx` Cook item `href: '/recipes'` with `visible: true` (or equivalent header/footer link). Recipes index is live; Cook is currently `href: '#'` and `visible: false`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Main navigation links to the recipes index
      Given the navigation config is read
      When the Cook or Recipes item is found
      Then its href is "/recipes" and it is visible in the header
    ```

- [ ] **[SITE-17] Dynamic Open Graph images**
  - **Status:** Open | **Priority:** P3 | **Estimate:** 5
  - **Overlaps:** Phase 4 roadmap; media library (MEDIA)
  - **Depends on:** SITE-10
  - **Deliverable:** `opengraph-image` route or `ImageResponse` fallback for blog posts and recipes without uploaded images.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Post without image still serves an OG image URL
      Given a published post has no image field
      When social crawlers request the OG image endpoint for that post
      Then the response is a 200 image with content-type image/png or image/jpeg
    ```

### P4 — Performance, cleanup, and documentation

- [ ] **[SITE-18] Reduce Framer Motion client bundle**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 3
  - **Depends on:** —
  - **Deliverable:** Replace remaining entrance/menu animations (`Header.tsx`, `MobileMenu.tsx`, `HeroDecorations.tsx`, `HeaderWithStats.tsx`) with CSS or `LazyMotion` + `domAnimation`; `client-js-diet.test.ts` assertions pass without full `framer-motion` in shared client chunks.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Header client chunk does not import full framer-motion
      Given the Header module source is read
      When framer-motion import style is checked
      Then only the minimal motion subset is imported or CSS handles the animation
    ```

- [ ] **[SITE-19] Consent status fetch waterfall**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 3
  - **Depends on:** —
  - **Deliverable:** Returning visitors avoid `/api/consent` on every page load via a non-httpOnly mirror flag cookie or `sessionStorage` cache with safe fallback when the mirror disagrees with the authoritative cookie.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Returning accepted visitor skips consent fetch
      Given the visitor has an accepted cp_consent cookie and a valid mirror flag
      When a new page loads
      Then ConsentGate does not call GET /api/consent before rendering GTM
    ```

- [ ] **[SITE-20] Audit Sentry session replay bundle cost**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 2
  - **Depends on:** —
  - **Deliverable:** Review `replaysSessionSampleRate` (currently 0.1) and lazy-load replay integration; document decision in `ARCHITECTURE.md` §10 (not §7.8 — public HTTP API lives there).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Replay integration is lazy-loaded or sample rate reduced
      Given instrumentation-client.ts is read
      When replay is configured
      Then replay integration uses lazyLoadIntegration or session sample rate is justified in docs
    ```

- [ ] **[SITE-21] Remove dead getPathFromParams helper**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** Delete `getPathFromParams` from `lib/metadata/index.ts` (no callers).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: getPathFromParams is not exported with wrong param names
      Given lib/metadata/index.ts is read
      When getPathFromParams is searched for across the codebase
      Then either the function is removed or it maps params.slug correctly and has a unit test
    ```

- [ ] **[SITE-22] Replace sitemap runtime directory scan**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 2
  - **Depends on:** —
  - **Deliverable:** Explicit static route list in `sitemap.ts` with meaningful `lastModified` or omitted dates; no `fs.readdirSync` of `src/app` at generation time. Legal MDX scan of `content/legal/` may remain until those pages move.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Sitemap does not read src/app from disk
      Given sitemap.ts source is read
      When filesystem calls are searched
      Then no code reads apps/site/src/app at request or generation time for route discovery
    ```

- [ ] **[SITE-23] Dependency hygiene and ARCHITECTURE.md §10 refresh**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 2
  - **Depends on:** SITE-18
  - **Deliverable:** Remove unused `uuid` and leftover remark packages if unused after Framer Motion work; drop resolved MDX debt lines from `ARCHITECTURE.md` §10 (`gray-matter` is already gone from `package.json`).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: uuid is not a direct dependency without imports
      Given apps/site/package.json dependencies are read
      When the codebase is searched for uuid imports
      Then uuid is absent from dependencies or every import is accounted for

    Scenario: ARCHITECTURE.md debt list reflects resolved MDX packages
      Given ARCHITECTURE.md section 10 is read
      Then gray-matter and unused remark packages are not listed as open debt if removed from package.json
    ```

- [ ] **[SITE-24] Documentation drift sweep**
  - **Status:** Open | **Priority:** P4 | **Estimate:** 2
  - **Depends on:** SITE-02, SITE-23
  - **Deliverable:** `ARCHITECTURE.md` naming examples use `[slug]` not `[post]`/`[recipe]`; this doc cross-linked from roadmap Phase 2 notes.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Structure doc matches App Router segment names
      Given docs/ARCHITECTURE.md is read
      When naming conventions for dynamic segments are described
      Then examples use [slug] not [post] or [recipe]
    ```

## 4. Suggested execution order

```text
Unblock merges
  SITE-02 → SITE-06 → SITE-05 → SITE-16

Trust + a11y
  SITE-03, SITE-04, SITE-01, SITE-08, SITE-12, SITE-13

SEO + editor
  SITE-09, SITE-10, SITE-14, SITE-15, SITE-11

Phase 4 polish (schedule with roadmap)
  SITE-17

Pairs with performance
  SITE-18, SITE-19, SITE-20

Cleanup
  SITE-21, SITE-22, SITE-23, SITE-24
```

## 5. Related epics (not duplicated here)

| Epic                         | Folder                | Why it stays separate                                      |
| ---------------------------- | --------------------- | ---------------------------------------------------------- |
| Media library (MEDIA)        | `specs/media/`        | Phase 1 P0 — upload collection, alt, backfill              |
| Admin hardening (ADMIN)      | `specs/admin/`        | Phase 2 — Users access, GraphQL playground, prod CSP check |
| MailerLite welcome (BLOG-01) | `specs/blog/TASKS.md` | Ops only — in-repo blog epic is otherwise shipped          |

## 6. Closed — do not re-open

| ID    | Why closed                                                              |
| ----- | ----------------------------------------------------------------------- |
| SH-01 | Typecheck and `/recipes/` static-route assertion restored (2026-07-04). |
| SH-04 | Mobile menu button uses `isSolid` colour (`text-bark` on fleece).       |
| SH-19 | Category and tag archives shipped in the blog epic (CP09).              |
| SH-20 | On-site search is a product non-goal.                                   |
| SH-21 | MDX posts/recipes live under `content/archive/`, not a live pipeline.   |
| SH-23 | Chronological prev/next superseded by related posts on article pages.   |

July 2026 review items already verified complete at the time (draft-safe public
queries, middleware cache, CSP report endpoint, trailing-slash canonicals, RSS,
pagination, recipes index, decorative category filter removed) remain closed.

## 7. References

- [Architecture solution](../../docs/ARCHITECTURE.md) — §6.3 draft safety, §7 caching, §10 debt
- [Roadmap](../../docs/product/roadmap.md) — Phase 1 CI gate; Phase 2 rate limiting and production admin
