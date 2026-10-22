import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { includeInSitemap, robotsMetaAllowsIndex } from './journal-archives';

const NOINDEX = '<meta name="robots" content="noindex, follow" />';
const INDEX = '<meta name="robots" content="index, follow" />';

describe('robotsMetaAllowsIndex', () => {
  it('rejects a noindex robots tag', () => {
    expect(robotsMetaAllowsIndex(`<head>${NOINDEX}</head>`)).toBe(false);
  });

  it('reads the robots tag when content comes before name', () => {
    expect(robotsMetaAllowsIndex('<meta content="noindex, follow" name="robots" />')).toBe(false);
  });

  it('allows an indexable robots tag', () => {
    expect(robotsMetaAllowsIndex(`<head>${INDEX}</head>`)).toBe(true);
  });

  it('allows a document that has no robots tag', () => {
    expect(robotsMetaAllowsIndex('<html></html>')).toBe(true);
  });
});

describe('includeInSitemap', () => {
  let root = '';

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  function writeArchive(pathname: string, robots: string): string {
    root = mkdtempSync(path.join(tmpdir(), 'journal-sitemap-'));
    const file = path.join(root, pathname.slice(1), 'index.html');
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `<html><head>${robots}</head></html>`);
    return root;
  }

  it('keeps ordinary pages and drops the monitoring tunnel', () => {
    expect(includeInSitemap('https://carinyaparc.com.au/about/', [])).toBe(true);
    expect(includeInSitemap('https://carinyaparc.com.au/monitoring/', [])).toBe(false);
  });

  it('drops a one-story archive whose page is noindex', () => {
    const dist = writeArchive('/blog/tag/beef/', NOINDEX);

    expect(includeInSitemap('https://carinyaparc.com.au/blog/tag/beef/', [dist])).toBe(false);
  });

  it('keeps a category archive whose page is indexable', () => {
    const dist = writeArchive('/blog/category/field-reports/', INDEX);

    expect(
      includeInSitemap('https://carinyaparc.com.au/blog/category/field-reports/', [dist]),
    ).toBe(true);
  });

  it('fails the build when a journal archive page was not written', () => {
    expect(() =>
      includeInSitemap('https://carinyaparc.com.au/blog/category/produce/', ['/tmp/missing-dist']),
    ).toThrow(/No built HTML for \/blog\/category\/produce\//);
  });
});
