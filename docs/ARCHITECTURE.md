---
type: Architecture
scope: carinyaparc-website
version: '0.5'
status: Active
last_updated: 2026-10-18
related:
  - docs/PRODUCT.md
  - docs/PRINCIPLES.md
  - docs/decisions/ADR-0001-astro-mdx.md
---

# Architecture — Carinya Parc website

> **Ownership rule.** When the authoring model, runtime split, public routes, content contract, security policy, or deployment topology change, this document must be updated in the same PR.

> **State.** `current` (as-is). Decisions live in [`docs/decisions/`](decisions/). Engineering rules live in [`PRINCIPLES.md`](PRINCIPLES.md). Product scope lives in [`PRODUCT.md`](PRODUCT.md).

The public website for one farm: static pages built from files in the repository, a handful of on-demand form and report endpoints, and no database.

---

# 1. Introduction and Goals

## Requirements Overview

The site publishes marketing pages, a journal, recipes, an events list, and legal pages. Visitors can send a contact enquiry, join the newsletter, and sign up for an event. Authors publish by merging a pull request. Behaviour and scope are in [`PRODUCT.md`](PRODUCT.md).

## Quality Goals

The first goal wins when they conflict.

| Priority | Quality goal                     | Scenario (one line)                                                                                       |
| -------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1        | Trust and security               | Every response carries the security policy, form input is validated, and secrets never reach the browser. |
| 2        | Hermetic builds                  | A build needs only the repository. Missing or invalid content fails the build.                            |
| 3        | Performance on regional mobile   | Public pages are static HTML. Client JavaScript is limited to interaction.                                |
| 4        | Editorial reliability            | One content pipeline. A draft stays out of production until it is deliberately published.                 |
| 5        | Maintainability for a small team | Pages stay thin. A schema, a query, or an integration has one home.                                       |

## Stakeholders

| Role     | Contact | Expectations of this architecture                                                   |
| -------- | ------- | ----------------------------------------------------------------------------------- |
| Visitor  | —       | Pages load as HTML. Forms accept or fail clearly. Analytics waits for consent.      |
| Author   | —       | Content is files. Drafts are visible locally and on a preview deployment.           |
| Reviewer | —       | The preview is the draft. Merging to `main` publishes.                              |
| Operator | —       | Environment variables and third-party keys live on the host, not in the repository. |

**Source files:** `docs/PRODUCT.md`, `docs/PRINCIPLES.md`

---

# 2. Architecture Constraints

- **Technical:** TypeScript strict mode. Public pages are prerendered. A route that must read the request is an explicit on-demand endpoint. There is no database and no authentication.
- **Organisational:** One property and, in practice, one editor. Branch protection on `main` is the publish gate. Roles beyond pull-request review, and multi-property tenancy, are out of scope.
- **Conventions:** pnpm and Turborepo. The site is `apps/web`. Shared packages are `@carinya/theme`, `@repo/eslint-config`, and `@repo/typescript-config`. `content/`, `brand/`, `skills/`, and `docs/` sit at the repository root and are not installable packages. User-visible copy is Australian English.

**Source files:** `.nvmrc`, `package.json`, `pnpm-workspace.yaml`, `apps/web/astro.config.mjs`, `docs/PRINCIPLES.md`

---

# 3. Context and Scope

## Business Context

```text
Author / reviewer
  | pull request, then merge to main
  v
GitHub  --build-->  Vercel
                      |  static HTML to the visitor
                      |  form and report calls onward
                      v
                    MailerLite · Resend · Sentry
                    GTM and Vercel Analytics (browser, after consent)
```

**The website owns:** the public pages, the journal, recipes, events, and legal pages, the five on-demand HTTP endpoints, security headers and the content security policy, metadata and structured data, photography and static assets, and the content model in `content/`.

**The website does not own:** newsletter CRM logic beyond the MailerLite API, payments, booking, inventory, social publishing, farm operations, or a second property. There is no admin UI.

## Technical Context

| Neighbour                            | Direction | Interface              | Notes                                                                                         |
| ------------------------------------ | --------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| Visitor browser                      | down      | HTTPS                  | Static HTML, CSS, and images. Form posts are JSON or form-encoded.                            |
| GitHub                               | up        | Git                    | System of record for code and content.                                                        |
| Vercel                               | down      | HTTPS, build           | CDN for prerendered pages. Functions for the five on-demand routes. Preview per pull request. |
| MailerLite                           | down      | HTTPS                  | Newsletter subscribers, and one group per event signup.                                       |
| Resend                               | down      | HTTPS                  | Contact-form notification email.                                                              |
| Sentry                               | down      | HTTPS                  | Server errors, and browser envelopes via the same-origin tunnel.                              |
| Google Tag Manager, Vercel Analytics | down      | HTTPS from the browser | Loaded only after consent.                                                                    |

**Source files:** `apps/web/astro.config.mjs`, `apps/web/src/pages/api/`, `apps/web/src/pages/monitoring.ts`

---

# 4. Solution Strategy

Governed by [ADR-0001](decisions/ADR-0001-astro-mdx.md).

| Principle                                 | Consequence                                                                                                                                                                                               | Quality goal                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Static site, islands only for interaction | Astro prerenders every public route. React hydrates the contact, subscribe, event-signup, and consent islands.                                                                                            | Performance, trust                     |
| Git is the CMS                            | Content is MDX and YAML under `content/`, validated on every build. Merging to `main` publishes. There is no browser editor.                                                                              | Editorial reliability, hermetic builds |
| Content stays outside the app             | Authors do not open `apps/`. The app reads `content/` through a relative root.                                                                                                                            | Maintainability                        |
| On-demand is explicit                     | Five routes set prerender off and run as functions. Everything else is static HTML.                                                                                                                       | Performance, trust                     |
| Providers stay behind a folder entry      | MailerLite is called from the newsletter folder. Resend is called from the email folder. Features call `subscribe`, `addToList`, or `send`.                                                               | Maintainability, trust                 |
| Security policy is generated              | Headers and the content security policy are defined once and merged into the build output. The policy is a host allowlist with inline scripts, because prerendered HTML cannot carry a per-request nonce. | Trust                                  |
| No database                               | Event signups are a MailerLite group named for the event. Capacity is a hand-set flag.                                                                                                                    | Hermetic builds                        |

The system will not do: a browser editing UI, payments or booking, authenticated accounts, incremental revalidation, or a second image pipeline.

**Source files:** `docs/decisions/ADR-0001-astro-mdx.md`, `apps/web/astro.config.mjs`, `apps/web/src/content.config.ts`, `apps/web/src/lib/email/index.ts`, `apps/web/src/lib/newsletter/index.ts`

---

# 5. Building Block View

## Whitebox Overall System

```text
┌──────────────────────────────────────────────────────────────────┐
│ Repository                                                       │
│                                                                  │
│  content/                         apps/web                       │
│  posts, recipes, events, legal    pages and layouts render       │
│  authors, categories, tags        components present             │
│  images                           lib/ queries, forms, policy    │
│                                                                   │
│  packages/carinya-theme ───────── styles                         │
└──────────────────────────────────────────────────────────────────┘
        │ astro build
        v
   dist/ static HTML          .vercel/output functions and headers
```

**Motivation.** Pages, content, and integrations change for different reasons. Keeping content at the repository root lets an author publish without opening application code.

**Contained building blocks.**

| Block                 | Responsibility                                                                |
| --------------------- | ----------------------------------------------------------------------------- |
| Content               | The six collections, tag names, and hero images.                              |
| Site                  | Routes, layouts, and components. Reads content through the query helpers.     |
| Contact               | Validates and sends the enquiry notification.                                 |
| Newsletter            | Subscribes an address and adds an address to a named list.                    |
| Email                 | Sends one outbound message. Does not know which feature asked.                |
| Security policy       | Header and content-security-policy definitions, merged into the build output. |
| Consent and analytics | Browser-only. The consent cookie gates analytics.                             |
| Theme                 | Design tokens consumed by the site stylesheet.                                |

**Important interfaces.**

- Public URLs end in `/`. Internal links are built in one place so a form post is not redirected and turned into a GET.
- On-demand routes accept POST and answer GET with 405. The Sentry tunnel is `/monitoring/`, outside `/api/`, so it stays off common blocker lists.

| URL                   | Handler                     |
| --------------------- | --------------------------- |
| `/api/contact/`       | `lib/contact/handler.ts`    |
| `/api/subscribe/`     | `lib/newsletter/handler.ts` |
| `/api/events/signup/` | `lib/api/events-signup.ts`  |
| `/api/csp-report/`    | `lib/api/csp-report.ts`     |
| `/monitoring/`        | `lib/api/sentry-tunnel.ts`  |

Static routes cover the home, about, regenerate, contact, and subscribe pages, the events list, the journal (including category, tag, and page archives), recipes, legal pages, the feed, robots, and the 404. A category or tag archive exists only when a published post uses it.

An island may import a feature's schema and browser client only. The provider file is imported by that folder's server entry and nothing else.

### Repository layout

```text
.
├── apps/web/                 # the site
├── content/                  # posts, recipes, events, legal, authors, categories, images, tags.json
├── packages/
│   ├── carinya-theme/
│   ├── eslint-config/
│   └── typescript-config/
├── brand/                    # voice and positioning
├── skills/carinya-parc/
├── docs/                     # this file, principles, product, decisions
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
└── turbo.json
```

```text
apps/web/src/
├── content.config.ts         # the six collections
├── pages/                    # routes and the on-demand endpoints
├── layouts/                  # Base.astro (document), Site.astro (chrome)
├── components/               # server-rendered, plus islands where the browser must interact
├── lib/                      # queries, features, security, metadata
├── styles/
└── assets/images/            # photographs imported by pages
```

## Level 2

### White box `apps/web`

- **Purpose:** turn `content/` and the page components into static HTML, and serve the five request-time routes.
- **Interfaces:** `lib/content/` is the only read path for published entries. `lib/email` exposes `send()`. `lib/newsletter` exposes `subscribe()` and `addToList()`. `lib/contact` owns the enquiry schema, handler, and notification.
- **Directory:** `src/lib/content/`, `src/lib/contact/`, `src/lib/newsletter/`, `src/lib/email/`, `src/lib/security/`, `src/lib/consent/`, `src/lib/analytics/`, `src/lib/metadata/`, `src/lib/schema/`.

**Source files:** `apps/web/src/content.config.ts`, `apps/web/src/lib/urls.ts`, `apps/web/src/pages/`, `apps/web/src/layouts/`, `packages/carinya-theme/`

---

# 6. Runtime View

## Publish a page

1. An author edits a file under `content/` on a branch. `draft: true` keeps a post, recipe, or event out of production while it is unfinished.
2. The pull request builds the site and deploys a preview.
3. A reviewer merges to `main`.
4. The production build validates frontmatter, prerenders pages, and the CDN serves the new HTML.

There is no revalidation. A draft that remains on `main` stays unpublished. Archive pages are generated only for categories, tags, and pages that have a published post.

## Contact enquiry

1. The contact island posts JSON to `/api/contact/`.
2. The handler refuses the form when it is disabled (503), rejects an invalid body (400), and treats a filled honeypot or a submission under two seconds as success without sending.
3. An in-memory limit of 3 submissions per email per 24 hours returns 429. A failed send releases that attempt.
4. The notification is sanitised and sent with `send()` to the configured recipient. Failure is a generic 500.

## Event signup

1. The event island posts to `/api/events/signup/`.
2. Validation, honeypot, timing, the spam-email list, and a limit of 5 per email per 24 hours run first.
3. A draft or unknown event is 404. A past event or an external signup link is 400. A full event is 409.
4. `addToList({ list: event:<slug> })` finds or creates that MailerLite group and upserts the subscriber.

Newsletter subscribe is the same pipeline without the event lookup: one submission per email per day, then a MailerLite upsert.

## Consent

1. The page HTML contains no analytics scripts.
2. The consent island reads `cp_consent`. With no cookie, the banner is shown.
3. Accept writes the cookie for one year (`Path=/`, `SameSite=Lax`, `Secure` on https).
4. A script on every page loads Google Tag Manager, when a container id is set, plus Vercel Analytics and Speed Insights. It loads them when the cookie is already accepted, and on the same page when the visitor accepts.
5. Reject loads nothing.

The cookie is readable by client script on purpose. Consent is not a secret, and no server reads it.

**Source files:** `apps/web/src/lib/contact/handler.ts`, `apps/web/src/lib/api/events-signup.ts`, `apps/web/src/lib/newsletter/handler.ts`, `apps/web/src/lib/consent/client.ts`, `apps/web/src/lib/analytics/client.ts`, `apps/web/src/components/consent/ConsentGate.tsx`

---

# 7. Deployment View

## Infrastructure Level 1

| Service                 | Platform                   | Role                                                         |
| ----------------------- | -------------------------- | ------------------------------------------------------------ |
| Public pages and assets | Vercel CDN                 | Prerendered HTML, images, sitemap, feed                      |
| Form and report routes  | Vercel Functions           | Contact, subscribe, event signup, CSP reports, Sentry tunnel |
| Source                  | GitHub                     | Code and content. Merge to `main` is the production release. |
| Newsletter              | MailerLite                 | Subscribers and per-event groups                             |
| Contact mail            | Resend                     | Enquiry notification                                         |
| Errors                  | Sentry                     | Server capture, and browser envelopes through `/monitoring/` |
| Analytics               | Google Tag Manager, Vercel | After consent only                                           |

**Motivation.** The pages do not need a server. The five routes do, because they accept a request and call a third party.

**Quality.** A build succeeds with no secrets set. Optional integrations fail the request with a clear error when their key is missing. Public HTML changes only when a build runs. Function responses are not cached. Rollback is redeploying the previous Vercel deployment. Content and code share one pipeline.

**Mapping.** The site block and the theme become the CDN output. Contact, newsletter, email, and the security policy run in the build and, for the form routes, in the functions. Consent and analytics run in the browser.

## Infrastructure Level 2

The Vercel project root is `apps/web`.

| Environment | What it runs                          | Content                                                 |
| ----------- | ------------------------------------- | ------------------------------------------------------- |
| Local       | `astro dev`                           | Working tree. Drafts visible.                           |
| Preview     | Vercel deployment of the pull request | The branch. Same content security policy as production. |
| Production  | Vercel deployment of `main`           | `main`. Secrets in the host's environment.              |

No variable is required to build. `PUBLIC_SITE_URL` is the canonical origin. `PUBLIC_GTM_ID` and `PUBLIC_SENTRY_DSN` are the browser-visible ids. `MAILERLITE_API_KEY`, `RESEND_API_KEY`, the contact recipient and from address, and the form rate-limit switches are server-only. The task runner lists build-relevant variables so its cache key includes them.

```text
merge → Vercel build (root apps/web)
  → astro build validates content, prerenders pages, writes the sitemap and feed
  → adapter emits static files and five functions
  → security integration writes headers into the build output
  → deploy
```

**Source files:** `apps/web/astro.config.mjs`, `apps/web/.env.example`, `turbo.json`, `.github/workflows/ci.yml`

---

# 8. Cross-cutting Concepts

## Domain model and persistence

State lives in git. There is no database. An entry's id is its filename without the extension, so the public slug is the filename. Slugs are lowercase kebab-case.

| Collection | Files                       | Required fields                                                           |
| ---------- | --------------------------- | ------------------------------------------------------------------------- |
| posts      | `content/posts/*.mdx`       | title, date, author, excerpt                                              |
| recipes    | `content/recipes/*.mdx`     | title, date, author, excerpt, at least one ingredient and one instruction |
| events     | `content/events/*.mdx`      | title, startsAt, location                                                 |
| legal      | `content/legal/*.mdx`       | title, description                                                        |
| authors    | `content/authors/*.yaml`    | name                                                                      |
| categories | `content/categories/*.yaml` | name                                                                      |

`content/tags.json` maps a slug to a display name when the slug is not the label. `content/images/` holds hero files referenced from frontmatter.

Invariants:

- A missing author or category reference fails the build.
- `draft: true` on a post, recipe, or event removes it from production HTML, archives, the feed, and the sitemap. Local dev still renders it. The event-signup endpoint treats a draft as missing.
- `image` is a path relative to the entry, not a public URL. The file must exist and is optimised at build.
- Post and recipe photographs use one of three presets (`card`, `featured`, `detail`) and are encoded as WebP. The share image is a separate 1200×630 JPEG crop. `public/images/` holds a placeholder SVG only.
- Recipe durations match an ISO 8601 hours-minutes-seconds pattern.
- `isFull` is set by hand. Nothing counts event capacity.
- A category or tag with no published post has no archive page.

## Security

```text
Visitor browser
    | HTTPS, no secrets
    v
Vercel CDN (static HTML, consent cookie only)
    |
    +-- after consent --> GTM, Vercel Analytics
    |
Vercel Functions (server keys)
    +-- MailerLite, Resend, Sentry
```

- Headers include HSTS (two years, preload), frame denial, a strict referrer policy, and a permissions policy that turns camera, microphone, and geolocation off. The content security policy is enforced, not report-only. Violations POST to `/api/csp-report/` (body at most 32 KB; up to 10 forwarded per minute per instance).
- Each form keeps an in-memory limit keyed by lowercased email, per function instance. It is a nuisance filter. A failed upstream call releases the attempt. Durable control is a WAF rule on POST to the contact, subscribe, and event routes. The tunnel uses a one-minute window keyed by client IP.
- Text is stripped of control characters and HTML-significant characters before it reaches email or MailerLite. Logs record the email domain, never the address or the message.
- The only cookie is `cp_consent`, set by the browser, not httpOnly.

## Observability

Sentry is initialised for the browser and the server when a DSN is set. The browser posts envelopes to `/monitoring/`, which forwards an envelope only when its DSN matches the configured project. Handlers capture exceptions and count submissions by status. Vercel Analytics and Speed Insights load only after consent.

## Testing

| Tier      | Where                                       | What                                                                                                                            |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Unit      | Colocated `*.test.ts` under `apps/web/src/` | Handlers, validation, sanitisation, rate limit, adapters, metadata, structured data, security policy, consent, stateful islands |
| Dist      | `apps/web/tests/security.test.ts`           | Built links, images, content-security-policy hosts, and headers. Skips itself when `dist/` is absent.                           |
| Typecheck | `astro check`                               | Types and content frontmatter                                                                                                   |

Presentational components are not unit-tested. There is no browser end-to-end suite. Form submission is checked on a preview.

## Build and release

| Workflow | Trigger                         | Checks                                                     |
| -------- | ------------------------------- | ---------------------------------------------------------- |
| CI       | Pull request and push to `main` | Lint, typecheck, format, unit tests, web build, dist tests |
| Vercel   | Pull request and `main`         | Production build of `apps/web`, then deploy                |

A schema error, a broken reference, or a missing image fails the build. Nothing partial ships.

**Source files:** `apps/web/src/content.config.ts`, `apps/web/src/lib/content/`, `apps/web/src/lib/security/`, `apps/web/src/lib/observability/metrics.ts`, `apps/web/src/lib/images.ts`, `.github/workflows/ci.yml`

---

# 10. Quality Requirements

## Quality Scenarios

| Quality goal          | Scenario                                                                                                                  | Measure                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Trust and security    | An invalid contact body is rejected and no notification is sent. Built HTML carries the enforced content security policy. | Handler tests return 400 without sending. The dist suite finds the policy header and no unexpected hosts. |
| Hermetic builds       | CI builds the site with no third-party keys set.                                                                          | The web build succeeds. A missing key fails the request at runtime with a clear error, not the build.     |
| Performance           | A journal or recipe page is static HTML. Analytics scripts are absent until consent.                                      | View source of a content page has no tag-manager or Vercel analytics script.                              |
| Editorial reliability | A post with `draft: true` is absent from the production HTML, the sitemap, and the feed.                                  | Production build output does not contain that slug. `astro dev` still renders it.                         |
| Maintainability       | Published entries are read through `lib/content/`. A provider module is imported only by its folder entry.                | A new page does not call the collection loader itself. The import boundary fails lint.                    |

**Source files:** `apps/web/src/lib/contact/handler.test.ts`, `apps/web/tests/security.test.ts`, `.github/workflows/ci.yml`

---

# 11. Risks and Technical Debts

## Risks

| ID  | Risk                                                             | Likelihood | Impact | Mitigation                                                                                                       |
| --- | ---------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| R1  | Form abuse across function instances                             | Medium     | Medium | Honeypot and timing in the handler. WAF rate limit on form POSTs.                                                |
| R2  | The content security policy blocks a third-party script          | Low        | Medium | Violations are reported to Sentry. Watch them after an allowlist change.                                         |
| R3  | The events list stays stale between deploys                      | Medium     | Low    | A content merge redeploys. A past event drops off only on the next build.                                        |
| R4  | A new query bypasses the published-only filter and leaks a draft | Low        | High   | Pages read through `lib/content/`. Review any new collection read.                                               |
| R5  | Editing through pull requests is too much friction               | Medium     | Medium | The preview deployment is the draft review. A git-backed editor is an open question, not a second content store. |

## Technical debt

- **Rate limiting is in-memory per instance.** The WAF is the durable control. The tunnel path sits outside `/api/`, so a WAF rule for it has to name `/monitoring/` explicitly.
- **The content security policy allows inline scripts and styles.** Prerendered HTML cannot nonce them. The policy is still enforced.
- **Event freshness is tied to deploys.** `isFull` is set by hand.
- **The journal does not insert a subscribe form mid-article.** Subscribe modules are placed by the page.
- **Some alternative text is still a placeholder,** and the local-business coordinates in `src/lib/constants.ts` are a placeholder published in the structured data.
- **No browser end-to-end tests.** Islands are unit-tested. Forms are checked on a preview.
- **The app and the repository root do not share one TypeScript major.** The app stays on the line its linter supports.

## Open questions

1. **Editorial tooling.** Is the pull-request preview enough, or is a git-backed editor worth adding? It must not become a second source of content.
2. **Recipe tags.** They have no archive page. Either add one or leave them as labels.
3. **Event capacity.** MailerLite holds the list. A capacity or attendance record would have to come from MailerLite, not from a new store in this repository.

**Source files:** `apps/web/src/lib/rate-limit.ts`, `apps/web/src/lib/security/constants.ts`, `apps/web/src/lib/constants.ts`

---

# 12. Glossary

| Term               | Definition                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Entry              | One file in a collection. Its id is the filename stem and the public slug.                         |
| Draft              | `draft: true`. Excluded from production, the sitemap, and the feed. Still rendered in local dev.   |
| Island             | A React component hydrated in the browser for interaction. Mounted from a server-rendered wrapper. |
| On-demand endpoint | A route that renders per request and deploys as a function. The five routes in §5.                 |
| Preview            | The Vercel deployment of a pull request. The draft a reviewer reads.                               |
| Featured post      | `featured: true`. The newest one is the journal hero.                                              |
| Provider           | The third-party adapter inside a feature folder. Imported only by that folder's server entry.      |

**Source files:** `apps/web/src/content.config.ts`, `apps/web/src/lib/content/`, `apps/web/src/lib/email/resend.ts`, `apps/web/src/lib/newsletter/mailerlite.ts`
