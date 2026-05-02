import { describe, expect, it } from 'vitest';

import { parseDateToIso } from './dates';

describe('parseDateToIso', () => {
  it.each([
    ['2026-04-28', '2026-04-28'],
    ['04/28/2026', '2026-04-28'],
    ['January 25, 2016', '2016-01-25'],
    ['25 January 2016', '2016-01-25'],
  ])('parses %s', (value, expected) => {
    expect(parseDateToIso(value)).toBe(expected);
  });

  it('returns null for invalid dates', () => {
    expect(parseDateToIso('not a date')).toBeNull();
  });
});
