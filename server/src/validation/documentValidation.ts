import type {
  DocumentRecord,
  ValidationIssue,
  ValidationIssueCode,
  ValidationSeverity,
} from '../types/document';

const DEFAULT_MONEY_TOLERANCE = 0.01;
export const SUPPORTED_CURRENCIES = ['EUR', 'BAM', 'USD', 'GBP', 'AED'] as const;

export interface DocumentValidationOptions {
  existingDocuments?: DocumentRecord[];
  moneyTolerance?: number;
}

export function validateDocument(
  document: DocumentRecord,
  options: DocumentValidationOptions = {},
): ValidationIssue[] {
  if (document.status === 'REJECTED') {
    return [];
  }

  const moneyTolerance = options.moneyTolerance ?? DEFAULT_MONEY_TOLERANCE;
  const issues: ValidationIssue[] = [];

  addRequiredIssue(issues, 'documentNumber', document.documentNumber, 'Document number is required.');
  addRequiredIssue(issues, 'supplierName', document.supplierName, 'Supplier/company name is required.');
  addRequiredIssue(issues, 'issueDate', document.issueDate, 'Issue date is required.');
  addRequiredIssue(issues, 'dueDate', document.dueDate, 'Due date is required.');
  validateCurrency(document, issues);
  addRequiredIssue(issues, 'subtotal', document.subtotal, 'Subtotal is required.');
  addRequiredIssue(issues, 'taxRate', document.taxRate, 'Tax rate is required.');
  addRequiredIssue(issues, 'tax', document.tax, 'Tax amount is required.');
  addRequiredIssue(issues, 'total', document.total, 'Total is required.');

  validateDates(document, issues);
  validateDuplicateDocumentNumber(document, options.existingDocuments ?? [], issues);
  validateLineItems(document, issues, moneyTolerance);
  validateSubtotal(document, issues, moneyTolerance);
  validateTax(document, issues, moneyTolerance);
  validateTotal(document, issues, moneyTolerance);

  return issues;
}

export function hasBlockingValidationIssues(issues: ValidationIssue[]) {
  return issues.some((issue) => issue.severity === 'ERROR' || issue.severity === 'WARNING');
}

export function getSuggestedStatus(document: DocumentRecord, issues: ValidationIssue[]) {
  if (document.status === 'REJECTED') {
    return 'REJECTED';
  }

  return hasBlockingValidationIssues(issues) ? 'NEEDS_REVIEW' : 'VALIDATED';
}

function validateCurrency(document: DocumentRecord, issues: ValidationIssue[]) {
  if (!document.currency) {
    issues.push(makeIssue('currency', 'MISSING_FIELD', 'Currency is required.', 'ERROR'));
    return;
  }

  if (!SUPPORTED_CURRENCIES.includes(document.currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    issues.push(
      makeIssue(
        'currency',
        'UNSUPPORTED_CURRENCY',
        `Unsupported currency code. Supported currencies are ${SUPPORTED_CURRENCIES.join(', ')}.`,
        'ERROR',
        SUPPORTED_CURRENCIES.join(', '),
        document.currency,
      ),
    );
  }
}

function validateDates(document: DocumentRecord, issues: ValidationIssue[]) {
  if (document.issueDate && Number.isNaN(Date.parse(document.issueDate))) {
    issues.push(
      makeIssue('issueDate', 'INVALID_DATE', 'Issue date is not a valid date.', 'ERROR', null, document.issueDate),
    );
  }

  if (document.dueDate && Number.isNaN(Date.parse(document.dueDate))) {
    issues.push(
      makeIssue('dueDate', 'INVALID_DATE', 'Due date is not a valid date.', 'ERROR', null, document.dueDate),
    );
  }

  if (
    document.issueDate &&
    document.dueDate &&
    !Number.isNaN(Date.parse(document.issueDate)) &&
    !Number.isNaN(Date.parse(document.dueDate)) &&
    new Date(document.dueDate) < new Date(document.issueDate)
  ) {
    issues.push(
      makeIssue(
        'dueDate',
        'INVALID_DATE',
        'Due date cannot be before issue date.',
        'ERROR',
        document.issueDate,
        document.dueDate,
      ),
    );
  }
}

function validateDuplicateDocumentNumber(
  document: DocumentRecord,
  existingDocuments: DocumentRecord[],
  issues: ValidationIssue[],
) {
  if (!document.documentNumber) {
    return;
  }

  const duplicate = existingDocuments.some(
    (existingDocument) =>
      existingDocument.documentNumber === document.documentNumber &&
      existingDocument.id !== document.id,
  );

  if (duplicate) {
    issues.push(
      makeIssue(
        'documentNumber',
        'DUPLICATE_DOCUMENT_NUMBER',
        'Duplicate document number detected.',
        'ERROR',
        null,
        document.documentNumber,
      ),
    );
  }
}

function validateLineItems(
  document: DocumentRecord,
  issues: ValidationIssue[],
  moneyTolerance: number,
) {
  if (document.lineItems.length === 0) {
    issues.push(
      makeIssue('lineItems', 'MISSING_FIELD', 'At least one line item is required.', 'WARNING'),
    );
    return;
  }

  document.lineItems.forEach((lineItem, index) => {
    const expectedLineTotal = lineItem.quantity * lineItem.unitPrice;

    if (!moneyEquals(lineItem.lineTotal, expectedLineTotal, moneyTolerance)) {
      issues.push(
        makeIssue(
          `lineItems.${index + 1}.lineTotal`,
          'LINE_TOTAL_MISMATCH',
          `Line total mismatch. Expected ${formatMoney(expectedLineTotal)}, extracted ${formatMoney(lineItem.lineTotal)}.`,
          'ERROR',
          expectedLineTotal,
          lineItem.lineTotal,
        ),
      );
    }
  });
}

function validateSubtotal(
  document: DocumentRecord,
  issues: ValidationIssue[],
  moneyTolerance: number,
) {
  if (!isPresentNumber(document.subtotal) || document.lineItems.length === 0) {
    return;
  }

  const expectedSubtotal = document.lineItems.reduce(
    (sum, lineItem) => sum + lineItem.lineTotal,
    0,
  );

  if (!moneyEquals(document.subtotal, expectedSubtotal, moneyTolerance)) {
    issues.push(
      makeIssue(
        'subtotal',
        'SUBTOTAL_MISMATCH',
        `Subtotal mismatch. Expected ${formatMoney(expectedSubtotal)}, extracted ${formatMoney(document.subtotal)}.`,
        'ERROR',
        expectedSubtotal,
        document.subtotal,
      ),
    );
  }
}

function validateTax(
  document: DocumentRecord,
  issues: ValidationIssue[],
  moneyTolerance: number,
) {
  if (
    !isPresentNumber(document.subtotal) ||
    !isPresentNumber(document.taxRate) ||
    !isPresentNumber(document.tax)
  ) {
    return;
  }

  const expectedTax = (document.subtotal * document.taxRate) / 100;

  if (!moneyEquals(document.tax, expectedTax, moneyTolerance)) {
    issues.push(
      makeIssue(
        'tax',
        'TAX_MISMATCH',
        `Tax amount mismatch. Expected ${formatMoney(expectedTax)}, extracted ${formatMoney(document.tax)}.`,
        'ERROR',
        expectedTax,
        document.tax,
      ),
    );
  }
}

function validateTotal(
  document: DocumentRecord,
  issues: ValidationIssue[],
  moneyTolerance: number,
) {
  if (
    !isPresentNumber(document.subtotal) ||
    !isPresentNumber(document.tax) ||
    !isPresentNumber(document.total)
  ) {
    return;
  }

  const expectedTotal = document.subtotal + document.tax;

  if (!moneyEquals(document.total, expectedTotal, moneyTolerance)) {
    issues.push(
      makeIssue(
        'total',
        'TOTAL_MISMATCH',
        `Total mismatch. Expected ${formatMoney(expectedTotal)}, extracted ${formatMoney(document.total)}.`,
        'ERROR',
        expectedTotal,
        document.total,
      ),
    );
  }
}

function addRequiredIssue(
  issues: ValidationIssue[],
  field: string,
  value: string | number | null | undefined,
  message: string,
) {
  if (value === null || value === undefined || value === '') {
    issues.push(makeIssue(field, 'MISSING_FIELD', message, 'WARNING'));
  }
}

function makeIssue(
  field: string,
  code: ValidationIssueCode,
  message: string,
  severity: ValidationSeverity,
  expectedValue?: string | number | null,
  actualValue?: string | number | null,
): ValidationIssue {
  return {
    field,
    code,
    message,
    severity,
    expectedValue,
    actualValue,
  };
}

function moneyEquals(left: number, right: number, tolerance: number) {
  return Math.abs(left - right) <= tolerance;
}

function isPresentNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}
