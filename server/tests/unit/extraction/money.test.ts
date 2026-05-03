import { describe, expect, it } from 'vitest';

import { parseLocalizedNumber, parseMoney } from '../../../src/extraction/money';

describe('parseMoney', () => {
  it.each([
    ['$93.50', 93.5, 'USD', true],
    ['\u00A377.60', 77.6, 'GBP', true],
    ['\u20AC77.60', 77.6, 'EUR', true],
    ['514USD', 514, 'USD', false],
    ['439 EUR', 439, 'EUR', false],
    ['Total GBP 77.60', 77.6, 'GBP', false],
  ])('parses %s', (value, amount, currency, inferredCurrency) => {
    const parsed = parseMoney(value);

    expect(parsed.amount).toBe(amount);
    expect(parsed.currency).toBe(currency);
    expect(parsed.inferredCurrency).toBe(inferredCurrency);
  });
});

describe('parseLocalizedNumber', () => {
  it('parses thousands separators', () => {
    expect(parseLocalizedNumber('1,612.35')).toBe(1612.35);
  });

  it('parses comma decimal values supported by the current parser', () => {
    expect(parseLocalizedNumber('478,000 EUR')).toBe(478);
  });
});
