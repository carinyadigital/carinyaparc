import { describe, expect, it } from 'vitest';

import { isThinJournalArchive } from './journal-archives';

describe('isThinJournalArchive', () => {
  it('treats one story as too thin to index', () => {
    expect(isThinJournalArchive(1)).toBe(true);
  });

  it('treats an empty archive as too thin to index', () => {
    expect(isThinJournalArchive(0)).toBe(true);
  });

  it('keeps two or more stories indexable', () => {
    expect(isThinJournalArchive(2)).toBe(false);
    expect(isThinJournalArchive(5)).toBe(false);
  });
});
