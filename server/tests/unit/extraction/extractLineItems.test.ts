import { describe, expect, it } from 'vitest';

import { extractLineItems } from '../../../src/extraction/extractLineItems';

describe('extractLineItems', () => {
  it('extracts generated invoice rows', () => {
    expect(extractLineItems('Service A 5 71 355')).toEqual([
      expect.objectContaining({
        description: 'Service A',
        quantity: 5,
        unitPrice: 71,
        lineTotal: 355,
      }),
    ]);
  });

  it('extracts quantity/unit table rows with VAT rate', () => {
    expect(extractLineItems('Small coffee 2 each 2.00 20% 4.00')).toEqual([
      expect.objectContaining({
        description: 'Small coffee',
        quantity: 2,
        unitPrice: 2,
        lineTotal: 4,
      }),
    ]);
  });

  it('extracts real invoice quantity-first rows', () => {
    expect(extractLineItems('1.00 Web Design $85.00 0.00% $85.00')).toEqual([
      expect.objectContaining({
        description: 'Web Design',
        quantity: 1,
        unitPrice: 85,
        lineTotal: 85,
      }),
    ]);
  });

  it('skips summary lines', () => {
    expect(extractLineItems(`Sub Total $85.00
Tax $8.50
Total $93.50`)).toEqual([]);
  });
});
