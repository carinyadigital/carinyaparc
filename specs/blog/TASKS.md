---
type: Tasks
epic: blog
epic_id: BLOG
version: '0.3'
owner: blog
status: In progress
last_updated: 2026-08-13
related:
  - specs/blog/tdd.md
  - docs/ARCHITECTURE.md
---

# Tasks — Blog (BLOG)

Remaining operator work on the shipped blog surface. Canonical AC lives here. Design: [`./tdd.md`](tdd.md).

## 1. Summary

- **Epic.** BLOG — reader journey (shipped) + welcome routing and funnel measurement (open)
- **Phase / Priority.** Ops follow-through · P1
- **Estimate.** 2 points across 2 tasks
- **Depends on.** Shipped `/api/subscribe` fields and `lib/analytics/` instrumentation (in repo)

**Scope.** Configure MailerLite welcome automations from the interest map in tdd.md §4; register GA4 dimensions and save funnel explorations per tdd.md §8.

**Out of scope.** Rebuilding archives, subscribe UI, events, or analytics helpers. In-app admin analytics page (tdd.md §8).

**MVP.** BLOG-01 — a test signup with `interest=community` receives the community welcome linking to `/get-involved/events/`.

## 2. Conventions

| Convention | Value                      |
| ---------- | -------------------------- |
| Task ID    | `BLOG-{nn}` — never reused |
| Acceptance | Gherkin per task           |
| Estimate   | Fibonacci story points     |

## 3. Tasks

- [ ] **[BLOG-01]** Configure MailerLite welcome automations — MailerLite dashboard (external)
  - **Status:** Open | **Priority:** P1 | **Estimate:** 1
  - **Depends on:** live `MAILERLITE_API_KEY` in Vercel (not the `.env.example` placeholder)
  - **Deliverable:** Custom fields + six automations per tdd.md §4; send-once; production verification curls. No application deploy.
  - **Design:** [`./tdd.md`](tdd.md) §4, §5, §7, §10
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Community interest routes the welcome
      Given a new subscriber who selected "Community involvement"
      When /api/subscribe records them
      Then MailerLite sends the community-oriented welcome
      And that welcome links to https://carinyaparc.com.au/get-involved/events/

    Scenario: Canonical interest fields are persisted
      Given a new test email posted with interest "restoration"
      When the MailerLite subscriber profile is read
      Then fields.interest and fields.interests both equal "restoration"
      And the restoration welcome automation runs

    Scenario: Legacy interests value is mapped
      Given a new test email posted with interests "regeneration"
      When the MailerLite subscriber profile is read
      Then fields.interest and fields.interests both equal "restoration"

    Scenario: Empty interest gets the general welcome only
      Given a new subscriber with no interest field
      When they are upserted
      Then Welcome — General runs
      And no interest-specific welcome runs

    Scenario: Welcomes run once per subscriber
      Given a subscriber who already received a welcome
      When they submit the form again
      Then a second welcome is not sent
    ```

  Operator checklist (mark here when done):

  - [ ] Custom fields `interest`, `interests`, `source`, `name` (text)
  - [ ] Six automations named per tdd.md §4, enabled, send-once
  - [ ] Interest-specific rules evaluated before general (or general scoped to empty fields)
  - [ ] Production curl per canonical interest + legacy `regeneration` (tdd.md §9)
  - [ ] Dated operator note on this task when signed off

- [ ] **[BLOG-02]** [P] Funnel dashboard in GA4 — GA4 Explorations + DebugView
  - **Status:** Open | **Priority:** P2 | **Estimate:** 1
  - **Depends on:** —
  - **Deliverable:** Custom dimensions and two saved funnel explorations per tdd.md §8; DebugView verification with consent accepted and rejected. No in-app admin page.
  - **Design:** [`./tdd.md`](tdd.md) §4, §8, §10
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Subscribe funnel events fire
      Given a reader using an in-article subscribe module with consent granted
      When they start and complete the form
      Then subscribe_start and subscribe_complete are recorded with source and interest

    Scenario: Participation funnel events fire
      Given an article CTA and an event signup
      When a reader clicks the CTA and completes signup
      Then event_cta_click and event_signup_complete are recorded with the event id and source

    Scenario: Article scroll depth recorded
      Given a reader with consent granted scrolls through an article
      When they reach 25/50/75/100% depth
      Then an article_scroll_depth event is recorded with the depth reached

    Scenario: Consent rejected suppresses events
      Given analytics consent is rejected
      When the reader interacts with subscribe, CTA, or scroll
      Then no matching custom events appear in DebugView
    ```

  Operator checklist:

  - [ ] Custom dimensions registered for `source`, `interest`, `event_id`, `depth`
  - [ ] Subscribe funnel exploration saved (closed, breakdown by source)
  - [ ] Participation funnel exploration saved (closed, breakdown by event_id / source)
  - [ ] DebugView verified with consent **accepted** for all five event names
  - [ ] DebugView quiet when consent **rejected**
  - [ ] Admin analytics page **not** created

## 4. Dependencies and Definition of Done

```text
Shipped blog surface
  ├─ BLOG-01  MailerLite welcomes (ops)
  └─ BLOG-02  GA4 explorations (ops, parallel)
```

- **DoD:** both Gherkin sets pass in production MailerLite + GA DebugView; tdd.md §10 gates met; no new in-app analytics route.

## 5. Handoff

In-repo blog work stays shipped. Operators own BLOG-01 and BLOG-02. SITE-03 (generic subscribe errors) must not strip `interest` / `source` from the MailerLite upsert.
