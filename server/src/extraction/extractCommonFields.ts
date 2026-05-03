import type { DocumentRecord, ValidationIssue } from '../types/document';
import { extractDateByAliases } from './dateFieldExtraction';
import {
  detectDocumentType,
  extractDocumentNumber,
  extractSupplierName,
} from './documentIdentityExtraction';
import { fieldAliases } from './fieldAliases';
import { extractLineItems } from './extractLineItems';
import {
  deriveTaxRate,
  extractCurrencyFromContext,
  extractSummaryMoney,
  extractTax,
  extractTotal,
  extractTotTotal,
} from './summaryMoneyExtraction';

export type CommonExtractedFields = Partial<DocumentRecord> & {
  warnings: ValidationIssue[];
};

export function extractCommonFields(rawText: string): CommonExtractedFields {
  const normalizedText = normalizeText(rawText);
  const warnings: ValidationIssue[] = [];
  const subtotal = extractSummaryMoney(normalizedText, fieldAliases.subtotal, warnings, 'subtotal');
  const taxSummary = extractTax(normalizedText, warnings);
  const total = extractTotal(normalizedText, warnings);
  const fallbackTotal = total.amount === null ? extractTotTotal(normalizedText, warnings) : total;
  const contextCurrency = extractCurrencyFromContext(normalizedText);
  const derivedTaxRate = taxSummary.taxRate ?? deriveTaxRate(subtotal.amount, taxSummary.tax, normalizedText, warnings);

  return {
    documentType: detectDocumentType(normalizedText),
    documentNumber: extractDocumentNumber(normalizedText, warnings),
    supplierName: extractSupplierName(normalizedText, warnings),
    issueDate: extractDateByAliases(normalizedText, fieldAliases.issueDate),
    dueDate: extractDateByAliases(normalizedText, fieldAliases.dueDate),
    currency: fallbackTotal.currency ?? subtotal.currency ?? taxSummary.currency ?? contextCurrency,
    subtotal: subtotal.amount,
    taxRate: derivedTaxRate,
    tax: taxSummary.tax,
    total: fallbackTotal.amount,
    lineItems: extractLineItems(normalizedText),
    warnings,
  };
}

function normalizeText(rawText: string): string {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
