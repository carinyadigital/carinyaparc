# ADR-0002 — Git is the publish gate

**Status:** Accepted — 2026-09-21

**Related:** [ADR-0001](ADR-0001-astro-mdx.md) (Astro + MDX platform), [`docs/astro-migration/PLAN.md`](../astro-migration/PLAN.md) §8 (editorial workflow), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §5.2 (publish runtime view)

## Context

With Payload, "agent stages, human publishes" was enforced by CMS access control: imported content arrived as drafts, and only an authenticated editor could set `_status: published`. Draft preview was Payload's preview URL. Removing the CMS (ADR-0001) removes that mechanism, so the gate needs a home that does not depend on an admin UI.

The repository already had the pieces: content agents work in branches and open pull requests, CI validates every pull request, and Vercel deploys a preview for each one.

## Decision

Publishing is merging to `main`. Specifically:

- **Human approval on `main`.** Branch protection requires at least one human approval and green CI before a merge. An agent can author, open and update a pull request; it cannot merge. This is the publish gate, enforced by GitHub rather than by CMS roles.
- **Vercel preview deployments are the draft preview.** Every pull request builds and deploys the whole site from that branch; the reviewer reads the actual rendered page before approving.
- **`draft: true` is the unpublished state on `main`.** Posts, recipes and events carry a `draft` flag in frontmatter. Production builds exclude drafts from pages, archives, the feed and the sitemap; `astro dev` shows them. A draft entry may be merged to `main` without being published.
- **The authoring contract for agents.** An agent writing content writes MDX or YAML under `content/` only, following the frontmatter contract in `docs/astro-migration/PLAN.md` §3 and the schemas in `apps/web/src/content.config.ts`; sets `draft: true` unless the brief says otherwise; never edits `apps/`, `packages/` or `.github/` in a content pull request; and leaves the merge to a human. Content review (`content-seo-review`) runs on the pull request.
- **No CMS-side state.** There is no second copy of a document's status anywhere. If it is on `main` without `draft: true`, it is published on the next deploy.

## Alternatives considered

**Keep Payload only as the approval step.** Rejected with ADR-0001; it would keep the database and admin UI for the one thing GitHub already does.

**Approval by a bot or a label instead of a human review.** Rejected: the point of the gate is that a person reads the rendered preview before it goes live.

**A hosted git-backed editor from day one** (Decap, Keystatic, GitHub's web editor with templates). Deferred, not rejected. Any such tool must commit to a branch and open a pull request so this gate is unchanged; the roadmap revisits it after a period of PR-based publishing.

## Consequences

**Positive**

- One review path for code and content, with the same protections and audit trail.
- Preview is the real site built from the real branch, not a CMS approximation.
- Path-scoped CODEOWNERS can route content-only pull requests to the editor and code changes to engineering.
- Rollback of a bad publish is `git revert` and a deploy.

**Negative**

- Publishing latency is a build and deploy, not a button; dated content (events) goes stale between merges unless a scheduled deploy is added.
- The editor needs a GitHub account and a basic pull-request habit, or a tool that hides it.
- `draft: true` is the only scheduling mechanism; there is no publish-at date.
- Branch protection is configuration outside the repository. If it is loosened, the gate is gone with no signal in the code; the setting is part of the cut-over checklist and should be reviewed when access changes.
