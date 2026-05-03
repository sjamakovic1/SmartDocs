import type { DocumentType, ValidationIssue } from '../types/document';
import { aliasPattern, fieldAliases } from './fieldAliases';
import { isPlaceholderValue, stripPlaceholderBrackets } from './placeholders';
import { addPlaceholderWarning } from './extractionWarnings';

const WEAK_DOCUMENT_NUMBER_TOKENS = new Set(['on', 'no', 'number', 'invoice', 'date', 'due']);
const DOCUMENT_NUMBER_VALUE_REGEX = /\[?[#]?[A-Z0-9][A-Z0-9_#/-]*\]?/i;
const FALLBACK_DOCUMENT_NUMBER_REGEX =
  /\b(?:invoice|facture)\s*(?:#|no\.?|number)?\s*:?\s*(?!number\b|no\b|date\b|proforma\b)(\[?[#]?[A-Z0-9][A-Z0-9_#/-]*\]?)/i;
const PURCHASE_ORDER_REGEX = /\bpurchase\s+order\b|\bpo\s*(?:number|#|no\.?)\b/i;
const INVOICE_REGEX = /\binvoice\b|\bfacture(?:\s+proforma)?\b/i;
const FROM_LABEL_REGEX = /^from\s*:?\s*$/i;
const SUPPLIER_SAME_LINE_REGEX = /^(?:supplier|vendor|company|from)\s*:?\s+(.+)$/i;
const SUPPLIER_STOP_LINE_REGEX =
  /^(invoice\s+number|order\s+number|invoice\s+date|due\s+date|to\s*:|bill\s+to|ship\s+to|total\b|sub\s*total\b)/i;

export function detectDocumentType(rawText: string): DocumentType {
  if (PURCHASE_ORDER_REGEX.test(rawText)) {
    return 'PURCHASE_ORDER';
  }

  if (INVOICE_REGEX.test(rawText)) {
    return 'INVOICE';
  }

  return 'UNKNOWN';
}

export function extractDocumentNumber(rawText: string, warnings: ValidationIssue[]): string | null {
  const byAlias = extractValueByAliases(rawText, fieldAliases.documentNumber, DOCUMENT_NUMBER_VALUE_REGEX);
  const aliasNumber = cleanDocumentNumberCandidate(byAlias, warnings);
  if (aliasNumber) {
    return aliasNumber;
  }

  for (const line of rawText.split(/\n/)) {
    const fallback = line.match(FALLBACK_DOCUMENT_NUMBER_REGEX)?.[1];
    const fallbackNumber = cleanDocumentNumberCandidate(fallback, warnings);
    if (fallbackNumber) {
      return fallbackNumber;
    }
  }

  return null;
}

function cleanDocumentNumberCandidate(
  value: string | null | undefined,
  warnings: ValidationIssue[],
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const wasPlaceholder = isPlaceholderValue(trimmed);
  const cleaned = stripPlaceholderBrackets(trimmed).replace(/^#/, '').trim();
  const lower = cleaned.toLowerCase();

  if (
    !/\d/.test(cleaned) ||
    WEAK_DOCUMENT_NUMBER_TOKENS.has(lower) ||
    (cleaned.length < 3 && !/^#?\d{2,}$/.test(trimmed))
  ) {
    return null;
  }

  if (wasPlaceholder) {
    addPlaceholderWarning(
      warnings,
      'documentNumber',
      'Placeholder value detected for document number. Please verify.',
      cleaned,
    );
  }

  return cleaned;
}

export function extractSupplierName(rawText: string, warnings: ValidationIssue[]): string | null {
  const lines = rawText.split(/\n/).map((line) => line.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sameLine = line.match(SUPPLIER_SAME_LINE_REGEX)?.[1]?.trim();
    if (sameLine && !isSupplierStopLine(sameLine)) {
      if (isPlaceholderValue(sameLine)) {
        addPlaceholderWarning(warnings, 'supplierName');
        continue;
      }
      return sameLine;
    }

    if (FROM_LABEL_REGEX.test(line)) {
      const sectionName = firstMeaningfulSupplierLine(lines, index + 1, warnings);
      if (sectionName) {
        return sectionName;
      }
    }
  }

  return null;
}

function firstMeaningfulSupplierLine(
  lines: string[],
  startIndex: number,
  warnings: ValidationIssue[],
): string | null {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    if (isSupplierStopLine(line)) {
      return null;
    }

    if (isPlaceholderValue(line)) {
      addPlaceholderWarning(warnings, 'supplierName');
      continue;
    }

    return line;
  }

  return null;
}

function isSupplierStopLine(line: string): boolean {
  return SUPPLIER_STOP_LINE_REGEX.test(line);
}

function extractValueByAliases(
  rawText: string,
  aliases: readonly string[],
  valuePattern: RegExp,
): string | null {
  const labelPattern = aliasPattern(aliases);
  const sameLinePattern = new RegExp(
    String.raw`(?:^|\n|\s)(?:${labelPattern})\s*:?\s*(${valuePattern.source})`,
    'i',
  );
  const sameLine = rawText.match(sameLinePattern)?.[1]?.trim();
  if (sameLine) {
    return cleanExtractedValue(sameLine);
  }

  const nextLinePattern = new RegExp(
    String.raw`(?:^|\n|\s)(?:${labelPattern})\s*:?\s*\n+\s*(${valuePattern.source})`,
    'i',
  );
  const nextLine = rawText.match(nextLinePattern)?.[1]?.trim();
  return nextLine ? cleanExtractedValue(nextLine) : null;
}

function cleanExtractedValue(value: string): string {
  return value.replace(/\s{2,}.+$/, '').trim();
}
