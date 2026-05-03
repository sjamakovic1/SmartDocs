import { describe, expect, it } from 'vitest';

import type { DocumentRecord, ValidationIssue } from '../../../src/types/document';
import { hasBlockingValidationIssues, validateDocument } from '../../../src/validation/documentValidation';

function validInvoice(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    documentType: 'INVOICE',
    documentNumber: 'INV-1005',
    supplierName: 'Company 5',
    issueDate: '2026-04-28',
    dueDate: '2026-05-28',
    currency: 'EUR',
    subtotal: 355,
    taxRate: 17,
    tax: 60.35,
    total: 415.35,
    lineItems: [
      {
        description: 'Service A',
        quantity: 5,
        unitPrice: 71,
        lineTotal: 355,
      },
    ],
    ...overrides,
  };
}

function issueCodes(document: DocumentRecord) {
  return validateDocument(document).map((issue) => issue.code);
}

describe('validateDocument', () => {
  it('returns no validation issues for a valid invoice', () => {
    expect(validateDocument(validInvoice())).toEqual([]);
  });

  it('detects total mismatches', () => {
    expect(issueCodes(validInvoice({
      subtotal: 645,
      taxRate: 20,
      tax: 129,
      total: 800,
      lineItems: [
        {
          description: 'Service A',
          quantity: 3,
          unitPrice: 215,
          lineTotal: 645,
        },
      ],
    }))).toContain('TOTAL_MISMATCH');
  });

  it('detects line item total mismatches', () => {
    expect(issueCodes(validInvoice({
      lineItems: [
        {
          description: 'Service A',
          quantity: 5,
          unitPrice: 71,
          lineTotal: 350,
        },
      ],
    }))).toContain('LINE_TOTAL_MISMATCH');
  });

  it('detects subtotal mismatches', () => {
    expect(issueCodes(validInvoice({ subtotal: 400 }))).toContain('SUBTOTAL_MISMATCH');
  });

  it('detects missing required fields', () => {
    const codes = issueCodes(validInvoice({
      documentNumber: null,
      supplierName: null,
      issueDate: null,
      lineItems: [],
    }));

    expect(codes).toContain('MISSING_FIELD');
    expect(codes.filter((code) => code === 'MISSING_FIELD').length).toBeGreaterThanOrEqual(4);
  });

  it('detects due dates before issue dates', () => {
    expect(issueCodes(validInvoice({
      issueDate: '2026-05-28',
      dueDate: '2026-04-28',
    }))).toContain('INVALID_DATE');
  });

  it('does not validate rejected documents until reopened', () => {
    expect(validateDocument(validInvoice({ status: 'REJECTED' }))).toEqual([]);
  });
});

describe('hasBlockingValidationIssues', () => {
  it('returns true for error and warning issues, and false for info-only issues', () => {
    const infoIssue: ValidationIssue = {
      field: 'currency',
      code: 'CURRENCY_INFERRED',
      message: 'Currency inferred.',
      severity: 'INFO',
    };
    const warningIssue: ValidationIssue = {
      field: 'lineItems',
      code: 'MISSING_FIELD',
      message: 'At least one line item is required.',
      severity: 'WARNING',
    };
    const errorIssue: ValidationIssue = {
      field: 'total',
      code: 'TOTAL_MISMATCH',
      message: 'Total mismatch.',
      severity: 'ERROR',
    };

    expect(hasBlockingValidationIssues([infoIssue])).toBe(false);
    expect(hasBlockingValidationIssues([warningIssue])).toBe(true);
    expect(hasBlockingValidationIssues([errorIssue])).toBe(true);
  });
});
