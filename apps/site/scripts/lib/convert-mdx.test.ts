import { describe, expect, it } from 'vitest';

import {
  altFromFilename,
  assertSlug,
  restoreEscapedEmphasis,
  toAssetReference,
  toDateOnly,
  toFrontmatterDocument,
  toYaml,
} from './convert-mdx';

describe('toYaml', () => {
  it('serialises scalars, dates, string arrays and object arrays; omits empty values', () => {
    const yaml = toYaml({
      title: 'Midwinter: "Pasture"',
      date: new Date('2026-07-14T00:00:00.000Z'),
      featured: false,
      servings: 4,
      description: undefined,
      category: null,
      tags: ['pasture', 'winter'],
      empty: [],
      ingredients: [{ item: '500 g root vegetables' }, { item: '1 onion' }],
    });

    expect(yaml).toBe(
      [
        'title: "Midwinter: \\"Pasture\\""',
        'date: 2026-07-14',
        'featured: false',
        'servings: 4',
        'tags: ["pasture", "winter"]',
        'empty: []',
        'ingredients:',
        '  - item: "500 g root vegetables"',
        '  - item: "1 onion"',
      ].join('\n'),
    );
  });
});

describe('toFrontmatterDocument', () => {
  it('wraps frontmatter and body, and omits the body block when empty', () => {
    expect(toFrontmatterDocument({ title: 'A' }, '\n## Heading\n')).toBe(
      '---\ntitle: "A"\n---\n\n## Heading\n',
    );
    expect(toFrontmatterDocument({ title: 'A' }, '   ')).toBe('---\ntitle: "A"\n---\n');
  });
});

describe('restoreEscapedEmphasis', () => {
  it('turns escaped single-line asterisk pairs back into emphasis', () => {
    const input = '\\*[Register →](/get-involved)\\* | \\*[Download](/resources)\\*';
    expect(restoreEscapedEmphasis(input)).toBe(
      '*[Register →](/get-involved)* | *[Download](/resources)*',
    );
  });

  it('leaves unpaired or multi-line escapes alone', () => {
    expect(restoreEscapedEmphasis('a \\* b')).toBe('a \\* b');
    expect(restoreEscapedEmphasis('\\*one\nline\\*')).toBe('\\*one\nline\\*');
  });
});

describe('image helpers', () => {
  it('maps public image paths to asset references', () => {
    expect(
      toAssetReference('/images/hero-home.jpg', { assetPrefix: '../../assets/images' }),
    ).toEqual({ assetPath: '../../assets/images/hero-home.jpg', filename: 'hero-home.jpg' });
    expect(toAssetReference(null, { assetPrefix: 'x' })).toBeNull();
    expect(() => toAssetReference('/media/x.jpg', { assetPrefix: 'x' })).toThrow(/Unsupported/);
  });

  it('derives placeholder alt text from filenames', () => {
    expect(altFromFilename('highland-cattle-dam.jpg')).toBe('Highland cattle dam');
  });
});

describe('dates and slugs', () => {
  it('formats day-only dates', () => {
    expect(toDateOnly('2025-01-20T00:00:00.000Z')).toBe('2025-01-20');
    expect(() => toDateOnly('nope')).toThrow(/Invalid date/);
  });

  it('rejects non-kebab slugs', () => {
    expect(assertSlug('winter-fencing-progress')).toBe('winter-fencing-progress');
    expect(() => assertSlug('Winter Fencing')).toThrow(/kebab-case/);
  });
});
