#!/usr/bin/env tsx
/**
 * Convert the Payload JSON export (`content-export/`, from `export:payload`) into the
 * Astro content collections under the repository-root `content/` directory (Phase 2).
 *
 * Usage:
 *   pnpm --filter site convert:export [--in content-export] [--content ../../content] [--dry-run]
 *
 * What it writes (all paths relative to the content root):
 *   authors/{slug}.yaml        name, imageUrl?, bio?
 *   categories/{slug}.yaml     name, description?
 *   posts/{slug}.mdx           frontmatter + Markdown body
 *   recipes/{slug}.mdx         frontmatter (ingredients/instructions) + optional body
 *   events/{slug}.mdx          frontmatter + Markdown description
 *   legal/{slug}.mdx           copied from apps/site/content/legal with frontmatter
 *   tags.json                  { slug: displayName } for every tag in the export
 *   images/{file}              hero images referenced by posts/recipes, copied from
 *                              apps/site/public/images
 *
 * Which version is used: the published version of each document (`*.published.json`) so the
 * new site serves exactly what production serves. Documents that exist only as drafts are
 * written with `draft: true`. Draft edits on top of a published document are reported, not
 * written — reconcile those by hand if they differ (the 21 Sep 2026 export had none that did).
 *
 * The script is idempotent: re-running overwrites the generated files.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  altFromFilename,
  assertSlug,
  restoreEscapedEmphasis,
  toAssetReference,
  toDateOnly,
  toFrontmatterDocument,
  toYaml,
} from './lib/convert-mdx';
import type {
  ExportedAuthor,
  ExportedCategory,
  ExportedEvent,
  ExportedPost,
  ExportedRecipe,
  ExportedTag,
} from './lib/export-mappers';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, '..');

/** Metadata the Next.js legal route hard-coded per slug; becomes frontmatter. */
const LEGAL_PAGES: Record<string, { title: string; description: string }> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Our privacy policy explains how we collect, use, and protect your personal information when you use our website and services.',
  },
  'terms-of-service': {
    title: 'Terms of Service',
    description:
      'Our terms of service outline the rules and guidelines for using the Carinya Parc website and services.',
  },
};

interface CliOptions {
  inDir: string;
  contentRoot: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    inDir: path.join(siteRoot, 'content-export'),
    contentRoot: path.resolve(siteRoot, '..', '..', 'content'),
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i + 1];
    if (argv[i] === '--in' && value) {
      options.inDir = path.resolve(value);
      i += 1;
    } else if (argv[i] === '--content' && value) {
      options.contentRoot = path.resolve(value);
      i += 1;
    } else if (argv[i] === '--dry-run') {
      options.dryRun = true;
    }
  }
  return options;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as T;
}

/** Published version first; documents that were never published come from the latest file. */
function selectDocuments<T extends { slug: string; status: string }>(
  latest: T[],
  published: T[],
): { docs: (T & { draft: boolean })[]; draftEdits: string[] } {
  const publishedBySlug = new Map(published.map((doc) => [doc.slug, doc]));
  const docs: (T & { draft: boolean })[] = [];
  const draftEdits: string[] = [];

  for (const doc of latest) {
    const live = publishedBySlug.get(doc.slug);
    if (live) {
      docs.push({ ...live, draft: false });
      if (
        doc.status === 'draft' &&
        JSON.stringify(stripVolatile(doc)) !== JSON.stringify(stripVolatile(live))
      ) {
        draftEdits.push(doc.slug);
      }
    } else {
      docs.push({ ...doc, draft: true });
    }
  }
  return { docs, draftEdits };
}

function stripVolatile(doc: object): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...(doc as Record<string, unknown>) };
  delete copy.status;
  delete copy.updatedAt;
  delete copy.id;
  return copy;
}

class Writer {
  readonly written: string[] = [];
  readonly copied: string[] = [];
  private readonly dryRun: boolean;

  constructor(dryRun: boolean) {
    this.dryRun = dryRun;
  }

  async write(file: string, content: string): Promise<void> {
    this.written.push(file);
    if (this.dryRun) {
      return;
    }
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf8');
  }

  async copy(from: string, to: string): Promise<void> {
    this.copied.push(to);
    if (this.dryRun) {
      await fs.access(from);
      return;
    }
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  const { inDir, contentRoot: contentDir, dryRun } = cli;
  const assetsDir = path.join(contentDir, 'images');
  const publicImagesDir = path.join(siteRoot, 'public', 'images');
  const legalSourceDir = path.join(siteRoot, 'content', 'legal');
  const writer = new Writer(dryRun);

  const [
    authors,
    categories,
    tags,
    postsLatest,
    postsPublished,
    recipesLatest,
    recipesPublished,
    eventsLatest,
    eventsPublished,
  ] = await Promise.all([
    readJson<ExportedAuthor[]>(path.join(inDir, 'authors.json')),
    readJson<ExportedCategory[]>(path.join(inDir, 'categories.json')),
    readJson<ExportedTag[]>(path.join(inDir, 'tags.json')),
    readJson<ExportedPost[]>(path.join(inDir, 'posts.json')),
    readJson<ExportedPost[]>(path.join(inDir, 'posts.published.json')),
    readJson<ExportedRecipe[]>(path.join(inDir, 'recipes.json')),
    readJson<ExportedRecipe[]>(path.join(inDir, 'recipes.published.json')),
    readJson<ExportedEvent[]>(path.join(inDir, 'events.json')),
    readJson<ExportedEvent[]>(path.join(inDir, 'events.published.json')),
  ]);

  const imagesToCopy = new Set<string>();
  const assetPrefix = '../images';

  // Authors and categories → YAML data entries (id = filename stem = slug).
  for (const author of authors) {
    await writer.write(
      path.join(contentDir, 'authors', `${assertSlug(author.slug)}.yaml`),
      `${toYaml({ name: author.name, imageUrl: author.imageUrl ?? undefined, bio: author.bio ?? undefined })}\n`,
    );
  }
  for (const category of categories) {
    await writer.write(
      path.join(contentDir, 'categories', `${assertSlug(category.slug)}.yaml`),
      `${toYaml({ name: category.name, description: category.description ?? undefined })}\n`,
    );
  }

  // Tags → display-name lookup.
  const tagNames = Object.fromEntries(
    tags
      .map((tag) => [assertSlug(tag.slug), tag.name] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  await writer.write(path.join(contentDir, 'tags.json'), `${JSON.stringify(tagNames, null, 2)}\n`);

  // Posts.
  const posts = selectDocuments(postsLatest, postsPublished);
  for (const post of posts.docs) {
    const image = toAssetReference(post.image, { assetPrefix });
    if (image) {
      imagesToCopy.add(image.filename);
    }
    const document = toFrontmatterDocument(
      {
        title: post.title,
        date: toDateOnly(post.date),
        author: post.author ?? undefined,
        category: post.category ?? undefined,
        tags: post.tags,
        featured: post.featured,
        excerpt: post.excerpt,
        description: post.description ?? undefined,
        image: image?.assetPath,
        imageAlt: image ? altFromFilename(image.filename) : undefined,
        draft: post.draft,
      },
      restoreEscapedEmphasis(post.bodyMarkdown),
    );
    await writer.write(path.join(contentDir, 'posts', `${assertSlug(post.slug)}.mdx`), document);
  }

  // Recipes.
  const recipes = selectDocuments(recipesLatest, recipesPublished);
  for (const recipe of recipes.docs) {
    const image = toAssetReference(recipe.image, { assetPrefix });
    if (image) {
      imagesToCopy.add(image.filename);
    }
    const document = toFrontmatterDocument(
      {
        title: recipe.title,
        date: toDateOnly(recipe.date),
        author: recipe.author ?? undefined,
        difficulty: recipe.difficulty ?? undefined,
        servings: recipe.servings ?? undefined,
        prepTime: recipe.prepTime ?? undefined,
        cookTime: recipe.cookTime ?? undefined,
        totalTime: recipe.totalTime ?? undefined,
        excerpt: recipe.excerpt,
        description: recipe.description ?? undefined,
        image: image?.assetPath,
        imageAlt: image ? altFromFilename(image.filename) : undefined,
        tags: recipe.tags,
        ingredients: recipe.ingredients.map((item) => ({ item })),
        instructions: recipe.instructions.map((step) => ({ step })),
        draft: recipe.draft,
      },
      '',
    );
    await writer.write(
      path.join(contentDir, 'recipes', `${assertSlug(recipe.slug)}.mdx`),
      document,
    );
  }

  // Events (none in the 21 Sep 2026 export, but the pipeline is complete).
  const events = selectDocuments(eventsLatest, eventsPublished);
  for (const event of events.docs) {
    const document = toFrontmatterDocument(
      {
        title: event.title,
        startsAt: event.startsAt,
        location: event.location,
        isFull: event.isFull,
        signupTarget: event.signupTarget ?? undefined,
        draft: event.draft,
      },
      restoreEscapedEmphasis(event.descriptionMarkdown),
    );
    await writer.write(path.join(contentDir, 'events', `${assertSlug(event.slug)}.mdx`), document);
  }

  // Legal pages: existing MDX gains frontmatter; body copied verbatim.
  for (const [slug, meta] of Object.entries(LEGAL_PAGES)) {
    const body = await fs.readFile(path.join(legalSourceDir, `${slug}.mdx`), 'utf8');
    await writer.write(
      path.join(contentDir, 'legal', `${slug}.mdx`),
      toFrontmatterDocument({ title: meta.title, description: meta.description }, body),
    );
  }

  // Hero images referenced by content → src/assets/images (optimised by Astro at build).
  for (const filename of [...imagesToCopy].sort()) {
    await writer.copy(path.join(publicImagesDir, filename), path.join(assetsDir, filename));
  }

  const summary = {
    mode: dryRun ? 'dry-run' : 'write',
    authors: authors.length,
    categories: categories.length,
    tags: tags.length,
    posts: { total: posts.docs.length, drafts: posts.docs.filter((p) => p.draft).length },
    recipes: { total: recipes.docs.length, drafts: recipes.docs.filter((r) => r.draft).length },
    events: { total: events.docs.length, drafts: events.docs.filter((e) => e.draft).length },
    legal: Object.keys(LEGAL_PAGES).length,
    imagesCopied: imagesToCopy.size,
    filesWritten: writer.written.length,
    unreconciledDraftEdits: {
      posts: posts.draftEdits,
      recipes: recipes.draftEdits,
      events: events.draftEdits,
    },
  };
  console.info(JSON.stringify(summary, null, 2));
  if (posts.draftEdits.length + recipes.draftEdits.length + events.draftEdits.length > 0) {
    console.warn(
      'Some documents have unpublished edits that differ from the published version. The published ' +
        'version was written; compare against content-export/*.json and apply by hand if wanted.',
    );
  }
}

main().catch((error: unknown) => {
  console.error('Conversion failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
