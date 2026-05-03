import { extractCommonFields } from '../extraction/extractCommonFields';
import type { DocumentType } from '../types/document';
import { createEmptyParsedDocument, type ParsedDocument } from './parserTypes';

const TXT_PURCHASE_ORDER_REGEX = /\bpurchase\s+order\b/;
const TXT_PO_NUMBER_REGEX = /\bpo[-\s]?\d+\b/;
const TXT_INVOICE_REGEX = /\binvoice\b/;
const TXT_INVOICE_NUMBER_REGEX = /\binvoice\s+([A-Z0-9]+(?:[-/][A-Z0-9]+)*)\b/i;
const TXT_PURCHASE_ORDER_NUMBER_REGEX =
  /\b(?:purchase\s+order|po)\s*#?\s*([A-Z0-9]+(?:[-/][A-Z0-9]+)*)\b/i;

export function parseTxtDocument(rawText: string, fileName?: string): ParsedDocument {
  const commonFields = extractCommonFields(rawText);
  const document = createEmptyParsedDocument(
    rawText,
    fileName,
    commonFields.documentType ?? detectTxtDocumentType(rawText),
  );

  document.documentNumber = commonFields.documentNumber ?? extractTxtDocumentNumber(rawText);
  document.supplierName = commonFields.supplierName ?? null;
  document.issueDate = commonFields.issueDate ?? null;
  document.dueDate = commonFields.dueDate ?? null;
  document.currency = commonFields.currency ?? null;
  document.subtotal = commonFields.subtotal ?? null;
  document.taxRate = commonFields.taxRate ?? null;
  document.tax = commonFields.tax ?? null;
  document.total = commonFields.total ?? null;
  document.lineItems = commonFields.lineItems ?? [];
  document.validationIssues = commonFields.warnings;

  return document;
}

function detectTxtDocumentType(rawText: string): DocumentType {
  const normalizedText = rawText.toLowerCase();

  if (TXT_PURCHASE_ORDER_REGEX.test(normalizedText) || TXT_PO_NUMBER_REGEX.test(normalizedText)) {
    return 'PURCHASE_ORDER';
  }

  if (TXT_INVOICE_REGEX.test(normalizedText)) {
    return 'INVOICE';
  }

  return 'UNKNOWN';
}

function extractTxtDocumentNumber(rawText: string): string | null {
  const invoiceNumberMatch = rawText.match(TXT_INVOICE_NUMBER_REGEX);
  if (invoiceNumberMatch?.[1]) {
    return invoiceNumberMatch[1].toUpperCase();
  }

  const poNumberMatch = rawText.match(TXT_PURCHASE_ORDER_NUMBER_REGEX);
  if (poNumberMatch?.[1]) {
    return poNumberMatch[1].toUpperCase();
  }

  return null;
}
