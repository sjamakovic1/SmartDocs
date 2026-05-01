import type { Document, ValidationIssue } from '../types/document';

const MONEY_TOLERANCE = 0.01;

export function validateDocument(document: Document, allDocuments: Document[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  addRequiredIssue(issues, 'supplierName', document.supplierName, 'Supplier/company name is required.');
  addRequiredIssue(issues, 'documentNumber', document.documentNumber, 'Document number is required.');
  addRequiredIssue(issues, 'issueDate', document.issueDate, 'Issue date is required.');
  addRequiredIssue(issues, 'dueDate', document.dueDate, 'Due date is required.');
  addRequiredIssue(issues, 'currency', document.currency, 'Currency is required.');
  addRequiredIssue(issues, 'subtotal', document.subtotal, 'Subtotal is required.');
  addRequiredIssue(issues, 'taxRate', document.taxRate, 'Tax rate is required.');
  addRequiredIssue(issues, 'tax', document.tax, 'Tax amount is required.');
  addRequiredIssue(issues, 'total', document.total, 'Total is required.');

  if (document.issueDate && document.dueDate && new Date(document.dueDate) < new Date(document.issueDate)) {
    issues.push(makeIssue('dueDate', 'Due date cannot be before issue date.', 'ERROR'));
  }

  if (document.lineItems.length === 0) {
    issues.push(makeIssue('lineItems', 'At least one line item is required.', 'WARNING'));
  }

  document.lineItems.forEach((lineItem, index) => {
    const expectedLineTotal = getExpectedLineItemTotal(lineItem.quantity, lineItem.unitPrice);
    if (!moneyEquals(lineItem.lineTotal, expectedLineTotal)) {
      issues.push(
        makeIssue(
          `lineItems.${index + 1}.lineTotal`,
          `Line total mismatch. Expected ${formatMoney(expectedLineTotal)}, extracted ${formatMoney(lineItem.lineTotal)}.`,
          'ERROR',
        ),
      );
    }
  });

  if (document.lineItems.length > 0 && isPresentNumber(document.subtotal)) {
    const expectedSubtotal = getExpectedSubtotal(document);
    if (!moneyEquals(document.subtotal, expectedSubtotal)) {
      issues.push(
        makeIssue(
          'subtotal',
          `Subtotal mismatch. Expected ${formatMoney(expectedSubtotal)}, extracted ${formatMoney(document.subtotal)}.`,
          'ERROR',
        ),
      );
    }
  }

  if (isPresentNumber(document.subtotal) && isPresentNumber(document.tax)) {
    const expectedTax = getExpectedTaxAmount(document);
    if (expectedTax !== null && !moneyEquals(document.tax, expectedTax)) {
      issues.push(
        makeIssue(
          'tax',
          `Tax amount mismatch. Expected ${formatMoney(expectedTax)}, extracted ${formatMoney(document.tax)}.`,
          'ERROR',
        ),
      );
    }
  }

  if (isPresentNumber(document.subtotal) && isPresentNumber(document.tax) && isPresentNumber(document.total)) {
    const expectedTotal = getExpectedDocumentTotal(document.subtotal, document.tax);
    if (!moneyEquals(document.total, expectedTotal)) {
      issues.push(
        makeIssue(
          'total',
          `Total mismatch. Expected ${formatMoney(expectedTotal)}, extracted ${formatMoney(document.total)}.`,
          'ERROR',
        ),
      );
    }
  }

  if (
    document.documentNumber &&
    allDocuments.some(
      (item) => item.id !== document.id && item.documentNumber === document.documentNumber,
    )
  ) {
    issues.push(makeIssue('documentNumber', 'Duplicate document number detected.', 'ERROR'));
  }

  return issues;
}

function getExpectedLineItemTotal(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

function getExpectedSubtotal(document: Document) {
  return document.lineItems.reduce((sum, lineItem) => sum + lineItem.lineTotal, 0);
}

function getExpectedTaxAmount(document: Document) {
  if (!isPresentNumber(document.subtotal)) {
    return null;
  }

  if (isPresentNumber(document.taxRate)) {
    return (document.subtotal * document.taxRate) / 100;
  }

  return null;
}

function getExpectedDocumentTotal(subtotal: number, tax: number) {
  return subtotal + tax;
}

function addRequiredIssue(
  issues: ValidationIssue[],
  field: string,
  value: string | number | null | undefined,
  message: string,
) {
  if (value === null || value === undefined || value === '') {
    issues.push(makeIssue(field, message, 'WARNING'));
  }
}

function makeIssue(
  field: string,
  message: string,
  severity: ValidationIssue['severity'],
): ValidationIssue {
  return {
    id: `issue-${field}-${message}`,
    field,
    message,
    severity,
    resolved: false,
  };
}

function moneyEquals(left: number, right: number) {
  return Math.abs(left - right) <= MONEY_TOLERANCE;
}

function isPresentNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}
