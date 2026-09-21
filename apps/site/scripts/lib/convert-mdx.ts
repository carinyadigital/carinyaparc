/**
 * Pure helpers for `scripts/convert-export.ts` (Payload JSON export → Astro MDX/YAML).
 * No filesystem access here so everything can be unit tested.
 */

export type FrontmatterValue =
  string | number | boolean | Date | null | undefined | string[] | Record<string, string>[];

/** Format a Date or ISO string as `YYYY-MM-DD` (Payload stores day-only dates at midnight UTC). */
export function toDateOnly(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return date.toISOString().slice(0, 10);
}

/** Quote a scalar for YAML. JSON string syntax is valid YAML and handles every edge case. */
export function yamlScalar(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Serialise a flat object to YAML frontmatter lines. `undefined` and `null` keys are omitted;
 * `Date`s become `YYYY-MM-DD`; string arrays are inline flow sequences; object arrays become
 * block sequences of mappings (used for recipe ingredients and instructions).
 */
export function toYaml(fields: Record<string, FrontmatterValue>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (value instanceof Date) {
      lines.push(`${key}: ${toDateOnly(value)}`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (typeof value[0] === 'string') {
        lines.push(`${key}: [${(value as string[]).map(yamlScalar).join(', ')}]`);
      } else {
        lines.push(`${key}:`);
        for (const row of value as Record<string, string>[]) {
          const entries = Object.entries(row);
          entries.forEach(([rowKey, rowValue], index) => {
            const prefix = index === 0 ? '  - ' : '    ';
            lines.push(`${prefix}${rowKey}: ${yamlScalar(rowValue)}`);
          });
        }
      }
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  return lines.join('\n');
}

export function toFrontmatterDocument(
  fields: Record<string, FrontmatterValue>,
  body: string,
): string {
  const trimmedBody = body.trim();
  return `---\n${toYaml(fields)}\n---\n${trimmedBody.length > 0 ? `\n${trimmedBody}\n` : ''}`;
}

/**
 * The archive-era posts were imported into Payload as plain text with literal asterisks, so
 * `convertLexicalToMarkdown` escapes them as `\*...\*`. Restore real emphasis where a
 * `\*` pair wraps text on a single line; leave any other backslash escapes alone.
 */
export function restoreEscapedEmphasis(markdown: string): string {
  return markdown.replace(/\\\*([^*\n]+?)\\\*/g, '*$1*');
}

/** Map a Payload public image path (`/images/x.jpg`) to a relative `src/assets` reference. */
export function toAssetReference(
  publicPath: string | null,
  options: { assetPrefix: string },
): { assetPath: string; filename: string } | null {
  if (!publicPath) {
    return null;
  }
  const match = /^\/images\/([^/]+)$/.exec(publicPath.trim());
  if (!match || !match[1]) {
    throw new Error(`Unsupported image path (expected /images/<file>): ${publicPath}`);
  }
  const filename = match[1];
  return { assetPath: `${options.assetPrefix}/${filename}`, filename };
}

/** Placeholder alt text derived from a kebab-case filename, e.g. `highland-cattle-dam.jpg`. */
export function altFromFilename(filename: string): string {
  const stem = filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return stem.length > 0 ? stem.charAt(0).toUpperCase() + stem.slice(1) : '';
}

export function assertSlug(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Slug is not kebab-case: ${slug}`);
  }
  return slug;
}
