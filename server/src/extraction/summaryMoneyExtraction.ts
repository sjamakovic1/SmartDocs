import type { ValidationIssue } from '../types/document';
import { moneyValuePattern, parseMoney, parseLocalizedNumber, type ParsedMoney } from './money';
import { addMoneyWarnings } from './extractionWarnings';

export type TaxSummary = {
  tax: number | null;
  taxRate: number | null;
  currency: string | null;
};

const SUBTOTAL_EXCLUSION_REGEX =
  /^(?:total\s+due|grand\s+total|amount\s+due|balance\s+due|tax|vat|tva)\b/i;
const TAX_SUMMARY_EXCLUSION_REGEX = /\b(rate|price|qty|quantity|description|service|product)\b/i;
const NON_FINAL_TOTAL_LINE_REGEX =
  /^(?:sub\s*total|subtotal|tax|vat|tva|total\s+vat|total\s+t\.?v\.?a\.?|total\s+h\.?t\.?)/i;
const TABLE_HEADER_KEYWORD_REGEX =
  /\b(qty|quantity|hrs\/qty|description|service|product|rate\/price|unit\s+price|price|adjust|amount)\b/i;
const TABLE_HEADER_TOTAL_REGEX = /\b(total|sub\s*total|amount|price)\b/i;
const VAT_SUMMARY_REGEX =
  /\b(?:VAT|Tax)\s+([0-9]+(?:[.,][0-9]+)?)%\s+of\s+[0-9][\d\s,.]*(?:[.,]\d+)?\s+([0-9][\d\s,.]*(?:[.,]\d+)?)/gi;
const TAX_RATE_AMOUNT_REGEX =
  /\b(?:Tax|VAT|TVA)\s*\(\s*([0-9]+(?:[.,][0-9]+)?)%\s*\)\s*([^\n]+)/i;
const TAX_MONEY_LABEL_REGEX =
  /\b(tax\s+due|tax\s+amount|vat\s+amount|total\s+vat|total\s+t\.?v\.?a\.?|montant\s+t\.?v\.?a\.?|tax|vat|tva)\b/i;
const TAX_RATE_LINE_REGEX = /\btax\s*rate\b/i;
const TAXABLE_LINE_REGEX = /\btaxable\b/i;
const MULTIPLE_TAX_RATES_REGEX = /\b(?:tax|vat|tva)\s+([0-9]+(?:[.,][0-9]+)?)%\s+of\b/gi;
const TAX_RATE_REGEX =
  /\b(?:tax\s*rate|vat\s*rate|tax\s*:?\s*vat|tax|vat|tva)\s*:?\s*([0-9]+(?:[.,][0-9]+)?)%/gi;
const CURRENCY_CONTEXT_REGEX = /\b(EUR|BAM|USD|GBP|AED)\b/i;
const PARENTHETICAL_CURRENCY_CONTEXT_REGEX = /\((EUR|BAM|USD|GBP|AED)\)/i;

export function extractSummaryMoney(
  rawText: string,
  aliases: readonly string[],
  warnings: ValidationIssue[],
  field: 'subtotal' | 'tax',
): ParsedMoney {
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

function isSummaryMoneyLine(
  line: string,
  aliases: readonly string[],
  field: 'subtotal' | 'tax',
): boolean {
  if (isTableHeaderLine(line)) {
    return false;
  }

  if (field === 'subtotal') {
    return aliases.some((alias) => labelStartsLine(line, alias)) && !SUBTOTAL_EXCLUSION_REGEX.test(line);
  }

  return aliases.some((alias) => labelStartsLine(line, alias)) && !TAX_SUMMARY_EXCLUSION_REGEX.test(line);
}

export function extractTotal(rawText: string, warnings: ValidationIssue[]): ParsedMoney {
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

function isNonFinalTotalLine(line: string): boolean {
  return isTableHeaderLine(line) || NON_FINAL_TOTAL_LINE_REGEX.test(line);
}

function isTableHeaderLine(line: string): boolean {
  return TABLE_HEADER_KEYWORD_REGEX.test(line)
    && TABLE_HEADER_TOTAL_REGEX.test(line)
    && !moneyValueRegex().test(line);
}

function labelStartsLine(line: string, label: string): boolean {
  const normalizedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, String.raw`\s+`);
  return new RegExp(String.raw`^${normalizedLabel}(?=\s|:|$)\s*:?\s*`, 'i').test(line);
}

export function extractTax(rawText: string, warnings: ValidationIssue[]): TaxSummary {
  const vatLines = [
    ...rawText.matchAll(VAT_SUMMARY_REGEX),
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

  const taxRateMatch = rawText.match(TAX_RATE_AMOUNT_REGEX);
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

function extractTaxAmount(rawText: string, warnings: ValidationIssue[]): ParsedMoney {
  const candidates = rawText
    .split(/\n/)
    .map((line) => line.trim())
    .map((line) => extractTaxMoneyFromLine(line))
    .filter((money) => money.amount !== null);

  const money = candidates.length > 0 ? candidates[candidates.length - 1] : parseMoney(undefined);
  addMoneyWarnings(warnings, money);
  return money;
}

function extractTaxMoneyFromLine(line: string): ParsedMoney {
  if (isTableHeaderLine(line) || TAX_RATE_LINE_REGEX.test(line) || TAXABLE_LINE_REGEX.test(line)) {
    return parseMoney(undefined);
  }

  const labelMatch = line.match(TAX_MONEY_LABEL_REGEX);
  if (!labelMatch || labelMatch.index === undefined) {
    return parseMoney(undefined);
  }

  return parseMoney(line.slice(labelMatch.index + labelMatch[0].length));
}

export function deriveTaxRate(
  subtotal: number | null,
  tax: number | null,
  rawText: string,
  warnings: ValidationIssue[],
): number | null {
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

function hasMultipleTaxRates(rawText: string): boolean {
  const rates = [
    ...rawText.matchAll(MULTIPLE_TAX_RATES_REGEX),
  ].map((match) => parseLocalizedNumber(match[1])).filter((rate): rate is number => rate !== null);
  return new Set(rates).size > 1;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractTaxRate(rawText: string): number | null {
  const rateMatches = [
    ...rawText.matchAll(TAX_RATE_REGEX),
  ];
  const rates = rateMatches
    .map((match) => parseLocalizedNumber(match[1]))
    .filter((rate): rate is number => rate !== null);
  const uniqueRates = new Set(rates);
  return uniqueRates.size === 1 ? rates[0] : null;
}

export function extractTotTotal(rawText: string, warnings: ValidationIssue[]): ParsedMoney {
  const value = rawText.match(new RegExp(String.raw`\btot\b\s*:?\s*(${moneyValuePattern()})`, 'i'))?.[1];
  const money = parseMoney(value);
  addMoneyWarnings(warnings, money);
  return money;
}

function moneyValueRegex(): RegExp {
  return new RegExp(moneyValuePattern(), 'i');
}

export function extractCurrencyFromContext(rawText: string): string | null {
  const parenthetical = rawText.match(PARENTHETICAL_CURRENCY_CONTEXT_REGEX)?.[1]?.toUpperCase();
  if (parenthetical) {
    return parenthetical;
  }

  return rawText.match(CURRENCY_CONTEXT_REGEX)?.[1]?.toUpperCase() ?? null;
}
