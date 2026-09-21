#!/usr/bin/env tsx
/**
 * Export all Payload content to JSON for the Astro + MDX migration (Phase 0).
 *
 * Usage:
 *   pnpm --filter site export:payload [--out content-export]
 *
 * Requires NEON_DATABASE_URL and PAYLOAD_SECRET in apps/site/.env.local.
 *
 * Output (default `apps/site/content-export/`, gitignored — contains drafts and
 * registrant email addresses):
 *   manifest.json             counts, export time, published slugs per collection
 *   authors.json              [ExportedAuthor]
 *   categories.json           [ExportedCategory]
 *   tags.json                 [ExportedTag]
 *   posts.json                [ExportedPost]   latest version of every post (drafts included)
 *   recipes.json              [ExportedRecipe]
 *   events.json               [ExportedEvent]
 *   {posts,recipes,events}.published.json
 *                             the published version of each live document — differs from the
 *                             latest file only where an unpublished draft sits on top of a
 *                             published document (the site serves the published one)
 *   event-registrations.json  [ExportedEventRegistration]  PII — keep out of git
 *   markdown/posts/{slug}.md  body as Markdown, for eyeballing conversion fidelity
 *   markdown/events/{slug}.md
 *
 * Rich text is exported twice: the Lexical editor state verbatim (`body`) and a
 * Markdown rendering from `convertLexicalToMarkdown` (`bodyMarkdown`). The Astro
 * converter (Phase 2) reads the Markdown; the Lexical JSON is the fidelity
 * reference when something looks wrong.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { convertLexicalToMarkdown, editorConfigFactory } from '@payloadcms/richtext-lexical';
import config from '@payload-config';
import { getPayload } from 'payload';
import type { CollectionSlug } from 'payload';

import {
  buildSlugLookup,
  bySlug,
  mapAuthor,
  mapCategory,
  mapEvent,
  mapEventRegistration,
  mapPost,
  mapRecipe,
  mapTag,
} from './lib/export-mappers';
import type {
  ExportedAuthor,
  ExportedCategory,
  ExportedEvent,
  ExportedEventRegistration,
  ExportedPost,
  ExportedRecipe,
  ExportedTag,
} from './lib/export-mappers';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, '..');

interface CliOptions {
  out: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { out: path.join(siteRoot, 'content-export') };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i + 1];
    if (argv[i] === '--out' && value) {
      options.out = path.resolve(value);
      i += 1;
    }
  }
  return options;
}

type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

/**
 * Fetch every document in a collection with access control bypassed.
 * `draft: true` returns the latest version (including unpublished edits) for
 * collections with drafts enabled; for others it is ignored.
 */
async function findAll<T>(
  payload: PayloadClient,
  collection: CollectionSlug,
  options: { draft: boolean },
): Promise<T[]> {
  const result = await payload.find({
    collection,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    draft: options.draft,
    sort: 'createdAt',
  });
  return result.docs as T[];
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function writeMarkdownFiles(
  dir: string,
  docs: { slug: string; status: string; markdown: string }[],
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  for (const doc of docs) {
    const suffix = doc.status === 'published' ? '' : '.draft';
    await fs.writeFile(path.join(dir, `${doc.slug}${suffix}.md`), doc.markdown, 'utf8');
  }
}

async function main(): Promise<void> {
  const { out } = parseArgs(process.argv.slice(2));
  const startedAt = new Date();

  const payload = await getPayload({ config });
  const editorConfig = await editorConfigFactory.default({ config: payload.config });

  const toMarkdown = (data: Parameters<typeof convertLexicalToMarkdown>[0]['data']): string =>
    convertLexicalToMarkdown({ data, editorConfig });

  // Supporting entities first so relationships can be resolved to slugs.
  const [authorsRaw, categoriesRaw, tagsRaw] = await Promise.all([
    findAll<Parameters<typeof mapAuthor>[0]>(payload, 'authors', { draft: false }),
    findAll<Parameters<typeof mapCategory>[0]>(payload, 'categories', { draft: false }),
    findAll<Parameters<typeof mapTag>[0]>(payload, 'tags', { draft: false }),
  ]);

  const [postsRaw, recipesRaw, eventsRaw, registrationsRaw] = await Promise.all([
    findAll<Parameters<typeof mapPost>[0]>(payload, 'posts', { draft: true }),
    findAll<Parameters<typeof mapRecipe>[0]>(payload, 'recipes', { draft: true }),
    findAll<Parameters<typeof mapEvent>[0]>(payload, 'events', { draft: true }),
    findAll<Parameters<typeof mapEventRegistration>[0]>(payload, 'event-registrations', {
      draft: false,
    }),
  ]);

  // Published-only queries return the version the public site serves today,
  // independent of whether a newer draft exists on top of a published document.
  const [postsPublishedRaw, recipesPublishedRaw, eventsPublishedRaw] = await Promise.all([
    findAll<Parameters<typeof mapPost>[0]>(payload, 'posts', { draft: false }),
    findAll<Parameters<typeof mapRecipe>[0]>(payload, 'recipes', { draft: false }),
    findAll<Parameters<typeof mapEvent>[0]>(payload, 'events', { draft: false }),
  ]);

  const lookup = buildSlugLookup({
    authors: authorsRaw,
    categories: categoriesRaw,
    tags: tagsRaw,
    events: eventsRaw,
  });

  const authors: ExportedAuthor[] = authorsRaw.map(mapAuthor).sort(bySlug);
  const categories: ExportedCategory[] = categoriesRaw.map(mapCategory).sort(bySlug);
  const tags: ExportedTag[] = tagsRaw.map(mapTag).sort(bySlug);
  const posts: ExportedPost[] = postsRaw
    .map((doc) => mapPost(doc, lookup, toMarkdown(doc.body)))
    .sort(bySlug);
  const recipes: ExportedRecipe[] = recipesRaw.map((doc) => mapRecipe(doc, lookup)).sort(bySlug);
  const events: ExportedEvent[] = eventsRaw
    .map((doc) => mapEvent(doc, toMarkdown(doc.description)))
    .sort(bySlug);
  const registrations: ExportedEventRegistration[] = registrationsRaw.map((doc) =>
    mapEventRegistration(doc, lookup),
  );
  const postsPublished: ExportedPost[] = postsPublishedRaw
    .map((doc) => mapPost(doc, lookup, toMarkdown(doc.body)))
    .sort(bySlug);
  const recipesPublished: ExportedRecipe[] = recipesPublishedRaw
    .map((doc) => mapRecipe(doc, lookup))
    .sort(bySlug);
  const eventsPublished: ExportedEvent[] = eventsPublishedRaw
    .map((doc) => mapEvent(doc, toMarkdown(doc.description)))
    .sort(bySlug);

  const manifest = {
    exportedAt: startedAt.toISOString(),
    source: {
      serverURL: payload.config.serverURL,
      collections: ['authors', 'categories', 'tags', 'posts', 'recipes', 'events'],
    },
    counts: {
      authors: authors.length,
      categories: categories.length,
      tags: tags.length,
      posts: posts.length,
      recipes: recipes.length,
      events: events.length,
      eventRegistrations: registrations.length,
    },
    published: {
      posts: postsPublished.map((doc) => doc.slug).sort(),
      recipes: recipesPublished.map((doc) => doc.slug).sort(),
      events: eventsPublished.map((doc) => doc.slug).sort(),
    },
    draftOverPublished: {
      posts: posts
        .filter(
          (post) => post.status === 'draft' && postsPublished.some((p) => p.slug === post.slug),
        )
        .map((post) => post.slug),
      recipes: recipes
        .filter((r) => r.status === 'draft' && recipesPublished.some((p) => p.slug === r.slug))
        .map((recipe) => recipe.slug),
      events: events
        .filter((e) => e.status === 'draft' && eventsPublished.some((p) => p.slug === e.slug))
        .map((event) => event.slug),
    },
    unresolvedRelationships: {
      posts: posts.filter((post) => post.author === null).map((post) => post.slug),
      recipes: recipes.filter((recipe) => recipe.author === null).map((recipe) => recipe.slug),
      eventRegistrations: registrations.filter((reg) => reg.event === null).map((reg) => reg.id),
    },
  };

  await Promise.all([
    writeJson(path.join(out, 'manifest.json'), manifest),
    writeJson(path.join(out, 'authors.json'), authors),
    writeJson(path.join(out, 'categories.json'), categories),
    writeJson(path.join(out, 'tags.json'), tags),
    writeJson(path.join(out, 'posts.json'), posts),
    writeJson(path.join(out, 'recipes.json'), recipes),
    writeJson(path.join(out, 'events.json'), events),
    writeJson(path.join(out, 'posts.published.json'), postsPublished),
    writeJson(path.join(out, 'recipes.published.json'), recipesPublished),
    writeJson(path.join(out, 'events.published.json'), eventsPublished),
    writeJson(path.join(out, 'event-registrations.json'), registrations),
    writeMarkdownFiles(
      path.join(out, 'markdown', 'posts'),
      posts.map((post) => ({ slug: post.slug, status: post.status, markdown: post.bodyMarkdown })),
    ),
    writeMarkdownFiles(
      path.join(out, 'markdown', 'events'),
      events.map((event) => ({
        slug: event.slug,
        status: event.status,
        markdown: event.descriptionMarkdown,
      })),
    ),
  ]);

  console.info(`Export written to ${out}`);
  console.info(JSON.stringify(manifest.counts));
  if (
    manifest.unresolvedRelationships.posts.length > 0 ||
    manifest.unresolvedRelationships.recipes.length > 0 ||
    manifest.unresolvedRelationships.eventRegistrations.length > 0
  ) {
    console.warn('Unresolved relationships:', JSON.stringify(manifest.unresolvedRelationships));
  }

  // Payload keeps the pg pool open; exit explicitly once files are flushed.
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('Export failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
