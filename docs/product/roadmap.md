---
type: Roadmap
domain: carinya-parc-website
version: '0.5'
owner: product
status: Draft
last_updated: 2026-09-21
parent_product: docs/product/product.md
parent_roadmap: null
related:
  - docs/product/product.md
  - docs/ARCHITECTURE.md
  - docs/astro-migration/PLAN.md
---

# Roadmap — Carinya Parc website

**When** work ships. Defines phased objectives, exit criteria, and milestones.

| Doc                                     | Role                                              |
| --------------------------------------- | ------------------------------------------------- |
| [`product.md`](product.md)              | What and why                                      |
| **This document**                       | When — sequencing and phase gates                 |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | How and where — architecture; current debt in §10 |

This document does not list technical debt — see [`ARCHITECTURE.md`](../ARCHITECTURE.md) §10. Stories and acceptance criteria are scoped when a phase starts.

---

## 1. Roadmap intent

The website exists to build audience, pre-qualify guests, and publish stories and recipes that reflect life on the property. Content is MDX in `content/`, reviewed and published through pull requests; the site is built by Astro and served from the Vercel CDN ([`PLAN.md`](../astro-migration/PLAN.md)).

This roadmap **prioritises marketing and content outcomes** — publishable posts, recipes and events; Stay information; honest, discoverable pages — so the owner can grow the newsletter and guest pipeline without engineering for every change. The migration removed the CMS work that used to sit in front of those outcomes: revalidation, a media library, site globals, a rich-text toolbar and production admin verification are no longer needed because there is no admin, no database and no cache to keep in sync. What remains in front of marketing work is the cut-over itself, then a short period of learning whether PR-based editing is enough for the editor.

Each phase unlocks the next without stacking risky changes.

---

## 2. Sequencing logic

1. **Cut over first, then everything else.** Until the Vercel project points at `apps/web`, production is the old app and nothing new ships to visitors. The cut-over is small, reversible, and already rehearsed on previews.
2. **Editorial confidence before editorial tooling.** Publish through PRs for a few weeks before deciding whether a git-backed editor is worth adding. The gate (human approval on `main`) stays the same either way.
3. **Marketing outcomes next.** Stay information, experiences and partner scaffolding address the guest pipeline from [`product.md`](product.md) and need no platform work.
4. **Discoverability after the content settles.** Dynamic social images and verified local-business data are polish on stable content; RSS, recipe structured data, category and tag archives and per-document SEO already ship with the Astro build.
5. **Grow the monorepo only on demand.** `@carinya/theme`, `brand/` and `skills/carinya-parc` exist; nothing else is extracted until a second surface needs it.

---

## 3. Phases

### Phase 1 — Foundations (closed)

**Objective:** Editorial capability, SEO controls and safe merges.

What shipped, and how:

- Continuous integration on every pull request — lint, typecheck, format check, tests, a full `apps/web` build and the dist checks — with no secrets required.
- SEO controls per document — title, description, excerpt, hero image and alt text are frontmatter fields validated at build.
- Recipe structured data with ingredients and instructions; reading-time meta on post cards.
- Category and tag archives that filter correctly (generated only where at least one published post exists).
- RSS feed at `/feed.xml`.
- Draft content never appears on the public site: `draft: true` is excluded from production builds.
- The product monorepo: `@carinya/theme` as a workspace package, `brand/` as the voice and positioning source, `skills/carinya-parc` for agent guidance (formerly its own phase).

Closed as no longer needed by the migration: on-demand revalidation, media library, site globals, scoped rich-text toolbar, production admin verification under CSP, and a shared rate-limit store (replaced by a Vercel WAF rule, Phase 2).

Carried forward: **Stay information** (Phase 4).

---

### Phase 2 — Cut-over

**Objective:** Make `apps/web` the production site and retire `apps/site`.

**In scope:** Phase 7 of [`PLAN.md`](../astro-migration/PLAN.md) — final content re-export if anything changed after the freeze, Vercel root directory to `apps/web`, environment variables pruned, CSP switched from report-only to enforced, Vercel WAF rate-limit rule on `/api/*`, sitemap resubmitted, 48 hours of watching Sentry and Vercel logs, then the deletion PR for `apps/site` and the seed-validation CI step.

**Quality gates:**

- Every URL in the production baseline returns 200 (or the documented redirect or 410).
- Contact, subscribe and event signup succeed against production MailerLite and Resend.
- No CSP violations from the site's own pages in the first 48 hours of enforcement.

**Exit criteria:**

- [ ] Production serves from `apps/web`; rollback path documented and tested once on a preview.
- [ ] CSP enforced; WAF rule active on `/api/*`.
- [ ] `apps/site`, its dependencies, `docker-compose.yml`, the seed pipeline and the Neon database are gone.
- [ ] `turbo.json` and CI no longer reference Payload-era variables or steps.

**Out of scope:** Any new page or content feature; editorial tooling.

---

### Phase 3 — Editorial workflow and tooling

**Objective:** Make publishing through pull requests routine for the owner, then decide whether a browser editor is needed.

**In scope:**

- Content templates for posts, recipes and events (frontmatter with every field, in the authoring contract from `PLAN.md` §3), and a short how-to for the editor.
- Real `imageAlt` on every entry; a schema rule or lint that flags placeholder alt text.
- Path-scoped review: CODEOWNERS or branch rules so a content-only PR needs one human approval and no engineering review.
- A scheduled production deploy if events or dated content go stale between merges.
- Decision on an optional git-backed editor (Decap, Keystatic or GitHub's web editor) after at least a month of PR-based publishing; adopt only if it keeps `main` as the single publish gate.

**Quality gates:**

- The editor can publish a post from a template to production without engineering help.
- Preview deployment is used as the draft review on every content PR.

**Exit criteria:**

- [ ] Templates and how-to merged; three posts published through the workflow by the owner.
- [ ] No placeholder alt text in `content/`.
- [ ] Editor tooling decision recorded (ADR or a note in `PLAN.md` §8).

**Entry condition:** Phase 2 exit criteria met.

---

### Phase 4 — Marketing pages

**Objective:** Present honest Stay information and light scaffolding for experiences and partners, so the site pre-qualifies guests and points them to a clear enquiry path.

**In scope:**

- **Stay information** — accommodation, seasonality, what to expect, honest "what it's not", and an enquiry path (per [`product.md`](product.md) near-future).
- Experiences and workshops, and partner or collaborator pages with honest placeholder or live copy and contact paths.
- Mid-article subscribe as an MDX component authors place deliberately, if the end-of-post form proves insufficient.

**Quality gates:**

- Stay pages answer "Is this for me?" and "How do I enquire?" without misleading expectations.
- New pages carry the common metadata set and pass the dist and parity checks.

**Exit criteria:**

- [ ] Stay pages live with copy verified against on-ground reality.
- [ ] Experiences and partner routes exist with clear contact paths.

**Entry condition:** Phase 2 complete; Phase 3 may run in parallel.

---

### Phase 5 — Discoverability polish

**Objective:** Improve how content looks when shared and how the property is found locally.

**In scope:**

- Dynamic social preview images per post and recipe, generated at build, or a documented fallback policy.
- Verified local-business coordinates in `LOCAL_BUSINESS` (the current values are placeholders).
- `article:published_time` and `article:author` Open Graph tags on posts.
- Recipe tag archives if recipe tags are worth surfacing; otherwise leave them as labels.
- Targeted accessibility items: skip-navigation link, an automated accessibility check in CI.

**Quality gates:**

- Shared links show a page-specific image where one exists.
- LocalBusiness structured data reflects the verified property location.

**Exit criteria:**

- [ ] Post and recipe pages expose dynamic social images (or the fallback policy is documented).
- [ ] LocalBusiness structured data uses verified coordinates.
- [ ] Accessibility check runs in CI.

**Out of scope:** Booking engine, e-commerce, scheduled publishing, multi-property support.

---

## 4. Milestones

| Milestone                             | Phase | Customer-visible? | Notes                                          |
| ------------------------------------- | ----- | ----------------- | ---------------------------------------------- |
| CI green on every PR, hermetic build  | 1     | Internal only     | Done                                           |
| RSS, recipe structured data, archives | 1     | Yes               | Done; ships with the Astro build               |
| `@carinya/theme` in the monorepo      | 1     | No                | Done                                           |
| Production serves from `apps/web`     | 2     | Yes               | The cut-over; legal pages and pagination fixed |
| CSP enforced, WAF rule live           | 2     | Internal only     | Durable abuse control                          |
| `apps/site` deleted                   | 2     | No                | Repo has one app                               |
| Owner publishes via PR unaided        | 3     | Internal only     | Templates and how-to                           |
| Editor tooling decision               | 3     | No                | Optional git-backed editor                     |
| Stay information pages live           | 4     | Yes               | Guest pipeline and pre-qualification           |
| Experiences and partner pages         | 4     | Yes               | Marketing scaffolding for future offers        |
| Rich social previews                  | 5     | Yes               | When links are shared                          |
| Verified local-business data          | 5     | Partial           | Search and maps                                |

---

## 5. Cross-domain dependencies

| Dependency                                   | Owner                 | Gates                                                   | Status      |
| -------------------------------------------- | --------------------- | ------------------------------------------------------- | ----------- |
| Vercel project, previews and secrets         | Engineering / hosting | Every phase                                             | Active      |
| GitHub branch protection (human approval)    | Engineering           | Phase 2 onward — the publish gate                       | Active      |
| Vercel WAF rate-limit rule on `/api/*`       | Engineering / hosting | Phase 2 — durable form protection                       | Not started |
| MailerLite groups per event                  | Marketing             | Event signups                                           | Active      |
| Resend sending domain                        | Engineering           | Contact notifications                                   | Active      |
| Neon database                                | Engineering / hosting | Phase 2 — decommission after registrations CSV is saved | Retiring    |
| Verified property coordinates                | Owner                 | Phase 5                                                 | Not started |
| Stay copy verified against on-ground reality | Owner                 | Phase 4                                                 | Not started |

---

## 6. Out of scope for this roadmap

Deferred beyond Phase 5 or excluded per [`product.md`](product.md):

- Full booking engine with real-time availability and payments.
- E-commerce and checkout flows.
- Multi-property or multi-brand sites.
- Scheduled publishing beyond `draft: true` and a scheduled deploy.
- Roles and permissions beyond GitHub review; there is no site login.
- Event capacity counting or attendance records outside MailerLite.
- Formal WCAG certification programme (Phase 5 includes targeted items only).

---

## 7. Review cadence

- **Weekly (during active execution):** Track phase exit criteria; confirm no regressions in production forms, redirects or public routes.
- **Pre-phase-gate:** Before entering a new phase, confirm all prior exit criteria are met; run full quality checks locally and in CI; scope stories and acceptance criteria for the entering phase.
- **Quarterly:** Re-read [`product.md`](product.md) near-future features and §6 deferrals; adjust phase order if product priorities shift.
