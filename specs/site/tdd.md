---
type: Technical Design
mode: skeleton
work_id: SITE
epic_slug: site
version: '0.1'
owner: site
status: Draft
last_updated: 2026-08-13
related:
  - specs/site/TASKS.md
  - docs/ARCHITECTURE.md
  - docs/product/roadmap.md
---

# Technical Design — Site hardening (SITE)

Technical design for SITE at `specs/site/`. Architecture-wide patterns are authoritative in [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and are cited, not repeated.

A remaining-work epic: close correctness, security, SEO, and a11y gaps on the already-shipping public site. Not a new surface.

## 1. The slice

Prove that public queries never leak drafts, CI builds the production app, public forms do not leak setup details, and primary CTAs resolve to real routes. Later tasks harden rate limits, editor preview, metadata, and bundle cost.

**Does not yet work (and is out of this epic):** Payload media uploads (`specs/media/`), admin Users access (`specs/admin/`), MailerLite welcome automations (`specs/blog/`).

## 2. Files

```text
# Quality gates
.github/workflows/ci.yml                          EVOLVE  add pnpm build when secrets exist
apps/site/src/lib/payload/queries/*.test.ts       EVOLVE  draft create-and-assert (SITE-01)

# Public forms + email
apps/site/src/app/api/subscribe/route.ts          EVOLVE  generic error bodies
apps/site/src/lib/email/send-contact-notification.ts  EVOLVE  pass AbortSignal

# Links, nav, a11y
apps/site/src/app/(www)/page.tsx                  EVOLVE  real CTA hrefs + page metadata
apps/site/src/app/navigation.tsx                  EVOLVE  Cook → /recipes visible
apps/site/src/lib/performance/internal-links.test.ts  EVOLVE  object-literal hrefs
apps/site/src/app/(recipes)/error.tsx             NEW     route-group error boundary
apps/site/src/components/layouts/site-static-shell.tsx  EVOLVE  lang=en-AU; skip link

# SEO + robots
apps/site/src/app/robots.ts                       NEW     generated robots.txt
apps/site/public/robots.txt                       DELETE  or superseded
apps/site/src/app/(recipes)/recipes/[slug]/page.tsx  EVOLVE  OG images (after MEDIA)
apps/site/src/app/sitemap.ts                      EVOLVE  explicit static routes

# Security / editor
apps/site/src/lib/security/headers.ts             EVOLVE  drop X-XSS-Protection mode=block
apps/site/src/lib/rate-limit (or KV client)       NEW     shared store for contact/subscribe
draft-mode / preview route                        NEW     editor preview without public leak

# Performance / cleanup
apps/site/src/components/sections/header/*        EVOLVE  drop full framer-motion
apps/site/src/lib/metadata/index.ts               EVOLVE  remove getPathFromParams
apps/site/package.json                            EVOLVE  unused uuid / remark
docs/ARCHITECTURE.md                     EVOLVE  §10 refresh
```

## 3. Acceptance gates

### 3.1 End-to-end path

- A pull request runs `pnpm build` (or `pnpm site:build`) in CI when secrets are present, and fails the job on a failed build.
- Homepage primary CTAs resolve to existing routes or in-page fragments.
- Header Cook/Recipes item is visible and targets `/recipes`.

### 3.2 Observability

- Subscribe misconfiguration logs server-side / Sentry only; the JSON body is generic (`SITE-03`).
- Consent-gated analytics behaviour is unchanged (`ARCHITECTURE.md` §7.4). SITE does not add events.

### 3.3 Error path

- `(recipes)/error.tsx` catches a render throw under the recipes segment (`SITE-08`).
- Shared rate-limit store returns 429 across instances (`SITE-07`).

### 3.4 Quality

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- Existing `overrideAccess: false` contract tests stay green; SITE-01 adds create-and-assert draft exclusion.

Story-level Gherkin lives in [`TASKS.md`](TASKS.md).

## 4. What was NOT delivered

- Media library, admin Users access, MailerLite welcomes (other `specs/` domains).
- On-site search, chronological prev/next, recipe index filtering (closed; see TASKS.md §6).
- Full marketing-page CMS, Stay pages, booking.

**Stable on close:** CI production build; draft-safe public queries with an integration test; generic subscribe errors; recipes in nav; generated robots.txt; shared form rate limits; skip link and `lang="en-AU"`.

## 5. Open questions

1. **Shared rate-limit store.** Vercel KV vs Upstash vs other? Default: whatever is already available in the Vercel project. Owner: operator; blocks SITE-07 only.
2. **Preview mechanism.** Next.js draft mode vs Payload preview secret? Default: draft mode keyed by a preview secret; public queries stay `overrideAccess: false`. Owner: implementer; blocks SITE-11 only.

## 6. Handoff

**Next:** MEDIA (hero/OG images for SITE-10 / SITE-17), ADMIN (production CSP verification), BLOG-01 (MailerLite). Update `ARCHITECTURE.md` §10 as SITE-23 lands.
