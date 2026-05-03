import { describe, expect, it } from 'vitest';

import { extractCommonFields } from '../../../src/extraction/extractCommonFields';

describe('extractCommonFields', () => {
  it('extracts generated invoice fields', () => {
    const extracted = extractCommonFields(`Invoice
Supplier: Company 5
Number: INV-1005
Date: 2026-04-28
Description Qty Unit Price Total
Service A 5 71 355
Subtotal 355
Tax (17%) 60.35
Total 415.35`);

    expect(extracted.supplierName).toBe('Company 5');
    expect(extracted.documentNumber).toBe('INV-1005');
    expect(extracted.issueDate).toBe('2026-04-28');
    expect(extracted.subtotal).toBe(355);
    expect(extracted.taxRate).toBe(17);
    expect(extracted.tax).toBe(60.35);
    expect(extracted.total).toBe(415.35);
  });

  it('extracts real-world invoice fields', () => {
    const extracted = extractCommonFields(`Invoice
From:
DEMO - Sliced Invoices
Invoice Number INV-3337
Invoice Date January 25, 2016
Due Date January 31, 2016
Total Due $93.50
Sub Total $85.00
Tax $8.50`);

    expect(extracted.supplierName).toBe('DEMO - Sliced Invoices');
    expect(extracted.documentNumber).toBe('INV-3337');
    expect(extracted.issueDate).toBe('2016-01-25');
    expect(extracted.dueDate).toBe('2016-01-31');
    expect(extracted.currency).toBe('USD');
    expect(extracted.subtotal).toBe(85);
    expect(extracted.tax).toBe(8.5);
    expect(extracted.total).toBe(93.5);
  });

  it('does not treat from inside a sentence as supplier', () => {
    const extracted = extractCommonFields(`Invoice
Payment is due within 30 days from date of invoice.
From:
Real Supplier
Invoice Number INV-22
Total 100 EUR`);

    expect(extracted.supplierName).toBe('Real Supplier');
  });
});
