---
type: Solution Design
mode: full
work_id: analytics
work_short_name: analytics
version: '0.2'
owner: engineering
status: Reviewed
last_updated: 2026-10-18
related:
  - docs/ARCHITECTURE.md
  - specs/blog/design.local.md
  - https://www.rudderstack.com/docs/event-spec/standard-events/track/
  - WEB-53
  - WEB-24
  - WEB-69
  - WEB-28
---

# Solution Design — Analytics event spec (`analytics`)

Solution Design for `analytics` at `specs/analytics/`. Architecture-wide patterns are authoritative in [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and are not repeated here.

Tracker: [WEB-53](https://linear.app/carinyadigital/issue/WEB-53). This design replaces the event-name contract in [`specs/blog/`](../blog/design.local.md). [WEB-24](https://linear.app/carinyadigital/issue/WEB-24) calls the renamed helper. [WEB-69](https://linear.app/carinyadigital/issue/WEB-69) rebuilds explorations. [WEB-28](https://linear.app/carinyadigital/issue/WEB-28) is canceled and does not define names.

The public site is the Astro app at `apps/web`. Consent lives in `lib/consent/client.ts`. `initAnalytics()` loads Google Tag Manager and Vercel Analytics, and `track()` in `lib/analytics/client.ts` sends to both through `gtm.ts` and `vercel.ts`. This work changes what `track()` sends, not how analytics loads.

## 1. Scope

One track catalog for the Astro site (`apps/web`), shaped like a [RudderStack track call](https://www.rudderstack.com/docs/event-spec/standard-events/track/): a human-readable past-tense name, and a `properties` object. Historical snake_case names are dropped. GA4 explorations may be rebuilt.

**In scope**

| Slice   | Capability                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| Catalog | Ten track events. Names are nouns plus a past-tense verb, with spaces and capitals.                                  |
| Payload | `dataLayer` push is `{ event, properties }`. Vercel Analytics receives the same name and the same properties object. |
| Contact | Contact-form events go through `track()`, so they reach GTM and respect consent.                                     |
| GTM     | Container triggers match the human name. Each GA4 tag stores a snake_case event name.                                |

**Out of scope**

- RudderStack `identify`, `page`, `screen`, `group`, `alias`, or the common-fields envelope (`anonymousId`, `userId`, `context`, `timestamp`, `type`)
- The [ecommerce event catalog](https://www.rudderstack.com/docs/event-spec/ecommerce-events-spec/)
- Wiring Get involved / listing CTA clicks ([WEB-24](https://linear.app/carinyadigital/issue/WEB-24) still owns that; it must call the renamed helper)
- New events on surfaces that are silent today: the `page` variant of `SubscribeForm`, used by the header subscribe modal and `/subscribe/`
- How consent is stored or how analytics loads (`lib/consent/`, `initAnalytics()`, `loadGtm()`, `loadVercel()`)
- MailerLite fields, welcome automations ([WEB-25](https://linear.app/carinyadigital/issue/WEB-25))
- An in-app analytics page

## 2. Architecture fit

Fits [`ARCHITECTURE.md` §6 Consent](../../docs/ARCHITECTURE.md#consent): `initAnalytics()` loads Google Tag Manager and Vercel Analytics only after `cp_consent=accepted`. `getConsent()` is synchronous, and `track()` no-ops without consent. No new endpoint, island, cookie, or CSP host.

Today `pushToDataLayer()` in `apps/web/src/lib/analytics/gtm.ts` pushes `{ event, ...params }`. After this change, parameters live under `properties`. Record that in [`ARCHITECTURE.md` §8 Observability](../../docs/ARCHITECTURE.md#observability), which does not describe the push today.

Quality goals this slice must meet, in [`ARCHITECTURE.md` §1 Quality Goals](../../docs/ARCHITECTURE.md#quality-goals) order: trust (no email, name, or message body in properties; no free-text error), maintainability (one catalog in `lib/analytics/`; only `gtm.ts` touches the dataLayer and only `vercel.ts` touches `va`).

GA4 cannot store an event name that contains a space. The site keeps the human name. The GA4 tag’s event-name field is the only translation, and it is a new name, not an alias of the old one.

## 3. Files and components

### Evolve

| Path                                                                                                   | Change                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/lib/analytics/types.ts`                                                                  | Replace `ANALYTICS_EVENTS` and param types with §4. `event_id` is `string` only.                                                                                                                                         |
| `apps/web/src/lib/analytics/events.ts`                                                                 | One helper per event. Each passes a `properties` object to `track()`; omit keys whose value is `undefined`.                                                                                                              |
| `apps/web/src/lib/analytics/client.ts`                                                                 | `track(event, properties)` keeps its consent check and stays synchronous, then calls `pushToDataLayer(event, properties)` and `trackVercel(event, properties)`. Export the renamed helpers.                              |
| `apps/web/src/lib/analytics/gtm.ts`                                                                    | `pushToDataLayer` pushes `{ properties: null }`, then `{ event, properties }`.                                                                                                                                           |
| `apps/web/src/lib/analytics/vercel.ts`                                                                 | `trackVercel` calls `va('track', event, properties)` with the same object.                                                                                                                                               |
| `apps/web/src/lib/analytics/client.test.ts`                                                            | Assert the nested payload, the null reset, and the same object to Vercel.                                                                                                                                                |
| `apps/web/src/lib/analytics/scroll-depth.ts`                                                           | Call `trackArticleScrolled({ percent_scrolled })`. Thresholds stay 25 / 50 / 75 / 100, once each per page view.                                                                                                          |
| `apps/web/src/components/newsletter/SubscribeForm.tsx`                                                 | The in-flow variants call `trackNewsletterSubscriptionStarted` / `trackNewsletterSubscribed`: `InlineSubscribeForm` (`band`, `stay`, `compact`, `card`) and `EndSubscribeForm` (`end`). The `page` variant stays silent. |
| `apps/web/src/components/islands/EventSignup.tsx`                                                      | `trackEventSignupCompleted`. Still not on the honeypot short-circuit.                                                                                                                                                    |
| `apps/web/src/lib/contact/client.ts`                                                                   | `postContact` throws `Error` today and drops `response.status`. Keep the status so Failed can map `error_code`.                                                                                                          |
| `apps/web/src/components/islands/ContactForm.tsx`                                                      | Delete the local `trackContact` (it calls `window.va` directly and sends `error: err.message`). Use the contact helpers. Carry `inquiry_type` on Submitted and Completed.                                                |
| Tests that mock the helpers (`SubscribeForm.test.tsx`, `EventSignup.test.tsx`, `scroll-depth.test.ts`) | New helper names and argument shapes.                                                                                                                                                                                    |

### Operator (no app files)

| Surface | Change                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| GTM     | Custom Event triggers for each human name. Data Layer variables at `properties.*`. GA4 tags use the snake_case names in §8. |
| GA4     | New explorations on the new names. Do not alias the old event names.                                                        |

### Do not modify

`lib/consent/`, `ConsentGate`, `initAnalytics()`, `loadGtm()` and `loadVercel()`. The newsletter and contact schemas, the MailerLite and Resend adapters, and the endpoint handlers. `source` strings (`blog:{slug}`, `stay`, `events-listing`, `subscribe-page`, `regenerate`, `header-modal`) stay as they are; this work does not invent placements. Scroll binding stays in `apps/web/src/lib/analytics/scroll-depth.ts`, called from `components/blog/ArticleScrollDepth.astro`.

## 4. Data contracts

```typescript
/** Human-readable track names. GA4 tags translate these; the site does not. */
const ANALYTICS_EVENTS = {
  newsletterSubscriptionStarted: 'Newsletter Subscription Started',
  newsletterSubscribed: 'Newsletter Subscribed',
  eventSelected: 'Event Selected',
  eventSignupCompleted: 'Event Signup Completed',
  articleScrolled: 'Article Scrolled',
  contactFormViewed: 'Contact Form Viewed',
  contactFormStarted: 'Contact Form Started',
  contactFormSubmitted: 'Contact Form Submitted',
  contactFormCompleted: 'Contact Form Completed',
  contactFormFailed: 'Contact Form Failed',
} as const;

type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type ScrollDepth = 25 | 50 | 75 | 100;

type SubscribeInterest =
  'restoration' | 'regenerative-farming' | 'community' | 'produce' | 'beef' | 'learning';

type InquiryType = 'general' | 'tours' | 'volunteer' | 'partnership';

type ContactErrorCode = 'invalid' | 'rate_limited' | 'unavailable' | 'request_failed';

type NewsletterProperties = {
  source: string;
  interest?: SubscribeInterest;
};

type EventProperties = {
  event_id: string;
  source: string;
};

type ArticleScrolledProperties = {
  percent_scrolled: ScrollDepth;
};

type ContactFormProperties = {
  form_id: 'contact';
  inquiry_type?: InquiryType;
  error_code?: ContactErrorCode;
};

type DataLayerTrack = {
  event: AnalyticsEventName;
  properties:
    NewsletterProperties | EventProperties | ArticleScrolledProperties | ContactFormProperties;
};

/** Consent-gated. No-ops when consent is missing or rejected. */
function track(event: AnalyticsEventName, properties: DataLayerTrack['properties']): void;
```

`properties` never includes `email`, `name`, message body, or a free-text error. Reserved track keys `revenue`, `currency`, and `value` stay unset.

HTTP status → `error_code`: `400` → `invalid`, `429` → `rate_limited`, `503` → `unavailable`, anything else including a thrown network error → `request_failed`.

## 5. Runtime view

```text
Caller (island or scroll-depth)
  → trackX(properties)              // events.ts; undefined keys omitted
  → track(event, properties)        // client.ts; synchronous
       getConsent() !== 'accepted' → return
       gtm.ts     dataLayer.push({ properties: null })     // drop the previous event's keys
                  dataLayer.push({ event: "Newsletter Subscribed", properties })
       vercel.ts  va('track', "Newsletter Subscribed", properties)

GTM Custom Event trigger matches the human name
  → GA4 tag event name = snake_case row in §8
  → parameters from Data Layer Variable properties.source, properties.interest, …
```

`properties: null` is required, and it belongs in `gtm.ts` only. GTM merges the data layer model across pushes; without the reset, `interest` from a newsletter event would still be present on a later contact event in the same page.

Subscribe and event-signup honeypot short-circuits still return before the complete helper, as they do today. Contact has no client honeypot branch; a honeypot that the API answers with 200 may emit `Contact Form Completed`. Do not add a response field that distinguishes it.

`Event Selected` has a helper and no caller until WEB-24. On-site `EventSignup` does not emit `Event Selected`.

Page views stay on GTM’s container. This work does not push a `page` call.

## 6. Cross-squad coordination

| Who         | Notes                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineering | Astro catalog, payload, and contact path in `apps/web`. Land before WEB-69 DebugView.                                                                    |
| WEB-24      | Call `trackEventSelected({ event_id, source })` from the Astro call sites. Do not keep `event_cta_click`.                                                |
| Operator    | Retire snake_case Custom Event triggers. Add the ten human-name triggers and the GA4 name map in §8. Rebuild explorations on WEB-69. WEB-28 is canceled. |

## 7. Error paths

| Failure                                             | Behaviour                                                                                                                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consent missing or rejected                         | No dataLayer push and no `va` call ([`ARCHITECTURE.md` §6 Consent](../../docs/ARCHITECTURE.md#consent))                                                                                |
| `window` / `dataLayer` / `va` absent                | That sink is skipped. The other still runs when it exists.                                                                                                                             |
| Subscribe or signup honeypot                        | Complete helper does not run                                                                                                                                                           |
| Subscribe or signup API error                       | Started may already have fired. Subscribed / Signup Completed does not fire                                                                                                            |
| Contact API error                                   | `Contact Form Failed` with `error_code` from `response.status` (a thrown `fetch` is `request_failed`). `inquiry_type` may be included. The message shown in the form is not a property |
| Contact validation before submit                    | No Failed event. Failed means the request was sent and did not succeed                                                                                                                 |
| Article shorter than a threshold, or no `<article>` | That depth does not fire. Binding stays a no-op without an article                                                                                                                     |

## 8. Observability

DebugView, with consent accepted: each event name below, properties only, no email. With consent rejected: none of them.

| dataLayer `event`                 | GA4 event name                    | Properties                              |
| --------------------------------- | --------------------------------- | --------------------------------------- |
| `Newsletter Subscription Started` | `newsletter_subscription_started` | `source`, `interest`                    |
| `Newsletter Subscribed`           | `newsletter_subscribed`           | `source`, `interest`                    |
| `Event Selected`                  | `event_selected`                  | `event_id`, `source`                    |
| `Event Signup Completed`          | `event_signup_completed`          | `event_id`, `source`                    |
| `Article Scrolled`                | `article_scrolled`                | `percent_scrolled`                      |
| `Contact Form Viewed`             | `contact_form_viewed`             | `form_id`                               |
| `Contact Form Started`            | `contact_form_started`            | `form_id`                               |
| `Contact Form Submitted`          | `contact_form_submitted`          | `form_id`, `inquiry_type`               |
| `Contact Form Completed`          | `contact_form_completed`          | `form_id`, `inquiry_type`               |
| `Contact Form Failed`             | `contact_form_failed`             | `form_id`, `inquiry_type`, `error_code` |

`article_scrolled` must not be sent to GA4 as `scroll`. That name belongs to enhanced measurement.

Suggested explorations, rebuilt rather than edited: `Newsletter Subscription Started` → `Newsletter Subscribed` (breakdown `source`, then `interest`); `Event Selected` → `Event Signup Completed` (breakdown `event_id`, `source`) once WEB-24 fires step 1. Contact is a separate path: Viewed → Started → Submitted → Completed, with Failed beside Submitted.

Event-scoped dimensions: `source`, `interest`, `event_id`, `percent_scrolled`, `form_id`, `inquiry_type`, `error_code`.

## 9. Testing strategy

Unit tests in `lib/analytics/client.test.ts` (jsdom), with consent set through `setConsent()`:

- Accepted consent pushes `{ properties: null }` and then `{ event, properties }` with no top-level param keys, and calls `va('track', event, properties)` with the same object. Cover this through `track()`.
- Rejected or missing consent pushes nothing.
- Newsletter helper omits `interest` when it is undefined.
- `percent_scrolled` is `25` \| `50` \| `75` \| `100`.

Contact island test: success calls Completed with `form_id: 'contact'` and `inquiry_type`; a non-OK response calls Failed with `error_code` and does not include the response message. A `lib/contact/client.test.ts` case checks that a non-OK response keeps its status. No browser e2e ([`ARCHITECTURE.md` §8 Testing](../../docs/ARCHITECTURE.md#testing)).

## 10. Acceptance gates

- Every shipped caller in the Astro app uses a name from §4. A search under `apps/web` finds none of: `subscribe_start`, `subscribe_complete`, `event_cta_click`, `event_signup_complete`, `article_scroll_depth`, `contact_form_viewed`, `contact_form_started`, `contact_form_submitted`, `contact_form_success`, `contact_form_error`.
- A consented subscribe completion pushes `Newsletter Subscribed` with `properties.source` and, when set, `properties.interest`, and the same object to Vercel Analytics.
- A consented contact failure pushes `Contact Form Failed` with `error_code` and without the error string.
- The following push does not inherit `interest` or `inquiry_type` from the previous one (`properties: null` first).
- Rejected consent produces an empty `dataLayer` from these helpers.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.

## 11. Handoff

**Stable on close:** the §4 catalog and the two-push payload on the Astro site (`apps/web`). Contact events visible to GTM. Old names gone from `apps/web`.

**Not delivered:** GTM triggers and GA4 explorations (operator, WEB-64 and WEB-69). `Event Selected` from Get involved and listing CTAs (WEB-24). Newsletter events from the header modal and `/subscribe/`.

**Next:** WEB-24 against `trackEventSelected` on the Astro site. Then WEB-69 DebugView and the explorations on the human names. `ARCHITECTURE.md` §8 Observability should mention `properties`.

## 12. Open questions

None for the app contract. The name list, nested payload, and GA4 translation are decided.
