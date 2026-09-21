# ADR-0001 — Astro + MDX replaces Payload CMS

**Status:** Accepted — 2026-09-21

**Related:** [`docs/astro-migration/PLAN.md`](../astro-migration/PLAN.md) (plan and phases), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (resulting architecture), [ADR-0002](ADR-0002-git-is-the-publish-gate.md) (publish gate)

## Context

The website is a content site with one editor, ten posts, four recipes, occasional events and four forms. It ran as a Next.js 16 application with Payload CMS 3 embedded in it and Neon Postgres behind it (`apps/site`).

The content pipeline was already git-first: agents authored seed JSON in pull requests, a human merged, a script imported the seeds into Payload as drafts, and the editor published from `/admin`. The CMS was a second copy of a workflow git already provided, and it carried most of the recent operational cost:

- Production and CI builds needed a live Postgres connection because static generation queried the database, so CI could not run `pnpm build`.
- Neon cold starts surfaced as production errors; the fix was a 30-second timeout.
- The public CSP had to allow `'unsafe-inline'` because the static shell could not nonce Next.js scripts, and the admin UI under production CSP was never verified.
- Revalidation hooks, cache tags, an ISR fallback and a mapping layer existed only to keep static pages in sync with a database.
- Images were stored as text paths; the media library was never built.
- Legal pages, listed in the sitemap, returned 404 in production, and pagination was missing — defects the CMS architecture made easy to leave unnoticed.

## Decision

Replace `apps/site` with `apps/web`: Astro 7 with MDX content collections, React 19 islands for the contact, subscribe, event-signup and consent components, `@astrojs/vercel` with `output: 'static'`, and four on-demand endpoints. Content moves out of Postgres into the repository at `content/` (posts, recipes, events and legal as MDX; authors and categories as YAML; `tags.json`; hero images) and is validated by Zod schemas in `apps/web/src/content.config.ts` on every build. Event signups go to a MailerLite group per event; there is no database, no admin UI and no capacity counting. Security headers and CSP are generated from `apps/web/src/lib/security/` into `vercel.json` and the Vercel build output. The migration is built alongside the old app, checked against a captured production baseline, and cut over by pointing the Vercel project at `apps/web`; `apps/site` is then deleted.

## Alternatives considered

**Next.js + MDX without Payload.** Keeps the framework the team knows and removes the database. Rejected because the operational problems were not only Payload's: the App Router still needs a server runtime for what is a static site, the CSP problem with inline scripts remains, and the client bundle stays heavier than the content warrants. Astro's content collections give schema validation, `reference()` and `image()` for free and render zero client JavaScript by default.

**Keep Payload and fix the debt.** Add the media library, verify the admin under CSP, move rate limits to a shared store, make builds tolerate database outages. Rejected because every item is work to keep a CMS that one editor uses, whose review workflow already lives in GitHub, and whose failure modes (cold starts, build-time database access) are structural.

**Headless CMS (hosted).** Remove the database from our infrastructure but keep a browser editor. Rejected because it reintroduces a second content pipeline and a vendor dependency for the core narrative content, which the product principles call for owning in git. A git-backed editor remains an option on top of this decision (see ADR-0002 and the roadmap).

## Consequences

**Positive**

- Builds are hermetic: CI builds every pull request with no secrets, and a schema or reference error fails the build before anything ships.
- No database, no admin surface, no session cookie; the attack surface is four validated endpoints and static HTML.
- Public pages are static HTML on the CDN with no client JavaScript unless a form or the consent banner is present.
- One content pipeline. Seed JSON, the import script, Lexical JSON, the mapper layer, revalidation hooks and cache tags are gone.
- Content history, review and rollback are git history, pull-request review and revert.
- Production defects found during the baseline (legal 404s, missing pagination, doubled title suffix, thin recipe structured data) are fixed in the new build and pinned by a parity test.

**Negative**

- There is no browser editing UI. Authors write MDX and open pull requests; previews replace draft preview. Whether this is enough for the owner is an open question the roadmap revisits.
- A content change requires a full build and deploy (a few minutes) rather than an on-demand revalidation. Event freshness is tied to deploys.
- Event signups no longer have a capacity count; `isFull` is a hand-set frontmatter flag and the list lives in MailerLite.
- The consent cookie is client-set and not httpOnly. Consent state is not sensitive; this is an accepted change.
- Rate limiting on the endpoints is still in-memory per function instance; durable control moves to a Vercel WAF rule at cut-over rather than a shared store.
- The mid-article inline subscribe form was not carried over; MDX bodies render whole.
- Astro and React coexist in one component tree (`.astro` for pages and chrome, `.tsx` for islands), which is a second idiom to maintain.
