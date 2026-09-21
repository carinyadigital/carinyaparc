# Content seeds

> **Content freeze — 21 September 2026.** The site is migrating from Payload CMS to
> Astro + MDX (see `docs/architecture/astro-migration.md`). Do not add new seeds or
> author content in `/admin` from this date; content authored after the export must be
> re-exported with `pnpm --filter site export:payload` before cut-over. New content is
> authored as MDX under the repository-root `content/` directory.

JSON seed files for the Payload CMS import pipeline. Agents (`content-writer`) produce
seeds in PRs; humans merge, then run import to create **draft** documents in `/admin`.

## Layout

```text
seeds/
  categories/{slug}.json → Categories collection
  posts/{slug}.json      → Posts collection
  recipes/{slug}.json    → Recipes collection
```

Body content is **markdown** in the JSON `body` field (posts only). The import script
converts markdown to Lexical JSON.

## Commands

```bash
# Validate seed JSON (CI — no database required)
pnpm --filter site import:content-seeds:validate

# Import all seeds as Payload drafts (requires NEON_DATABASE_URL + PAYLOAD_SECRET in .env.local)
pnpm --filter site import:content-seeds
```

## Workflow

1. `content-writer` opens PR with seed JSON
2. `content-seo-review` on the PR
3. Merge PR
4. Run import locally or via deploy hook → `_status: draft`
5. Human editorial review in `/admin` → publish

See `scripts/import-content-seed.ts` and Squad D charter in `carinyaparc/squads/content/`.
