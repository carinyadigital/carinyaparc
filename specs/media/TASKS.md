---
type: Tasks
epic: media
epic_id: MEDIA
version: '0.1'
owner: site
status: Not started
last_updated: 2026-08-13
related:
  - specs/media/tdd.md
  - docs/ARCHITECTURE.md
---

# Tasks — Media library (MEDIA)

Tasks for `specs/media/`, epic MEDIA.

Companion artefacts: [`./tdd.md`](tdd.md) · [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)

## 1. Summary

- **Epic.** MEDIA — Media library
- **Phase.** 1 (Marketing and content management)
- **Priority.** P0
- **Estimate.** 21 points across 8 tasks

**Scope.** Payload `media` upload collection with required alt text and size variants; Vercel Blob storage in production; upload relations on posts, recipes, and authors; resolver and mapper layer; public blog and recipe routes render optimised hero images with media alt via `next/image`; backfill from interim `public/` paths; architecture docs updated.

**Deliverables.**

- `Media` collection and `@payloadcms/storage-vercel-blob` integration
- `heroImage` / `photo` upload relations replacing text-path fields
- `lib/payload/media.ts` resolver helpers and unit tests
- Updated mappers, `Post.imageAlt`, blog components, and public route metadata
- Idempotent `scripts/backfill-media-from-paths.ts`
- `ARCHITECTURE.md` §6.3, §10.2, and §10.3 updated
- Production verification record (admin upload → public page with alt)

**Dependencies.** CI (CI guards schema, env, and test changes before merge).

## 2. Conventions

| Convention | Value                     |
| ---------- | ------------------------- |
| Task ID    | `MEDIA-{nn}`              |
| Acceptance | Gherkin required per task |

## 3. Tasks

- [ ] **[MEDIA-01] Media collection and Vercel Blob storage**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 5
  - **Epic:** MEDIA | **Labels:** phase:1, payload, type:collection
  - **Depends on:** —
  - **Deliverable:** `apps/site/src/collections/Media.ts` (upload collection with required `alt`, raster MIME allow-list, `thumbnail` / `card` / `hero` / `og` sizes); register in `payload.config.ts` with conditional `@payloadcms/storage-vercel-blob` when `BLOB_READ_WRITE_TOKEN` is set and local `staticDir` fallback otherwise; document token in `apps/site/.env.example`; add blob env vars to `turbo.json`; confirm `next.config.mjs` `localPatterns` / `remotePatterns` cover Payload and Blob URLs; run `pnpm generate:types`.
  - **Design:** [`./tdd.md#3-files-and-components`](tdd.md#3-files-and-components), [`./tdd.md#4-data-contracts`](tdd.md#4-data-contracts), [`./tdd.md#7-error-paths`](tdd.md#7-error-paths)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Media collection requires alt text
      Given the Media collection config is loaded
      When the alt field definition is inspected
      Then alt is type "text"
      And alt is required
      And alt maxLength is 200

    Scenario: Media collection defines image size variants
      Given the Media collection config is loaded
      When upload.imageSizes is inspected
      Then size names include "thumbnail", "card", "hero", and "og"
      And upload.mimeTypes includes "image/jpeg" and "image/webp"

    Scenario: Blob storage plugin is conditional on env token
      Given BLOB_READ_WRITE_TOKEN is set in the environment
      When payload.config.ts is evaluated
      Then the vercelBlobStorage plugin is registered for the media collection

    Scenario: Media collection allows public read
      Given an unauthenticated read request for a media document
      When access.read is evaluated
      Then read is permitted
    ```

- [ ] **[MEDIA-02] Upload relations on posts, recipes, and authors**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Epic:** MEDIA | **Labels:** phase:1, payload, type:collection
  - **Depends on:** MEDIA-01
  - **Deliverable:** Replace text `image` on `Posts.ts` and `Recipes.ts` with required `heroImage` upload relation to `media`; replace text `imageUrl` on `Authors.ts` with optional `photo` upload relation to `media`; regenerate Payload types.
  - **Design:** [`./tdd.md#4-data-contracts`](tdd.md#4-data-contracts), [`./tdd.md#3-files-and-components`](tdd.md#3-files-and-components)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Posts collection uses heroImage upload relation
      Given the Posts collection config is loaded
      When fields are inspected
      Then a field named "heroImage" exists with type "upload"
      And heroImage relationTo includes "media"
      And heroImage is required
      And no field named "image" with type "text" exists

    Scenario: Recipes collection uses heroImage upload relation
      Given the Recipes collection config is loaded
      When fields are inspected
      Then a field named "heroImage" exists with type "upload"
      And heroImage relationTo includes "media"
      And heroImage is required

    Scenario: Authors collection uses photo upload relation
      Given the Authors collection config is loaded
      When fields are inspected
      Then a field named "photo" exists with type "upload"
      And photo relationTo includes "media"
      And no field named "imageUrl" with type "text" exists
    ```

- [ ] **[MEDIA-03] Media resolver helpers**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Epic:** MEDIA | **Labels:** phase:1, payload, type:library
  - **Depends on:** MEDIA-01
  - **Deliverable:** `apps/site/src/lib/payload/media.ts` with `resolveMedia`, `ResolvedMedia` type, `MediaSize` union, and transitional `resolveLegacyPublicPath`; `apps/site/src/lib/payload/media.test.ts` covering populated media, size variants, null input, and legacy path fallback.
  - **Design:** [`./tdd.md#4-data-contracts`](tdd.md#4-data-contracts), [`./tdd.md#7-error-paths`](tdd.md#7-error-paths)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: resolveMedia returns src url and alt for populated media
      Given a populated Media document with alt "Highland cattle at dam"
      When resolveMedia is called with size "card"
      Then the result is not null
      And result.alt equals "Highland cattle at dam"
      And result.src is a non-empty string
      And result.url starts with "http"

    Scenario: resolveMedia returns null for unpopulated relation id
      Given a numeric media id without a populated document
      When resolveMedia is called
      Then the result is null

    Scenario: resolveMedia selects og size dimensions when requested
      Given a populated Media document with og size variant metadata
      When resolveMedia is called with size "og"
      Then result.src references the og variant or equivalent sized URL

    Scenario: resolveLegacyPublicPath maps public path to resolved media shape
      Given a legacy path "/images/farm-track-gate.jpg"
      When resolveLegacyPublicPath is called with fallbackAlt "Farm track gate"
      Then the result is not null
      And result.src equals "/images/farm-track-gate.jpg"
      And result.alt equals "Farm track gate"
    ```

- [ ] **[MEDIA-04] Mapper, DTOs, and blog component alt wiring**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Epic:** MEDIA | **Labels:** phase:1, payload, type:library
  - **Depends on:** MEDIA-02, MEDIA-03
  - **Deliverable:** Update `map-content.ts` to resolve `heroImage` and author `photo` via `media.ts`; add `imageAlt` to `Post` in `posts.ts` and list mapping; extend `RecipeDetail` with optional `heroImageUrl` and `heroImageAlt`; update `PostCard.tsx`, `FeaturedPosts.tsx`, and `SectionFromBlog.tsx` to use `post.imageAlt` for hero images; update `map-content.test.ts` fixtures and assertions.
  - **Design:** [`./tdd.md#4-data-contracts`](tdd.md#4-data-contracts), [`./tdd.md#3-files-and-components`](tdd.md#3-files-and-components)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: mapPayloadPostToListItem exposes imageAlt from heroImage
      Given a published post with populated heroImage media alt "Restored paddock gate"
      When mapPayloadPostToListItem is called
      Then mapped.imageAlt equals "Restored paddock gate"
      And mapped.imageUrl is a non-empty string suitable for next/image

    Scenario: mapPayloadPostToListItem resolves author photo from photo relation
      Given a post whose author has populated photo media
      When mapPayloadPostToListItem is called
      Then mapped.authorImageUrl is a non-empty string

    Scenario: PostCard hero image uses post imageAlt not post title
      Given a Post with title "Restoring 42 Hectares" and imageAlt "Restored paddock gate"
      When PostCard is rendered
      Then the hero Image element has alt "Restored paddock gate"
      And the hero Image element alt is not "Restoring 42 Hectares"

    Scenario: mapPayloadRecipeToDetail includes hero fields when heroImage is populated
      Given a recipe with populated heroImage media
      When mapPayloadRecipeToDetail is called
      Then result.heroImageUrl is defined
      And result.heroImageAlt is defined
    ```

- [ ] **[MEDIA-05] Blog metadata and recipe detail hero rendering**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 2
  - **Epic:** MEDIA | **Labels:** phase:1, routes, type:pages
  - **Depends on:** MEDIA-04
  - **Deliverable:** Update `(blog)/blog/[slug]/page.tsx` so `generateMetadata`, Open Graph, Twitter, and Article JSON-LD use resolved media URL and alt when `heroImage` is populated; update `(recipes)/recipes/[slug]/page.tsx` to render a hero `Image` when present and pass image into Recipe JSON-LD; ensure post/recipe queries use depth sufficient to populate media relations.
  - **Design:** [`./tdd.md#5-runtime-view`](tdd.md#5-runtime-view), [`./tdd.md#3-files-and-components`](tdd.md#3-files-and-components)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Blog post metadata includes absolute OG image URL from heroImage
      Given a published post with populated heroImage media
      When generateMetadata is called for the post slug
      Then openGraph.images includes an entry whose url starts with "https://carinyaparc.com.au"
      And the OG image url is not the DEFAULT_OG_IMAGE path alone when heroImage exists

    Scenario: Blog post Article JSON-LD uses hero image URL
      Given a published post with populated heroImage media
      When the blog post page renders
      Then the Article schema script includes an image property with an absolute URL

    Scenario: Recipe detail page renders hero image with media alt
      Given a published recipe with populated heroImage media alt "Rustic flatbread on board"
      When the recipe detail page renders
      Then the page contains an img or Image with alt "Rustic flatbread on board"

    Scenario: Recipe detail without heroImage omits hero block
      Given a published recipe with no heroImage relation
      When the recipe detail page renders
      Then no broken image element with an empty src is present
    ```

- [ ] **[MEDIA-06] Backfill script and legacy field removal**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 3
  - **Epic:** MEDIA | **Labels:** phase:1, payload, type:migration
  - **Depends on:** MEDIA-02
  - **Deliverable:** `apps/site/scripts/backfill-media-from-paths.ts` (idempotent CLI scanning posts, recipes, and authors for interim public paths, creating or reusing `media` rows, linking relations, emitting `BackfillSummary` JSON to stdout); extracted pure functions tested in `backfill-media-from-paths.test.ts`; operator runbook note in the task PR or on MEDIA-08 in TASKS.md; remove interim text-path fields only after backfill verification (may land in same PR once production backfill succeeds).
  - **Design:** [`./tdd.md#4-data-contracts`](tdd.md#4-data-contracts), [`./tdd.md#5-runtime-view`](tdd.md#5-runtime-view), [`./tdd.md#8-observability`](tdd.md#8-observability)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Alt derivation uses document title for posts
      Given a post titled "Restoring 42 Hectares"
      When deriveMediaAlt is called for a post document
      Then the returned alt equals "Restoring 42 Hectares — hero image"

    Scenario: Alt derivation uses author name for authors
      Given an author named "Jonathan Daddia"
      When deriveMediaAlt is called for an author document
      Then the returned alt equals "Jonathan Daddia headshot"

    Scenario: Backfill reuses existing media for duplicate paths
      Given two posts referencing the same public path "/images/farm-track-gate.jpg"
      And a Media record already exists for that path
      When the backfill dedupe logic runs
      Then mediaCreated increment is 0
      And mediaReused increment is at least 1

    Scenario: Backfill logs skipped paths when source file is missing
      Given a post referencing "/images/missing-file.jpg"
      And no file exists at apps/site/public/images/missing-file.jpg
      When the backfill script processes that post
      Then skippedPaths includes "/images/missing-file.jpg"
    ```

- [ ] **[MEDIA-07] ARCHITECTURE.md updates and collection config tests**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 1
  - **Epic:** MEDIA | **Labels:** phase:1, docs, type:tests
  - **Depends on:** MEDIA-01, MEDIA-02
  - **Deliverable:** Update `docs/ARCHITECTURE.md` — add Media to §6.2, replace interim image invariant in §6.3, remove text-path and unused media-route debt in §10.2, close media migration question in §10.3 with backfill decision; extend `blog-collections.test.ts` to assert `Media` registration and upload field shapes on posts, recipes, and authors.
  - **Design:** [`./tdd.md#10-acceptance-gates`](tdd.md#10-acceptance-gates), [`./tdd.md#11-handoff`](tdd.md#11-handoff)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: ARCHITECTURE.md no longer lists text-path image fields as open debt
      Given docs/ARCHITECTURE.md is read
      When section 10.2 Technical debt is searched
      Then the line "Text-path image fields" is not present

    Scenario: ARCHITECTURE.md closes the media migration open question
      Given docs/ARCHITECTURE.md section 10.3 is read
      When the Media migration question is located
      Then it is marked resolved with the backfill script approach

    Scenario: Collection tests assert Media is registered
      Given payload.config.ts collections are inspected in blog-collections.test.ts
      When the registered collection slugs are listed
      Then "media" is included

    Scenario: Collection tests assert heroImage on posts
      Given the Posts collection config is loaded in tests
      When field names are collected
      Then "heroImage" is included
    ```

- [ ] **[MEDIA-08] Production verification record**
  - **Status:** Not started | **Priority:** P0 | **Estimate:** 1
  - **Epic:** MEDIA | **Labels:** phase:1, ops, type:verification
  - **Depends on:** MEDIA-04, MEDIA-05, MEDIA-06, MEDIA-07
  - **Deliverable:** `specs/media/TASKS.md` (dated operator note on MEDIA-08) recording: new upload in `/admin` with alt → hero visible on public blog post URL with matching `alt` attribute; one recipe hero verified; author photo visible on a post byline; backfill run summary attached or referenced; satisfies roadmap Phase 1 gate "Images uploaded in admin render on public pages with alt text".
  - **Design:** [`./tdd.md#10-acceptance-gates`](tdd.md#10-acceptance-gates), [`./tdd.md#9-testing-strategy`](tdd.md#9-testing-strategy)
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: New admin upload appears on public blog post with correct alt
      Given MEDIA is deployed to production with BLOB_READ_WRITE_TOKEN configured
      And an editor uploads a new heroImage with alt "Test paddock at sunset" on a published post
      When a visitor requests "/blog/{slug}/" within five minutes
      Then the response body contains an image with alt "Test paddock at sunset"

    Scenario: Backfilled content renders from media relations
      Given the backfill script has been run against production
      When a visitor requests a blog post URL that previously used a public path hero
      Then the response body contains a hero image
      And the img or Image alt attribute is not empty

    Scenario: Verification record is attached to the epic
      Given MEDIA-08 is complete
      When the MEDIA-08 operator note in TASKS.md is read
      Then it lists the verified URLs and dates for blog, recipe, and author photo checks
    ```

## 4. Traceability and DoD

### Tasks to design sections

| Task     | tdd.md      |
| -------- | ----------- |
| MEDIA-01 | §3, §4, §7  |
| MEDIA-02 | §3, §4      |
| MEDIA-03 | §4, §7, §9  |
| MEDIA-04 | §3, §4, §9  |
| MEDIA-05 | §3, §5, §10 |
| MEDIA-06 | §4, §5, §8  |
| MEDIA-07 | §10, §11    |
| MEDIA-08 | §9, §10     |

### Tasks to ARCHITECTURE.md

| Task     | ARCHITECTURE.md                            |
| -------- | -------------------------------------- |
| MEDIA-01 | §3.2 (supersedes interim images), §4.2 |
| MEDIA-04 | §4.2 (mapper layer), §7.6 (a11y)       |
| MEDIA-06 | §10.3 (media migration)                |
| MEDIA-07 | §6.2, §6.3, §10.2, §10.3               |
| MEDIA-08 | §2.1 (editorial reliability, a11y)     |

### Definition of Done

- [ ] All Gherkin scenarios pass (automated where unit/collection tests apply; manual for MEDIA-08)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally and in CI
- [ ] `BLOB_READ_WRITE_TOKEN` documented in `.env.example` and set in Vercel production
- [ ] Backfill executed against production (or documented operator sign-off for skipped paths)
- [ ] `ARCHITECTURE.md` invariants and debt updated; §10.3 media migration closed
- [ ] Production verification record as a dated operator note on MEDIA-08
- [ ] Code review approved and PR merged to `main`

## 5. Handoff

**Stable on close:**

- `media` collection with enforced alt and size variants
- `lib/payload/media.ts` — `resolveMedia()` API for SEO metadata–Stay information
- Posts/recipes `heroImage` and authors `photo` upload relations
- `Post.imageAlt` and recipe hero fields on public routes

**Next epics:**

- **SEO metadata** — SEO fields; optional `ogImage` upload via `resolveMedia(..., { size: 'og' })`
- **editor tooling** — Lexical inline uploads targeting `media`
- **site globals** — Globals hero image relation
- **Stay information** — Stay photography via `media`

**Implement:** run **implement** per task in order MEDIA-01 → MEDIA-02 + MEDIA-03 (parallel) → MEDIA-04 → MEDIA-05 → MEDIA-06 → MEDIA-07 → MEDIA-08 (after deploy).
