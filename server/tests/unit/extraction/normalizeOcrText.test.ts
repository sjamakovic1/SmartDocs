import { describe, expect, it } from 'vitest';

import { normalizeOcrText } from '../../../src/extraction/normalizeOcrText';

describe('normalizeOcrText', () => {
  it.each([
    ['Tolat 1123 BAM', 'total 1123 BAM'],
    ['Totat 1634 BAM', 'total 1634 BAM'],
    ['Total 514USD', 'Total 514 USD'],
    ['inv0ice', 'invoice'],
    ['supp1ier', 'supplier'],
  ])('normalizes %s', (rawText, expected) => {
    expect(normalizeOcrText(rawText).normalizedText).toBe(expected);
  });

  it('corrects OCR currency tokens and reports a warning', () => {
    const result = normalizeOcrText('Tolat 502 EAM');

    expect(result.normalizedText).toBe('total 502 BAM');
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'OCR_CURRENCY_CORRECTED',
        actualValue: 'EAM',
        expectedValue: 'BAM',
      }),
    ]);
  });

  it('returns normalized text separately without mutating the raw string value', () => {
    const rawText = 'Tolat 1123 BAM';
    const result = normalizeOcrText(rawText);

    expect(rawText).toBe('Tolat 1123 BAM');
    expect(result.normalizedText).not.toBe(rawText);
  });
});
