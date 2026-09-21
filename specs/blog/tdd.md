---
type: Technical Design
mode: full
work_id: BLOG
epic_slug: blog
version: '0.3'
owner: blog
status: Draft
last_updated: 2026-08-13
related:
  - specs/blog/TASKS.md
  - docs/ARCHITECTURE.md
  - docs/product/roadmap.md
---

# Technical Design — Blog (BLOG)

Technical design for BLOG at `specs/blog/`. The reader-facing blog surface is **already shipped** (archives, related posts, in-flow subscribe, author block, events, share, consent-gated analytics). This document is the living contract for that surface plus the two remaining operator slices. Architecture-wide patterns are authoritative in [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

## 1. Scope

### In scope (remaining)

| Capability                     | Description                                                            | TASKS.md |
| ------------------------------ | ---------------------------------------------------------------------- | -------- |
| Interest-routed welcome emails | MailerLite automations keyed off `/api/subscribe` custom fields        | BLOG-01  |
| Funnel measurement in GA4      | Custom dimensions + closed funnel explorations; DebugView with consent | BLOG-02  |

### Already shipped (do not rebuild)

Category/tag archives, related posts, inline/end-of-post subscribe (`source` + `interest`), author block, Events collection + listing + signup, ShareBar, consent-gated GA events in `apps/site/src/lib/analytics/`. Queries use `overrideAccess: false` (`ARCHITECTURE.md` §6.3). Archives ride `payload:posts` revalidation (`ARCHITECTURE.md` §7.4).

### Out of scope

On-site search (product non-goal). Per-category RSS. In-app `app/admin/analytics` page (deferred until GA4 is insufficient). Paid ticketing.

## 2. Architecture fit

| Concern   | Fit                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subscribe | Reuses `/api/subscribe` + MailerLite (`ARCHITECTURE.md` §7.8, §1.1). Welcome routing is **ESP-side** — the app upserts fields; it does not call automations. |
| Analytics | GTM/dataLayer, consent-gated via `ConsentGate` (`ARCHITECTURE.md` §7.2, §7.4).                                                                               |
| Events    | Payload `Events` + `EventRegistrations`; signup mirrors contact-form validation (`ARCHITECTURE.md` §5.3, §7.1).                                              |
| Rendering | SSG + ISR; no `force-dynamic` on new archive routes (`ARCHITECTURE.md` §5.1, §7.4).                                                                          |

## 3. Files and components

```text
# Remaining (ops / config — no app deploy for BLOG-01)
MailerLite dashboard                         EVOLVE  six welcome automations + custom fields
GA4 property                                 EVOLVE  custom dimensions + funnel explorations

# Shipped — do not regress
apps/site/src/app/api/subscribe/route.ts     KEEP    persist interest, interests, source
apps/site/src/lib/validation/subscribe-schema.ts  KEEP
apps/site/src/lib/analytics/                 KEEP    typed events, consent no-op
apps/site/src/components/subscribe/*         KEEP
apps/site/src/features/events/*              KEEP
apps/site/src/app/(blog)/blog/**             KEEP    archives, related, author, share
```

## 4. Data contracts

Subscribe input (shipped):

```typescript
const SubscribeInput = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  interest: z
    .enum(['restoration', 'regenerative-farming', 'community', 'produce', 'learning'])
    .optional(),
  source: z.string().max(200).optional(), // e.g. "blog:{slug}"
  website: z.string().max(0).optional(), // honeypot (ARCHITECTURE.md §7.1)
});
```

MailerLite custom fields (BLOG-01 must create or verify):

| Field key   | Type | Role                                                |
| ----------- | ---- | --------------------------------------------------- |
| `interest`  | Text | Canonical enum — primary automation trigger         |
| `interests` | Text | Legacy mirror; same value as `interest` when mapped |
| `source`    | Text | Attribution only — not welcome routing              |
| `name`      | Text | Email personalisation                               |

Interest → welcome map (case-sensitive field values):

| Canonical `interest`   | Automation name                  | Primary CTA             |
| ---------------------- | -------------------------------- | ----------------------- |
| `restoration`          | Welcome — Ecological restoration | `/regenerate`           |
| `regenerative-farming` | Welcome — Regenerative farming   | `/about/the-property`   |
| `community`            | Welcome — Community involvement  | `/get-involved/events/` |
| `produce`              | Welcome — Future produce         | `/recipes`              |
| `learning`             | Welcome — Learning opportunities | `/blog`                 |
| _(empty)_              | Welcome — General                | `/about` and `/blog`    |

Legacy form values `regeneration` → `restoration`, `farming` → `regenerative-farming`. Automations key off **canonical** values.

GA4 events (consent-gated; no PII in params). Implementation: `apps/site/src/lib/analytics/`.

| Event                   | When                                                       | Params                                 |
| ----------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `subscribe_start`       | First field interaction on an in-flow subscribe form       | `source`, `interest?`                  |
| `subscribe_complete`    | Successful `/api/subscribe`                                | `source`, `interest?`                  |
| `event_cta_click`       | Get-involved CTA (in-article or listing external/waitlist) | `event_id`, `source`                   |
| `event_signup_complete` | Successful on-site event signup (not honeypot)             | `event_id`, `source`                   |
| `article_scroll_depth`  | Article 25/50/75/100% (once each per page view)            | `depth`: `25` \| `50` \| `75` \| `100` |

`source` for in-flow blog modules is `blog:{slug}`. Listing CTAs use `events-listing`.

## 5. Runtime view

```text
Subscribe welcome (BLOG-01)
  POST /api/subscribe {email, interest?, source?}
    → upsert MailerLite subscriber fields
    → MailerLite automation matches interest (or general if empty)
    → send-once welcome

GA4 funnel (BLOG-02)
  Consent accepted → ConsentGate loads GTM
    → dataLayer.push({ event, ...params })
    → GA4 Explorations: subscribe_start → subscribe_complete
                    and event_cta_click → event_signup_complete
```

## 6. Cross-squad coordination

Operators configure MailerLite and GA4. No application deploy for BLOG-01 or BLOG-02. `MAILERLITE_API_KEY` must be a live token in Vercel (not the `.env.example` placeholder).

## 7. Error paths

| Failure                          | Behaviour                                                |
| -------------------------------- | -------------------------------------------------------- |
| No interest selected             | General welcome only; interest automations must not fire |
| Re-subscribe with a new interest | Prefer send-once; do not spam a second welcome           |
| Consent rejected                 | No `dataLayer` push (`ARCHITECTURE.md` §7.4)                 |
| MailerLite 4xx/5xx               | SITE-03 generic public error; log server-side            |

## 8. Observability

GA4 Explorations (no in-app admin page):

- **Blog — Subscribe funnel:** closed, steps `subscribe_start` → `subscribe_complete`, breakdown `source` then `interest`.
- **Blog — Participation funnel:** closed, steps `event_cta_click` → `event_signup_complete`, breakdown `event_id` / `source`. Step 2 is **on-site** signup only.

Register event-scoped custom dimensions: `source`, `interest`, `event_id`, `depth`.

DebugView: grant consent, trigger each event, confirm names/params, no PII. Negative check: reject consent → no custom events.

Build an in-app analytics page only if non-GA stakeholders need the funnel, Explorations cannot answer placement questions after dimensions are registered, or product wants Payload signup totals joined to CMS events.

## 9. Testing strategy

- **Already covered in-repo:** subscribe schema, analytics no-op without consent, published-only queries.
- **BLOG-01:** production curl per canonical interest + legacy `interests=regeneration`; inbox check for community CTA to `/get-involved/events/`.
- **BLOG-02:** GA DebugView with consent accepted and rejected.

## 10. Acceptance gates

- Community interest receives a community-oriented welcome linking to `https://carinyaparc.com.au/get-involved/events/`.
- Empty interest receives the general welcome only.
- Each welcome runs once per subscriber.
- Consent-granted DebugView shows all five event names; consent-rejected is quiet.
- Subscribe and participation funnel explorations saved in GA4.

## 11. Handoff

**Stable:** in-flow subscribe payload (`interest`, `source`); event catalog above; events listing at `/get-involved/events/`.

**Not delivered until BLOG-01/02 close:** live MailerLite welcomes; saved GA4 explorations.

**Next:** SITE-03 (generic subscribe errors) must not break MailerLite field upsert. MEDIA may add recipe/post OG images; do not change analytics event names without updating this TDD.

## 12. Open questions

1. **Re-subscribe policy.** Suppress a second welcome when interest changes (preferred) vs send a new one. Owner: product; decide during BLOG-01 MailerLite setup.
2. **Live API key.** Production `MAILERLITE_API_KEY` must be a real token before BLOG-01 can be verified. Owner: operator; blocking.
