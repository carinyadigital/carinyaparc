---
type: Technical Design
mode: full
work_id: MEDIA
epic_slug: media
version: '0.1'
owner: site
status: Draft
last_updated: 2026-08-13
related:
  - specs/media/TASKS.md
  - docs/ARCHITECTURE.md
---

# Technical Design — Media library (MEDIA)

Technical design for MEDIA at `specs/media/`. Architecture-wide patterns are authoritative in [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and are cited here, not repeated.

## 1. Scope

### In scope

| Capability                     | Description                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Media collection**           | Payload `upload` collection (`media`) with required `alt` text, MIME allow-list for raster images, and `sharp`-generated size variants. Public read; authenticated create/update/delete. |
| **Persistent storage**         | Vercel Blob via `@payloadcms/storage-vercel-blob` in production (and staging). Local filesystem fallback when `BLOB_READ_WRITE_TOKEN` is absent (docker dev).                            |
| **Hero upload relations**      | Replace interim text-path fields on `posts`, `recipes`, and `authors` with upload relationships to `media`.                                                                              |
| **Mapper + UI DTOs**           | Shared helpers resolve populated `Media` documents to Next.js-friendly `src`, absolute URL, width/height, and `alt` for cards, metadata, and JSON-LD.                                    |
| **Public rendering**           | Blog post cards, featured posts, and recipe detail pages render hero images through `next/image` with media `alt` text (not post title as a substitute).                                 |
| **Metadata wiring**            | Blog post `generateMetadata`, Open Graph, Twitter, and Article JSON-LD consume resolved media URLs and alt where a hero image exists.                                                    |
| **Backfill migration**         | Idempotent script seeds `media` records from existing `public/` paths referenced on live documents, links relations, and removes interim text fields after verification.                 |
| **Architecture documentation** | Resolve the media migration open question in `ARCHITECTURE.md` §10.3; update §6.3 invariants and §10.2 debt lines; supersede ADR-005 interim decision.                                       |
| **Revalidation compatibility** | No new hook surface required for hero-only edits — existing revalidation hooks revalidate public routes when a document with a hero image is saved.                                      |

### Out of scope (defer)

| Deferred item                                     | Epic / reason                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Rich-text inline upload blocks                    | editor tooling — Lexical toolbar and embed renderer.                                       |
| Per-document SEO / social image overrides         | SEO metadata — `ogImage` fields reference `media` there.                                   |
| Homepage hero via Globals                         | site globals — global hero image uses the same `media` collection.                         |
| Stay page photography                             | Stay information — Stay-specific imagery and copy.                                         |
| Video, PDF, or SVG uploads                        | Images only for MEDIA; SVG remains static in `public/` (favicons, placeholders).           |
| Replacing all static marketing images             | `(www)` sections keep hard-coded `public/images/*` until site globals.                     |
| CDN beyond Vercel / Next image pipeline           | `ARCHITECTURE.md` §1 non-goals.                                                                |
| Media-only admin edits revalidating all referrers | Optional follow-up hook; not required for roadmap gate (editors re-save parent doc today). |
| Automated production upload E2E in CI             | Manual admin upload + public URL verification satisfies Phase 1 gate.                      |

### Capability map (for tasks skill)

| Capability                        | Suggested task theme                              |
| --------------------------------- | ------------------------------------------------- |
| Media collection + storage plugin | Schema, access, sizes, env vars                   |
| Collection field migration        | Posts, recipes, authors upload relations          |
| Media resolver helpers            | `lib/payload/media.ts` + unit tests               |
| Mapper and Post DTO updates       | `map-content.ts`, `posts.ts`, component alt usage |
| Blog public routes                | Cards, featured, detail metadata + JSON-LD        |
| Recipe hero on detail page        | Query depth, page render, schema image            |
| Backfill script                   | Seed from `public/` paths, operator runbook       |
| `ARCHITECTURE.md` + env docs          | Close §10.3; update debt and invariants           |
| Production verification           | Admin upload → public page with alt               |

## 2. Architecture fit

| Concern                    | How this epic fits                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Embedded CMS monolith      | Media uploads and public file serving stay inside the same Next.js app via Payload's `/api/media/file/*` routes (`ARCHITECTURE.md` §3.1).                              |
| Interim text-path fields   | Supersedes ADR-005 and `ARCHITECTURE.md` §6.3 interim invariant; mapping layer absorbs Payload shape change (`ARCHITECTURE.md` §3.2).                                      |
| `sharp` already configured | `payload.config.ts` exports `sharp`; size variants run at upload time without new image pipeline dependencies.                                                     |
| Next.js image config       | `next.config.mjs` already allows `/images/**` and `/api/media/file/**` via `localPatterns`; add `remotePatterns` only if Blob URLs are absolute third-party hosts. |
| Query layer                | Increase population depth where needed so hero and author photo relations resolve in one query (depth `1` suffices for direct relations).                          |
| Content mapper             | UI components keep stable list DTOs (`Post.imageUrl`, new `Post.imageAlt`); resolver hides Payload `Media` shape (`ARCHITECTURE.md` §4.2).                             |
| Revalidation               | revalidation hooks on posts/recipes already bust cache when hero relation changes; media collection hooks deferred (see out of scope).                             |
| Accessibility              | Meaningful `alt` enforced at upload time per `docs/PRINCIPLES.md` §15 and roadmap Phase 1 quality gate.                                                                 |
| Performance                | Serve card/hero sizes from Payload variants; `next/image` `sizes` unchanged on existing components.                                                                |

## 3. Files and components

### New

| Path                                                  | Purpose                                                                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/site/src/collections/Media.ts`                  | Upload collection: required `alt`, `imageSizes`, MIME allow-list, admin columns.                                                                                           |
| `apps/site/src/lib/payload/media.ts`                  | `resolveMediaSrc`, `resolveMediaUrl`, `resolveMediaAlt`, `resolveMediaDimensions` — populated `Media` or ID → display values; legacy path fallback during backfill window. |
| `apps/site/src/lib/payload/media.test.ts`             | Unit tests for resolver edge cases (populated doc, missing alt, size variant, legacy string fallback).                                                                     |
| `apps/site/scripts/backfill-media-from-paths.ts`      | Idempotent CLI: scan posts/recipes/authors for interim paths, create/link `media`, log summary. Operator-run against target DB.                                            |
| `apps/site/scripts/backfill-media-from-paths.test.ts` | Unit tests for path dedupe and alt derivation logic (extract pure functions where practical).                                                                              |

### Modified

| Path                                                       | Change                                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/site/src/payload.config.ts`                          | Register `Media` collection; conditionally enable `@payloadcms/storage-vercel-blob` when `BLOB_READ_WRITE_TOKEN` is set.                               |
| `apps/site/src/collections/Posts.ts`                       | Replace text `image` with `upload` relation `heroImage` → `media` (required on publish — enforce via field `required: true` or validate hook).         |
| `apps/site/src/collections/Recipes.ts`                     | Same `heroImage` upload relation.                                                                                                                      |
| `apps/site/src/collections/Authors.ts`                     | Replace text `imageUrl` with `photo` upload relation → `media`.                                                                                        |
| `apps/site/src/lib/payload/map-content.ts`                 | Resolve hero and author photo via `media.ts`; add `imageAlt` to list mapping; extend recipe detail DTO with optional hero fields.                      |
| `apps/site/src/lib/posts.ts`                               | Add `imageAlt: string` to `Post` interface.                                                                                                            |
| `apps/site/src/lib/payload/map-content.test.ts`            | Fixtures use populated `Media` objects; assert `imageAlt`.                                                                                             |
| `apps/site/src/collections/blog-collections.test.ts`       | Assert `Media` registered; posts/recipes/authors field shapes; `heroImage` / `photo` relations.                                                        |
| `apps/site/src/components/sections/blog/PostCard.tsx`      | Use `post.imageAlt` for hero `Image` alt (keep author avatar decorative `alt=""` if photo present).                                                    |
| `apps/site/src/components/sections/blog/FeaturedPosts.tsx` | Same alt wiring.                                                                                                                                       |
| `apps/site/src/components/sections/SectionFromBlog.tsx`    | Same alt wiring for embedded post previews.                                                                                                            |
| `apps/site/src/app/(blog)/blog/[slug]/page.tsx`            | Metadata and Article JSON-LD use resolved media URL + alt.                                                                                             |
| `apps/site/src/app/(recipes)/recipes/[slug]/page.tsx`      | Render hero when present; metadata/schema image when hero exists.                                                                                      |
| `apps/site/next.config.mjs`                                | Confirm `localPatterns` / `remotePatterns` cover Payload and Blob URLs after storage lands.                                                            |
| `apps/site/.env.example`                                   | Document `BLOB_READ_WRITE_TOKEN` (and store name if required by plugin).                                                                               |
| `turbo.json`                                               | Add blob env vars to build/lint/typecheck `env` lists.                                                                                                 |
| `docs/ARCHITECTURE.md`                            | §6.2 add Media entity; §6.3 replace interim image invariant; §10.2 remove text-path and unused media-route debt; §10.3 close media migration question. |

### Not modified

| Path                                      | Reason                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `apps/site/src/lib/payload/revalidate.ts` | revalidation paths sufficient when parent document saves.                  |
| `apps/site/src/components/rich-text/*`    | Inline media embeds are editor tooling.                                    |
| `apps/site/src/lib/metadata/index.ts`     | Generic helpers unchanged; page-level metadata passes resolved URLs.       |
| `apps/site/src/app/(www)/page.tsx`        | Marketing hero remains static `public/` until site globals.                |
| `apps/site/public/images/**`              | Retained for static pages and backfill source files; not deleted in MEDIA. |

## 4. Data contracts

### Payload — `media` collection

```typescript
import type { CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media', // dev fallback when Blob plugin disabled
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: undefined, position: 'centre' },
      { name: 'card', width: 800, height: undefined, position: 'centre' },
      { name: 'hero', width: 1920, height: undefined, position: 'centre' },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      maxLength: 200,
    },
  ],
  // access: publicRead read, authenticated write — match Authors pattern
};
```

### Collection field changes

```typescript
// Posts.ts / Recipes.ts — replace text `image`
{
  name: 'heroImage',
  type: 'upload',
  relationTo: 'media',
  required: true,
  admin: { description: 'Hero image for cards and social previews.' },
}

// Authors.ts — replace text `imageUrl`
{
  name: 'photo',
  type: 'upload',
  relationTo: 'media',
  admin: { description: 'Author headshot for bylines.' },
}
```

Generated `payload-types.ts` will expose `heroImage?: (number | null) | Media` on posts/recipes and `photo?: (number | null) | Media` on authors after `pnpm generate:types`.

### Resolver helpers (`lib/payload/media.ts`)

```typescript
import type { Media } from '@/payload-types';

export type MediaSize = 'thumbnail' | 'card' | 'hero' | 'og' | 'original';

export type ResolvedMedia = {
  src: string; // path or absolute URL suitable for next/image
  url: string; // absolute URL for OG/JSON-LD
  alt: string;
  width?: number;
  height?: number;
};

export function resolveMedia(
  value: number | Media | null | undefined,
  options?: { size?: MediaSize; fallbackAlt?: string },
): ResolvedMedia | null;

/** @deprecated remove after backfill — interim text path under public/ */
export function resolveLegacyPublicPath(
  path: string | null | undefined,
  fallbackAlt: string,
): ResolvedMedia | null;
```

### UI list DTO (`lib/posts.ts`)

```typescript
export interface Post {
  // ...existing fields...
  imageUrl: string; // resolved src path for next/image
  imageAlt: string; // required when imageUrl is not a fallback placeholder
}
```

Recipe detail DTO extension:

```typescript
export type RecipeDetail = {
  // ...existing fields...
  heroImageUrl?: string;
  heroImageAlt?: string;
};
```

### Backfill script inputs

```typescript
type BackfillSummary = {
  mediaCreated: number;
  mediaReused: number;
  postsUpdated: number;
  recipesUpdated: number;
  authorsUpdated: number;
  skippedPaths: string[];
};
```

Alt derivation rule (deterministic):

```text
1. If document title present → "{title} — hero image" (posts/recipes) or "{author name} headshot" (authors)
2. Else → humanise filename (strip extension, replace hyphens with spaces, sentence case)
```

## 5. Runtime view

### 5.1 Editor uploads hero image for a post

```text
Editor → /admin → Posts → edit → upload heroImage (new or existing Media)
  → Payload validates alt on Media doc
  → sharp generates size variants
  → Blob plugin persists binary (prod) or staticDir (local)
  → Postgres stores media row + relation on post
  → revalidation afterChange hook → revalidatePaths(/blog/, /blog/{slug}/, / if featured)
  → next visitor → getBlogPostBySlug at depth 1
  → mapPayloadPostToListItem → resolveMedia(heroImage, { size: 'card' })
  → PostCard renders next/image with media alt
```

### 5.2 Public image request (Payload-served file)

```text
Browser GET /api/media/file/{filename}?w=800
  → Payload upload handler
  → Blob fetch (prod) or local file read (dev)
  → sharp resize when width query present
  → Cache-Control via Next image pipeline / Payload defaults
  → next/image on page uses same src path (localPattern already configured)
```

### 5.3 Backfill migration (operator-run)

```text
Operator → pnpm --filter site tsx scripts/backfill-media-from-paths.ts (with NEON_DATABASE_URL)
  → For each unique public path on posts/recipes/authors:
       read file from apps/site/public{path}
       create Media if not exists (alt from derivation rule)
       set heroImage/photo relation on document
  → Log BackfillSummary
  → Operator verifies /admin + public pages
  → Remove legacy text fields from collections (separate deploy/migration step after verification)
  → pnpm generate:types
```

### 5.4 Recipe detail without hero (during transition)

```text
Recipe with null heroImage
  → Detail page renders text content only (no broken image)
  → Metadata omits image (same as today)
  → Backfill or editor upload closes gap before Phase 1 exit
```

## 6. Cross-squad coordination

| Consumer             | Contract                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEO metadata**     | Add optional `ogImage` upload → `media` on posts/recipes; use `resolveMedia(..., { size: 'og' })` for absolute OG URL. Do not reintroduce text-path fields.   |
| **editor tooling**   | Lexical upload feature targets `media` collection; toolbar allow-list documented in editor tooling. MEDIA does not configure Lexical uploads.                 |
| **site globals**     | Global hero field is `upload` → `media`; reuse resolver helpers and `revalidatePaths`.                                                                        |
| **Stay information** | Stay photography uses same `media` collection and alt rules.                                                                                                  |
| **CI**               | Blob token available in CI secrets if build executes upload handlers; otherwise builds only need DB for `generateStaticParams`. Add env vars to `turbo.json`. |
| **revalidation**     | No changes required; saving parent document busts cache. Document that standalone Media alt edits need parent re-save until optional referrer hook ships.     |
| **Operators**        | Create Vercel Blob store; set `BLOB_READ_WRITE_TOKEN` in Vercel + GitHub Actions secrets; run backfill once against production after deploy.                  |

## 7. Error paths

| Failure                                      | Behaviour                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Missing `alt` on Media save                  | Payload validation error in admin; save blocked.                                                                                     |
| Missing `heroImage` on publish               | Field validation or `beforeValidate` hook blocks publish with clear admin message.                                                   |
| Blob token missing in production             | Upload fails loudly in admin; log configuration error; do not silently fall back to ephemeral disk on Vercel.                        |
| Backfill source file missing under `public/` | Skip document; log path in `skippedPaths`; operator fixes asset or uploads manually.                                                 |
| Unpopulated relation (depth 0)               | Resolver returns null; mapper uses existing `FALLBACK_IMAGES` rotation for post cards only — log once in dev if depth misconfigured. |
| `next/image` unconfigured host               | Build-time error from Next — fix `localPatterns` / `remotePatterns` before merge.                                                    |
| Broken relation (deleted Media)              | Resolver returns null; UI shows fallback card image; admin shows broken relation until editor reassigns.                             |

## 8. Observability

| Signal               | Implementation                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Backfill summary     | Script stdout JSON: `{ event: 'media_backfill', ...BackfillSummary }` — no binary content logged.     |
| Upload failures      | Payload admin surfaces error; Sentry captures unhandled server errors on upload route (existing SDK). |
| Resolver dev warning | Optional `console.warn` when populated Media missing `alt` (should not occur post-validation).        |
| Metrics              | None in MEDIA; manual verification record for roadmap gate.                                           |

## 9. Testing strategy

| Layer                            | What to test                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit** (`media.test.ts`)       | `resolveMedia` with populated doc, each size variant, missing media, legacy path fallback.                                                              |
| **Unit** (`map-content.test.ts`) | Post list mapping includes `imageAlt`; author photo resolution via `photo` relation.                                                                    |
| **Collection config**            | `Media` slug and required `alt`; posts/recipes `heroImage` relation; authors `photo` relation.                                                          |
| **Backfill logic**               | Pure functions: path dedupe, alt derivation, skip missing files.                                                                                        |
| **Manual / staging**             | Upload in admin → hero visible on `/blog/{slug}/` with correct alt → view source confirms `alt` attribute. Repeat for one recipe and one author byline. |
| **Not tested**                   | Binary upload against real Blob in CI; full visual regression of all cards.                                                                             |

## 10. Acceptance gates

Subset of `ARCHITECTURE.md` §2.1 quality goals and roadmap Phase 1 gates this epic must satisfy:

| Gate                   | Criterion                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Media library**      | `/admin` exposes Media collection; upload requires alt text.                                                                   |
| **Hero relations**     | Posts, recipes, and authors use upload relations — no interim text-path fields remain after backfill deploy.                   |
| **Public rendering**   | Images uploaded in admin render on public blog/recipe surfaces via `next/image` with media alt (roadmap Phase 1 quality gate). |
| **Optimised delivery** | Card and detail views request size-appropriate URLs (variant or width), not raw multi-megabyte originals.                      |
| **Migration**          | Existing content referencing `public/` paths is backfilled or documented with operator sign-off; `ARCHITECTURE.md` §10.3 closed.   |
| **Accessibility**      | No hero `Image` uses post title as alt when media alt exists.                                                                  |
| **Quality**            | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass locally and in CI (CI).                                          |
| **Documentation**      | `ARCHITECTURE.md` invariants and debt updated; `.env.example` lists blob token.                                                    |

## 11. Handoff

### Stable on close

- `media` collection schema with enforced alt and size variants.
- `lib/payload/media.ts` resolver API for all downstream epics (SEO metadata–Stay information).
- Posts/recipes `heroImage` and authors `photo` relation fields.
- `Post.imageAlt` and recipe hero fields on public routes.
- Documented backfill approach in `ARCHITECTURE.md` §10.3.

### Not delivered (explicit)

- Lexical inline uploads (editor tooling).
- SEO override fields and defaulting rules (SEO metadata).
- Globals-driven homepage hero (site globals).
- Stay page media (Stay information).
- Media referrer revalidation hook.
- Removal of static marketing images on `(www)` pages.

### Next epics

- **SEO metadata** — add SEO fields; reference `media` for social images via `resolveMedia(..., { size: 'og' })`.
- **editor tooling** — enable Lexical upload to `media` with scoped toolbar.
- **site globals** — globals hero image relation; static home hero retired.
- **Stay information** — Stay imagery via same collection.

## 12. Open questions

1. **Publish-time hero requirement.** Should `heroImage` be required only when `_status === 'published'`, or always required on the field? Default: required on field — editors pick or create Media before first publish; backfill satisfies existing published docs. Owner: implementer; non-blocking.

2. **Blob in local docker dev.** Use local `staticDir` only when token absent, or require Blob token for all environments? Default: local `staticDir` when token absent (simpler docker); production/staging require token. Owner: operator + implementer.

3. **Standalone Media alt edit.** When an editor fixes alt on a Media doc without re-saving posts, should MEDIA add a Media `afterChange` hook that finds referrers and revalidates? Default: defer — document workaround (re-save parent); add hook only if verification fails. Owner: MEDIA; revisit at sign-off.

4. **Recipe listing page.** A `/recipes/` index now exists. Hero on detail remains in scope for MEDIA; card imagery on the index can use the same resolver. Owner: product; non-blocking.

5. **Field name `heroImage` vs `image`.** Rename to `heroImage` (explicit) vs retain `image` upload type (less churn). Default: `heroImage` on posts/recipes, `photo` on authors — clearer for the SEO and editor epics. Owner: MEDIA; locked in this design.
