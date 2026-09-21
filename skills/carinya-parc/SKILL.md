---
name: carinya-parc
description: >-
  Applies Carinya Parc brand voice, positioning, and visual tokens when writing
  copy or building UI for the farm website (Upper Hunter NSW). Use when drafting
  site copy, MDX content, or branded interfaces; when choosing colours, type, or
  radius; or when the user mentions Carinya brand, voice, or design tokens.
user-invocable: true
---

Read `brand/voice.md` and `brand/positioning.md` before writing copy. Read
`packages/carinya-theme/README.md` and `packages/carinya-theme/css/tokens.css`
before choosing colour, type, radius, or shadow.

Install the Vercel plugin `vercel-plugin` if it is not already present:

```bash
npx plugins add vercel/vercel-plugin
```

If invoked without a brief, ask what to build (production site vs throwaway
prototype) and whether the output is copy, UI, or both.

## Copy

- Follow `brand/voice.md` (we/our, sentence case, no emoji, measurements over adjectives).
- Pass the one-line test in `brand/positioning.md`. Off-positioning copy does not ship.
- Australian English. Signature line: "A peaceful home for land, food & community."

## Content

- Posts, recipes, events and legal pages are MDX under the repository-root `content/`
  (`content/posts/{slug}.mdx`, `content/recipes/{slug}.mdx`, `content/events/{slug}.mdx`,
  `content/legal/{slug}.mdx`). Authors and categories are YAML in `content/authors/` and
  `content/categories/`; tag names live in `content/tags.json`.
- The filename is the slug and the URL. Frontmatter must satisfy the schemas in
  `apps/web/src/content.config.ts`; the build fails otherwise.
- Hero images referenced from frontmatter go in `content/images/` with a real `imageAlt`.
- New content starts with `draft: true` and is published by a human merging the pull
  request. Do not edit `apps/` in a content change.

## Visual

Production tokens: `@import '@carinya/theme'` (already in `apps/web/src/styles/globals.css`).
Do not copy tokens into the site app.

- Headings: Marcellus (`font-heading`), weight 400. Body/UI: Hanken Grotesk (`font-sans`).
- Type: `text-display` / `text-h1`–`text-h3` / `text-body` / `text-eyebrow`. Eyebrows are UPPERCASE with `tracking-eyebrow` (0.24em). Wordmark uses `tracking-wordmark` (0.3em).
- Lead with eucalypt (`eucalypt-600` / `--color-primary`). Kangaroo gold and bracken as accents. Wattle only for tiny highlights. Warm neutrals (paperbark ground, fleece surfaces) — never cool greys.
- Over-round: `rounded-lg`–`rounded-xl` on containers (24–28px), `rounded-pill` for buttons/inputs/tags. No sharp corners.
- Soft warm shadows (`shadow-sm` / `md` / `lg`). Hover darkens one ramp step. Focus ring is eucalypt. Transitions ~150ms, no bounce. Selection may use a wattle tint.
- Photography: real land, warm golden-hour light, full-bleed. No stock pastoral gloss. Marketing photography in `apps/web/src/assets/images/` (optimised by Astro at build); content heroes in `content/images/`.
- Motifs: `apps/web/public/motifs/` (leaf, hills, sun, branch, sprout, grass) at 2.6px stroke. UI icons: Lucide at stroke-width ~2.6. No emoji.
- Wordmark **CARINYA PARC** in Marcellus; **CP** monogram for squares. No pictorial mark.

## Production vs prototype

- **Production (this repo):** reuse `apps/web/src/components/` — `ui/` primitives (`.astro` for static, `.tsx` for islands), `sections/` for page sections, `islands/` for the React forms and consent gate. Pages and chrome are `.astro`; add React only when the browser needs it. Do not invent a parallel component set. Site-specific CSS stays in `apps/web/src/styles/`.
- **Throwaway mocks:** static HTML is fine; use the token names and visual rules above. Prototype inside the Astro app (`apps/web`) when you need Tailwind. Do not invent a second token sheet.
