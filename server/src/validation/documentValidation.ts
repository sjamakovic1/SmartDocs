import type {
  DocumentRecord,
  ValidationIssue,
  ValidationIssueCode,
  ValidationSeverity,
} from '../types/document';

const DEFAULT_MONEY_TOLERANCE = 0.01;
export const SUPPORTED_CURRENCIES = ['EUR', 'BAM', 'USD', 'GBP', 'AED'] as const;

type RequiredField = {
  field: keyof Pick<
    DocumentRecord,
    | 'documentNumber'
    | 'supplierName'
    | 'issueDate'
    | 'dueDate'
    | 'subtotal'
    | 'taxRate'
    | 'tax'
    | 'total'
  >;
  message: string;
};

const REQUIRED_FIELDS: RequiredField[] = [
  { field: 'documentNumber', message: 'Document number is required.' },
  { field: 'supplierName', message: 'Supplier/company name is required.' },
  { field: 'issueDate', message: 'Issue date is required.' },
  { field: 'dueDate', message: 'Due date is required.' },
  { field: 'subtotal', message: 'Subtotal is required.' },
  { field: 'taxRate', message: 'Tax rate is required.' },
  { field: 'tax', message: 'Tax amount is required.' },
  { field: 'total', message: 'Total is required.' },
];
const REQUIRED_FIELDS_BEFORE_CURRENCY = REQUIRED_FIELDS.slice(0, 4);
const REQUIRED_FIELDS_AFTER_CURRENCY = REQUIRED_FIELDS.slice(4);

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

  addRequiredIssues(document, issues, REQUIRED_FIELDS_BEFORE_CURRENCY);
  validateCurrency(document, issues);
  addRequiredIssues(document, issues, REQUIRED_FIELDS_AFTER_CURRENCY);

  validateDates(document, issues);
  validateDuplicateDocumentNumber(document, options.existingDocuments ?? [], issues);
  validateLineItems(document, issues, moneyTolerance);
  validateSubtotal(document, issues, moneyTolerance);
  validateTax(document, issues, moneyTolerance);
  validateTotal(document, issues, moneyTolerance);

  return issues;
}

export function hasBlockingValidationIssues(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'ERROR' || issue.severity === 'WARNING');
}

export function getSuggestedStatus(
  document: DocumentRecord,
  issues: ValidationIssue[],
): NonNullable<DocumentRecord['status']> {
  if (document.status === 'REJECTED') {
    return 'REJECTED';
  }

  return hasBlockingValidationIssues(issues) ? 'NEEDS_REVIEW' : 'VALIDATED';
}

function validateCurrency(document: DocumentRecord, issues: ValidationIssue[]): void {
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

function validateDates(document: DocumentRecord, issues: ValidationIssue[]): void {
  const issueDateTimestamp = document.issueDate ? Date.parse(document.issueDate) : null;
  const dueDateTimestamp = document.dueDate ? Date.parse(document.dueDate) : null;

  if (document.issueDate && Number.isNaN(issueDateTimestamp)) {
    issues.push(
      makeIssue('issueDate', 'INVALID_DATE', 'Issue date is not a valid date.', 'ERROR', null, document.issueDate),
    );
  }

  if (document.dueDate && Number.isNaN(dueDateTimestamp)) {
    issues.push(
      makeIssue('dueDate', 'INVALID_DATE', 'Due date is not a valid date.', 'ERROR', null, document.dueDate),
    );
  }

  if (
    document.issueDate &&
    document.dueDate &&
    !Number.isNaN(issueDateTimestamp) &&
    !Number.isNaN(dueDateTimestamp) &&
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
): void {
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
): void {
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
): void {
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
): void {
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
): void {
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

function addRequiredIssues(
  document: DocumentRecord,
  issues: ValidationIssue[],
  requiredFields: RequiredField[],
): void {
  requiredFields.forEach(({ field, message }) => {
    addRequiredIssue(issues, field, document[field], message);
  });
}

function addRequiredIssue(
  issues: ValidationIssue[],
  field: string,
  value: string | number | null | undefined,
  message: string,
): void {
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

function moneyEquals(left: number, right: number, tolerance: number): boolean {
  return Math.abs(left - right) <= tolerance;
}

function isPresentNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}
