# ADR-0001 — Astro + MDX is the platform for carinyaparc.com.au

**Status:** Accepted — 2026-09-21

**Related:** [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (architecture), [ADR-0002](ADR-0002-git-is-the-publish-gate.md) (publish gate)

## Context

carinyaparc.com.au is a content site for a regenerative farm: marketing pages, a small blog, a handful of recipes, occasional events, and four forms (contact, subscribe, event signup, consent). There is one editor. The product needs to stay fast on regional connections, own its narrative in git, and keep the operational surface small.

The platform has to make a static marketing-and-content site cheap to run and hard to break: hermetic CI builds, schema-checked content, almost no client JavaScript, and no database behind public pages.

## Decision

The public site is Astro 7 with MDX content collections, React 19 islands for the contact, subscribe, event-signup and consent components, `@astrojs/vercel` with `output: 'static'`, and four on-demand endpoints. Content lives in the repository at `content/` (posts, recipes, events and legal as MDX; authors and categories as YAML; `tags.json`; images) and is validated by Zod schemas in `apps/web/src/content.config.ts` on every build. Event signups go to a MailerLite group per event; there is no database, no admin UI and no capacity counting. Security headers and CSP are generated from `apps/web/src/lib/security/` into `vercel.json` and the Vercel build output.

## Alternatives considered

**Next.js + MDX.** Keeps a React-first framework and can still put content in git. Rejected because the App Router still assumes a server runtime for what is a static site, CSP remains awkward with inline scripts, and the client bundle is heavier than this content warrants. Astro's content collections give schema validation, `reference()` and `image()` without extra mapping, and pages render zero client JavaScript by default.

**Embedded CMS (Payload or similar) with a database.** A browser editor and draft/publish in the admin UI. Rejected because one editor already reviews in GitHub, and a CMS adds a second copy of the content, a database for static generation, and an admin surface the public site does not need. Failure modes (build-time database access, cold starts) are structural, not bugs to patch.

**Headless CMS (hosted).** Removes the database from our infrastructure but keeps a browser editor. Rejected because it reintroduces a second content pipeline and a vendor dependency for the core narrative, which the product principles call for owning in git. A git-backed editor remains an option on top of this decision (see ADR-0002 and the roadmap).

## Consequences

**Positive**

- Builds are hermetic: CI builds every pull request with no secrets, and a schema or reference error fails the build before anything ships.
- No database, no admin surface, no session cookie; the attack surface is four validated endpoints and static HTML.
- Public pages are static HTML on the CDN with no client JavaScript unless a form or the consent banner is present.
- One content pipeline. Content history, review and rollback are git history, pull-request review and revert.

**Negative**

- There is no browser editing UI. Authors write MDX and open pull requests; Vercel preview deployments are the draft preview. Whether this is enough for the owner is an open question the roadmap revisits.
- A content change requires a full build and deploy (a few minutes) rather than on-demand revalidation. Event freshness is tied to deploys.
- Event signups have no capacity count; `isFull` is a hand-set frontmatter flag and the list lives in MailerLite.
- The consent cookie is client-set and not httpOnly. Consent state is not sensitive; this is accepted.
- Rate limiting on the endpoints is in-memory per function instance; durable abuse control is a Vercel WAF rule, not a shared store.
- Astro and React coexist in one component tree (`.astro` for pages and chrome, `.tsx` for islands), which is a second idiom to maintain.
