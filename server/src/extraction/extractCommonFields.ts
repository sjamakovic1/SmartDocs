import type { DocumentRecord, DocumentType, ValidationIssue } from '../types/document';
import { parseDateToIso, dateValuePattern } from './dates';
import { aliasPattern, fieldAliases } from './fieldAliases';
import { extractLineItems } from './extractLineItems';
import { moneyValuePattern, parseMoney, parseLocalizedNumber } from './money';
import { isPlaceholderValue, stripPlaceholderBrackets } from './placeholders';

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

function normalizeText(rawText: string) {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function detectDocumentType(rawText: string): DocumentType {
  if (/\bpurchase\s+order\b|\bpo\s*(?:number|#|no\.?)\b/i.test(rawText)) {
    return 'PURCHASE_ORDER';
  }

  if (/\binvoice\b|\bfacture(?:\s+proforma)?\b/i.test(rawText)) {
    return 'INVOICE';
  }

  return 'UNKNOWN';
}

function extractDocumentNumber(rawText: string, warnings: ValidationIssue[]) {
  const byAlias = extractValueByAliases(rawText, fieldAliases.documentNumber, /\[?[#]?[A-Z0-9][A-Z0-9_#/-]*\]?/i);
  const aliasNumber = cleanDocumentNumberCandidate(byAlias, warnings);
  if (aliasNumber) {
    return aliasNumber;
  }

  for (const line of rawText.split(/\n/)) {
    const fallback = line.match(/\b(?:invoice|facture)\s*(?:#|no\.?|number)?\s*:?\s*(?!number\b|no\b|date\b|proforma\b)(\[?[#]?[A-Z0-9][A-Z0-9_#/-]*\]?)/i)?.[1];
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
) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const wasPlaceholder = isPlaceholderValue(trimmed);
  const cleaned = stripPlaceholderBrackets(trimmed).replace(/^#/, '').trim();
  const lower = cleaned.toLowerCase();

  if (
    !/\d/.test(cleaned) ||
    /^(on|no|number|invoice|date|due)$/i.test(cleaned) ||
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

  if (['on', 'no', 'number', 'invoice', 'date', 'due'].includes(lower)) {
    return null;
  }

  return cleaned;
}

function extractSupplierName(rawText: string, warnings: ValidationIssue[]) {
  const lines = rawText.split(/\n/).map((line) => line.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sameLine = line.match(/^(?:supplier|vendor|company|from)\s*:?\s+(.+)$/i)?.[1]?.trim();
    if (sameLine && !isSupplierStopLine(sameLine)) {
      if (isPlaceholderValue(sameLine)) {
        addPlaceholderWarning(warnings, 'supplierName');
        continue;
      }
      return sameLine;
    }

    if (/^from\s*:?\s*$/i.test(line)) {
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
) {
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

function isSupplierStopLine(line: string) {
  return /^(invoice\s+number|order\s+number|invoice\s+date|due\s+date|to\s*:|bill\s+to|ship\s+to|total\b|sub\s*total\b)/i.test(line);
}

function extractDateByAliases(rawText: string, aliases: readonly string[]) {
  const frenchDate = extractFrenchDate(rawText, aliases);
  if (frenchDate) {
    return frenchDate;
  }

  const value = extractValueByAliases(rawText, aliases, new RegExp(dateValuePattern(), 'i'));
  return parseDateToIso(value ?? undefined);
}

function extractFrenchDate(rawText: string, aliases: readonly string[]) {
  const pattern = dateValuePattern();

  if (aliases.includes('Date de Facturation')) {
    const value = rawText.match(new RegExp(String.raw`\bDate\s+de\s+Facturation\s*:?\s*(${pattern})`, 'i'))?.[1];
    return parseEuropeanDateToIso(value) ?? parseDateToIso(value);
  }

  if (aliases.some((alias) => alias.includes('échéance') || alias === 'Echeance')) {
    const value = rawText.match(new RegExp(String.raw`\b(?:Date\s+d['’]échéance|d['’]échéance|Date\s+d\s+echeance|Echeance)\s*:?\s*(${pattern})`, 'i'))?.[1];
    return parseEuropeanDateToIso(value) ?? parseDateToIso(value);
  }

  return null;
}

function parseEuropeanDateToIso(value: string | undefined) {
  const match = value?.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) {
    return null;
  }

  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function extractMoneyByAliases(
  rawText: string,
  aliases: readonly string[],
  warnings: ValidationIssue[],
) {
  const value = extractValueByAliases(rawText, aliases, new RegExp(moneyValuePattern(), 'i'));
  const money = parseMoney(value ?? undefined);
  addMoneyWarnings(warnings, money);
  return money;
}

function extractSummaryMoney(
  rawText: string,
  aliases: readonly string[],
  warnings: ValidationIssue[],
  field: 'subtotal' | 'tax',
) {
  const candidates = rawText
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => isSummaryMoneyLine(line, aliases, field))
    .map((line) => parseMoney(line))
    .filter((money) => money.amount !== null);

  const money = candidates.length > 0 ? candidates[candidates.length - 1] : parseMoney(undefined);
  addMoneyWarnings(warnings, money);
  return money;
}

function isSummaryMoneyLine(line: string, aliases: readonly string[], field: 'subtotal' | 'tax') {
  if (isTableHeaderLine(line)) {
    return false;
  }

  if (field === 'subtotal') {
    return aliases.some((alias) => labelStartsLine(line, alias)) && !/^(?:total\s+due|grand\s+total|amount\s+due|balance\s+due|tax|vat|tva)\b/i.test(line);
  }

  return aliases.some((alias) => labelStartsLine(line, alias)) && !/\b(rate|price|qty|quantity|description|service|product)\b/i.test(line);
}

function extractTotal(rawText: string, warnings: ValidationIssue[]) {
  const lines = rawText.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const priorityAliases = [
    ['Total Due', 'Amount Due'],
    ['Grand Total'],
    ['Balance Due'],
    ['Prix TTC', 'Total TTC'],
    ['Total'],
  ];

  for (const aliases of priorityAliases) {
    const candidates = lines
      .filter((line) => aliases.some((alias) => labelStartsLine(line, alias)))
      .filter((line) => !isNonFinalTotalLine(line))
      .map((line) => parseMoney(line))
      .filter((money) => money.amount !== null);

    if (candidates.length > 0) {
      const money = candidates.length > 0 ? candidates[candidates.length - 1] : parseMoney(undefined);
      addMoneyWarnings(warnings, money);
      return money;
    }
  }

  return parseMoney(undefined);
}

function isNonFinalTotalLine(line: string) {
  return isTableHeaderLine(line) || /^(?:sub\s*total|subtotal|tax|vat|tva|total\s+vat|total\s+t\.?v\.?a\.?|total\s+h\.?t\.?)/i.test(line);
}

function isTableHeaderLine(line: string) {
  return /\b(qty|quantity|hrs\/qty|description|service|product|rate\/price|unit\s+price|price|adjust|amount)\b/i.test(line)
    && /\b(total|sub\s*total|amount|price)\b/i.test(line)
    && !moneyValueRegex().test(line);
}

function labelStartsLine(line: string, label: string) {
  const normalizedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, String.raw`\s+`);
  return new RegExp(String.raw`^${normalizedLabel}(?=\s|:|$)\s*:?\s*`, 'i').test(line);
}

function extractTax(rawText: string, warnings: ValidationIssue[]) {
  const vatLines = [
    ...rawText.matchAll(/\b(?:VAT|Tax)\s+([0-9]+(?:[.,][0-9]+)?)%\s+of\s+[0-9][\d\s,.]*(?:[.,]\d+)?\s+([0-9][\d\s,.]*(?:[.,]\d+)?)/gi),
  ];

  if (vatLines.length > 0) {
    const tax = vatLines.reduce((sum, match) => sum + (parseLocalizedNumber(match[2]) ?? 0), 0);
    const uniqueRates = new Set(vatLines.map((match) => match[1]));
    return {
      tax,
      taxRate: uniqueRates.size === 1 ? parseLocalizedNumber(vatLines[0]?.[1]) : null,
      currency: null,
    };
  }

  const taxRateMatch = rawText.match(/\b(?:Tax|VAT|TVA)\s*\(\s*([0-9]+(?:[.,][0-9]+)?)%\s*\)\s*([^\n]+)/i);
  if (taxRateMatch) {
    const money = parseMoney(taxRateMatch[2]);
    addMoneyWarnings(warnings, money);
    return {
      tax: money.amount,
      taxRate: parseLocalizedNumber(taxRateMatch[1]),
      currency: money.currency,
    };
  }

  const taxRate = extractTaxRate(rawText);
  const money = extractTaxAmount(rawText, warnings);
  return {
    tax: money.amount,
    taxRate,
    currency: money.currency,
  };
}

function extractTaxAmount(rawText: string, warnings: ValidationIssue[]) {
  const candidates = rawText
    .split(/\n/)
    .map((line) => line.trim())
    .map((line) => extractTaxMoneyFromLine(line))
    .filter((money) => money.amount !== null);

  const money = candidates.length > 0 ? candidates[candidates.length - 1] : parseMoney(undefined);
  addMoneyWarnings(warnings, money);
  return money;
}

function extractTaxMoneyFromLine(line: string) {
  if (isTableHeaderLine(line) || /\btax\s*rate\b/i.test(line) || /\btaxable\b/i.test(line)) {
    return parseMoney(undefined);
  }

  const labelMatch = line.match(/\b(tax\s+due|tax\s+amount|vat\s+amount|total\s+vat|total\s+t\.?v\.?a\.?|montant\s+t\.?v\.?a\.?|tax|vat|tva)\b/i);
  if (!labelMatch || labelMatch.index === undefined) {
    return parseMoney(undefined);
  }

  return parseMoney(line.slice(labelMatch.index + labelMatch[0].length));
}

function deriveTaxRate(
  subtotal: number | null,
  tax: number | null,
  rawText: string,
  warnings: ValidationIssue[],
) {
  if (subtotal === null || tax === null || subtotal <= 0 || tax < 0 || hasMultipleTaxRates(rawText)) {
    return null;
  }

  const taxRate = roundMoney((tax / subtotal) * 100);
  warnings.push({
    field: 'taxRate',
    code: 'TAX_RATE_DERIVED',
    message: 'Tax rate was derived from tax amount and subtotal. Please verify.',
    severity: 'INFO',
    expectedValue: null,
    actualValue: taxRate,
  });
  return taxRate;
}

function hasMultipleTaxRates(rawText: string) {
  const rates = [
    ...rawText.matchAll(/\b(?:tax|vat|tva)\s+([0-9]+(?:[.,][0-9]+)?)%\s+of\b/gi),
  ].map((match) => parseLocalizedNumber(match[1])).filter((rate): rate is number => rate !== null);
  return new Set(rates).size > 1;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function extractTaxRate(rawText: string) {
  const rateMatches = [
    ...rawText.matchAll(/\b(?:tax\s*rate|vat\s*rate|tax\s*:?\s*vat|tax|vat|tva)\s*:?\s*([0-9]+(?:[.,][0-9]+)?)%/gi),
  ];
  const rates = rateMatches
    .map((match) => parseLocalizedNumber(match[1]))
    .filter((rate): rate is number => rate !== null);
  const uniqueRates = new Set(rates);
  return uniqueRates.size === 1 ? rates[0] : null;
}

function extractTotTotal(rawText: string, warnings: ValidationIssue[]) {
  const value = rawText.match(new RegExp(String.raw`\btot\b\s*:?\s*(${moneyValuePattern()})`, 'i'))?.[1];
  const money = parseMoney(value);
  addMoneyWarnings(warnings, money);
  return money;
}

function moneyValueRegex() {
  return new RegExp(moneyValuePattern(), 'i');
}

function extractValueByAliases(rawText: string, aliases: readonly string[], valuePattern: RegExp) {
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

function cleanExtractedValue(value: string) {
  return value.replace(/\s{2,}.+$/, '').trim();
}

function addCurrencyInferenceWarning(
  warnings: ValidationIssue[],
  symbol: string | null,
  inferredCurrency: boolean,
) {
  if (!inferredCurrency || !symbol) {
    return;
  }

  const currency = symbol === '$' ? 'USD' : symbol === '\u00A3' ? 'GBP' : 'EUR';
  const exists = warnings.some((warning) => warning.code === 'CURRENCY_INFERRED');
  if (exists) {
    return;
  }

  warnings.push({
    field: 'currency',
    code: 'CURRENCY_INFERRED',
    message: `Currency was inferred from '${symbol}' symbol as ${currency}. Please verify.`,
    severity: 'INFO',
    actualValue: symbol,
    expectedValue: currency,
  });
}

function addMoneyWarnings(warnings: ValidationIssue[], money: ReturnType<typeof parseMoney>) {
  addCurrencyInferenceWarning(warnings, money.symbol, money.inferredCurrency);

  if (!money.correctedCurrencyFrom || !money.currency) {
    return;
  }

  const exists = warnings.some(
    (warning) =>
      warning.code === 'OCR_CURRENCY_CORRECTED' &&
      warning.actualValue === money.correctedCurrencyFrom &&
      warning.expectedValue === money.currency,
  );
  if (exists) {
    return;
  }

  warnings.push({
    field: 'currency',
    code: 'OCR_CURRENCY_CORRECTED',
    message: `Currency was corrected from OCR value '${money.correctedCurrencyFrom}' to '${money.currency}'. Please verify.`,
    severity: 'INFO',
    actualValue: money.correctedCurrencyFrom,
    expectedValue: money.currency,
  });
}

function addPlaceholderWarning(
  warnings: ValidationIssue[],
  field: string,
  message = 'Placeholder values were detected. Manual review is required.',
  actualValue?: string | number | null,
) {
  const exists = warnings.some(
    (warning) => warning.code === 'PLACEHOLDER_VALUE_DETECTED' && warning.field === field,
  );
  if (exists) {
    return;
  }

  warnings.push({
    field,
    code: 'PLACEHOLDER_VALUE_DETECTED',
    message,
    severity: 'WARNING',
    actualValue,
  });
}

function extractCurrencyFromContext(rawText: string) {
  const parenthetical = rawText.match(/\((EUR|BAM|USD|GBP|AED)\)/i)?.[1]?.toUpperCase();
  if (parenthetical) {
    return parenthetical;
  }

  return rawText.match(/\b(EUR|BAM|USD|GBP|AED)\b/i)?.[1]?.toUpperCase() ?? null;
}
