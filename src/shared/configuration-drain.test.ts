import { describe, expect, it } from 'vitest';
import { drainCursorPages, type CursorPage } from './configuration';

/** Builds a chain of cursor pages, mimicking @wix/sdk-runtime's CursorBasedIterator (hasNext/next only). */
function buildPages<T>(pages: T[][]): CursorPage<T> {
  function makePage(index: number): CursorPage<T> {
    return {
      items: pages[index] ?? [],
      hasNext: () => index < pages.length - 1,
      next: async () => {
        if (index >= pages.length - 1) {
          throw new Error('next() should not be called when hasNext() is false');
        }
        return makePage(index + 1);
      },
    };
  }
  return makePage(0);
}

describe('drainCursorPages', () => {
  it('resumes across pages via cursor next() and concatenates items in order', async () => {
    const firstPage = buildPages([[1, 2], [3, 4], [5]]);
    const { records, capped } = await drainCursorPages(firstPage);
    expect(records).toEqual([1, 2, 3, 4, 5]);
    expect(capped).toBe(false);
  });

  it('stops as soon as hasNext() reports false, without calling next() again', async () => {
    const firstPage = buildPages([['only']]);
    const { records, capped } = await drainCursorPages(firstPage);
    expect(records).toEqual(['only']);
    expect(capped).toBe(false);
  });

  it('returns an empty, uncapped result for an empty single page', async () => {
    const firstPage = buildPages([[]]);
    const { records, capped } = await drainCursorPages(firstPage);
    expect(records).toEqual([]);
    expect(capped).toBe(false);
  });

  it('caps by page count on a runaway collection and reports capped: true', async () => {
    const pages = Array.from({ length: 50 }, (_, i) => [i]);
    const firstPage = buildPages(pages);
    const { records, capped } = await drainCursorPages(firstPage, { maxPages: 5, maxRecords: 1000 });
    expect(records).toEqual([0, 1, 2, 3, 4]);
    expect(capped).toBe(true);
  });

  it('caps by record count even within the page limit', async () => {
    const pages = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const firstPage = buildPages(pages);
    const { records, capped } = await drainCursorPages(firstPage, { maxPages: 20, maxRecords: 4 });
    expect(records).toEqual([1, 2, 3, 4]);
    expect(capped).toBe(true);
  });

  it('uses the default 20 page / 1000 record safety cap when none is supplied', async () => {
    const pages = Array.from({ length: 25 }, (_, i) => [i]);
    const firstPage = buildPages(pages);
    const { records, capped } = await drainCursorPages(firstPage);
    expect(records).toHaveLength(20);
    expect(capped).toBe(true);
  });
});
