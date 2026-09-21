---
type: Review
scope: carinyaparc-website
status: Snapshot
last_updated: 2026-09-21
related:
  - docs/astro-migration/PLAN.md
  - apps/web/tests/baseline/urls.json
---

# Review — Next.js (`apps/site`) → Astro (`apps/web`)

Compared `apps/site` to `apps/web` against [`PLAN.md`](PLAN.md) and the production baseline. Production still deploys from `apps/site` until Phase 7.

**Verdict:** public routes, marketing copy, and the global `#stay` newsletter band are in `apps/web`. Two post-body pieces from Next.js were not ported (one of them documented). Content collections match the freeze. Cut-over (Phase 7) is the remaining plan work.

---

## What was wrong in the first pass

| Earlier claim                                                     | Actual                                                                                                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flatbread title still has `[reval-test]`                          | It does not. Title is `Rustic Farm-Style Flatbread`.                                                                                                                        |
| Phases 5–6 (docs, CSP, ADRs) are open                             | [`PLAN.md`](PLAN.md) marks Phases 0–6 done. `AGENTS.md` already describes `apps/web`. ADRs exist. CSP is **report-only by design** until Phase 7.                           |
| Journal subscribe band is an Astro miss                           | `<JournalSubscribeBand>` is **never mounted in either app**. Next.js blog layout comments say listings render it; they do not. Blog listings already lack it in production. |
| Zero events means content failed to migrate                       | Phase 2 recorded **0 events**. The listing empty-state is the correct current UI.                                                                                           |
| Three featured posts / stay pages / hidden nav are migration gaps | Same behaviour in Next.js. Not Astro regressions.                                                                                                                           |

---

## Real gaps

### P1 — Global newsletter band (`#stay`) — restored

Next.js `SiteChromeFrame` renders `Newsletter` (`id="stay"`) on every **non-blog** page: “Stay connected to the land” plus an email field.

Astro now matches that. `Site.astro` mounts `NewsletterBand` (`id="stay"`) above the footer. Blog routes pass `showNewsletter={false}`. The home hero “Join the journey”, home “Be first to know”, and contact “Subscribe to the newsletter” links resolve to the band.

### P2 — Mid-article subscribe on posts (documented skip)

Next.js splits the Lexical body at its midpoint and inserts `InlineSubscribe`. [`PLAN.md`](PLAN.md) Phase 3 lists this as not carried over (MDX cannot be split the same way).

Astro posts render the full MDX body, then `EndOfPostSubscribe`, `ShareBar`, `AuthorBlock`, `RelatedPosts`. No midpoint form.

### P2 — `GetInvolvedCTA` on posts — restored

Next.js post pages render `GetInvolvedCTA` with the next upcoming event. The component **returns `null` when the calendar is empty**, so with 0 events there is **no visible difference today**.

Astro now mounts it after `AuthorBlock` on `/blog/[slug]/`. Behavior matches Next.js while the calendar is empty.

### P3 — Content polish (not missing pages)

| Item                    | Fact                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Events                  | `content/events/` exists and is empty. Matches the freeze.                                                                                                   |
| Author                  | `content/authors/jonno.yaml` is `name: "Jonno"` only. `AuthorBlock` falls back to a default bio and initials, so the UI still renders.                       |
| Recipe photos           | Only `winter-root-vegetable-stew` has an `image`. Its `imageAlt` is still `"Hero home"`. The other three recipes use rotating fallback photographs on cards. |
| Open Graph article tags | `article:published_time` / `article:author` were listed as not carried over. JSON-LD `Article` is present.                                                   |
| Sentry tunnel           | Next.js uses `tunnelRoute: '/monitoring'`. `@sentry/astro` is configured with no tunnel route. Browser reports may be blocked more often; not a content gap. |

---

## What did migrate

### Marketing copy

Home, About, The Property, Meet Jonno, Regenerate, Contact, Subscribe, and Events were compared section-for-section. Mission cards, ImpactStats, ways-to-help, partners (`#support`), volunteer subscribe (`#volunteer`), contact aside, subscribe benefits grid, and the 404 page match.

Header, footer, mobile menu, overlay-until-scrolled home header, share copy/native share, scroll-depth, consent gate, and the header subscribe modal are in `apps/web`.

Contact and subscribe fields match (name, phone, inquiry type, interests, honeypot).

### Routes

Every public Next.js page has an Astro page. Payload `/admin` and GraphQL return **410 Gone**. `GET /api/consent` was removed on purpose (client cookie + `ConsentGate`). The `(www)/[...slug]` catch-all only calls `notFound()` — it is not a CMS router and was not ported as one.

| Route                                                           | Astro                             | Notes                                                         |
| --------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| `/`                                                             | `pages/index.astro`               | Match; `/#stay` CTAs land on the newsletter band              |
| `/about/`, `/about/the-property/`, `/about/jonathan/`           | `pages/about/*`                   | Match. Jonathan still inherits the site title, as in Next.js. |
| `/regenerate/`                                                  | `pages/regenerate.astro`          | Match                                                         |
| `/contact/`                                                     | `pages/contact.astro`             | Match; newsletter link is `/#stay` and resolves               |
| `/subscribe/`                                                   | `pages/subscribe.astro`           | Match                                                         |
| `/get-involved/events/`                                         | `pages/get-involved/events.astro` | Empty-state; 0 events                                         |
| `/blog/`, `/blog/page/[n]/`                                     | `pages/blog/*`                    | 6 per page, featured limit 1, same as Next.js                 |
| `/blog/[slug]/`                                                 | `pages/blog/[slug].astro`         | See post-body gaps above                                      |
| `/blog/category/[slug]/`, `/blog/tag/[tag]/`                    | matching pages                    | Only archives with published posts                            |
| `/recipes/`, `/recipes/[slug]/`                                 | `pages/recipes/*`                 | Match; Astro also shows a hero image on detail                |
| `/legal/[slug]/`                                                | `pages/legal/[slug].astro`        | Privacy + terms                                               |
| `/feed.xml`, 404, sitemap                                       | present                           | `/sitemap.xml` → `/sitemap-index.xml`                         |
| `POST /api/contact`, `subscribe`, `csp-report`, `events/signup` | `pages/api/*`                     | Same Zod / honeypot / in-memory rate-limit pipeline           |

Retired journal URLs 301 in `astro.config.mjs`. Empty category/tag archives are dropped on purpose (`intentionallyRemoved` in the baseline).

### Content collections (`content/`)

| Collection  | Count               | Notes                                      |
| ----------- | ------------------- | ------------------------------------------ |
| posts       | 10 MDX              | Journal rewrite; old slugs 301             |
| recipes     | 4 MDX               | All four production recipes                |
| legal       | 2 MDX               | Privacy + terms                            |
| authors     | 1 YAML              | `jonno`                                    |
| categories  | 5 YAML              | workshops has no posts, so no archive page |
| events      | 0                   | Expected                                   |
| `tags.json` | slug → display name | Unused tags 404 by design                  |

**Posts:** `a-kitchen-before-a-farm`, `first-planting-day`, `first-syntropic-lines`, `five-dams-one-hot-week`, `midwinter-pasture`, `old-fences-new-lines`, `the-shed-in-winter`, `two-summers-of-rest`, `what-the-river-took`, `why-highland-cattle`.

**Recipes:** `herbed-omlette-with-native-greens`, `rustic-farm-style-flatbread`, `slow-roasted-dexter-beef-with-root-vegetables`, `winter-root-vegetable-stew`.

---

## Same in both apps (not Astro gaps)

- FeaturedPosts `limit={1}` while three posts have `featured: true`; the journal grid excludes all featured posts. Two featured stories are off `/blog/` in both apps (detail URLs still exist).
- `JournalSubscribeBand` (“Never miss a field note”) exists as a component in both apps and is unused in both.
- Hidden nav items (Experience, Produce, Cook) still `href="#"`.
- Stay / accommodation pages never existed in Next.js (product roadmap, not this migration).
- Footer does not link Recipes in either app.

---

## Intentionally not migrated

- Empty category/tag archives.
- Payload admin, GraphQL, event-registrations table, capacity counting.
- httpOnly consent cookie and `GET /api/consent`.
- `framer-motion`, `react-query`, `sonner`, session scaffold.

---

## Plan status

| Phase                   | Status                                                                            |
| ----------------------- | --------------------------------------------------------------------------------- |
| 0 Baseline              | Done — `apps/web/tests/baseline/`                                                 |
| 1 Scaffold              | Done                                                                              |
| 2 Content               | Done — 0 events recorded                                                          |
| 3 Pages                 | Done, with the documented midpoint-subscribe skip                                 |
| 4 Interactivity         | Done for the listed islands (forms, consent, share, scroll-depth, overlay header) |
| 5 Security / SEO / perf | Done — CSP remains report-only until cut-over                                     |
| 6 Docs                  | Done — `AGENTS.md`, ADRs, `PLAN.md` describe `apps/web`                           |
| 7 Cut-over              | Remaining — Vercel root, enforce CSP, WAF rule, delete `apps/site`                |

---

## Before cut-over

1. Decide whether to add an MDX midpoint subscribe and/or `GetInvolvedCTA` once events exist.
2. Optional polish: recipe `image` / `imageAlt`, author bio and photo.
3. Then Phase 7.

---

## Resolution — 21 September 2026

| Finding                             | Outcome                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 — global `#stay` newsletter band | Ported. `components/marketing/NewsletterBand.astro` wraps the `InlineSubscribe` island (`variant="stay"`) with the Next.js copy, `id="stay"`, wattle subscribe button, privacy note, and boxed success state. `Site.astro` renders it above the footer; the five blog routes pass `showNewsletter={false}` so journal pages keep their own prompts. The three `/#stay` CTAs now resolve. |
| P2 — `GetInvolvedCTA` on posts      | Mounted after `AuthorBlock` on `/blog/[slug]/` with the next upcoming event; renders nothing while the calendar is empty, as in Next.js. `getUpcomingEvents` now loads the collection once per build.                                                                                                                                                                                    |
| P2 — mid-article subscribe          | Still not ported. Decision pending: an MDX component authors place explicitly, or leave the end-of-post form as the only in-article prompt.                                                                                                                                                                                                                                              |
| P3 — recipe `imageAlt`              | `winter-root-vegetable-stew` now has a real description. The other three recipes still have no `image` (cards rotate fallback photographs).                                                                                                                                                                                                                                              |
| P3 — author bio and photo           | Open; `content/authors/jonno.yaml` is name-only.                                                                                                                                                                                                                                                                                                                                         |
| P3 — Sentry tunnel                  | Open; `@sentry/astro` has no tunnel route configured.                                                                                                                                                                                                                                                                                                                                    |

Build, `astro check`, unit tests and the parity suite should be re-run after this change. The `#stay` cut-over blocker is cleared.
