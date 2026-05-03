import type { ValidationIssue } from '../types/document';
import type { ParsedMoney } from './money';

const CURRENCY_BY_SYMBOL: Record<string, string> = {
  $: 'USD',
  '\u00A3': 'GBP',
  '\u20AC': 'EUR',
};

function addCurrencyInferenceWarning(
  warnings: ValidationIssue[],
  symbol: string | null,
  inferredCurrency: boolean,
): void {
  if (!inferredCurrency || !symbol) {
    return;
  }

  const currency = CURRENCY_BY_SYMBOL[symbol] ?? 'EUR';
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

export function addMoneyWarnings(warnings: ValidationIssue[], money: ParsedMoney): void {
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

export function addPlaceholderWarning(
  warnings: ValidationIssue[],
  field: string,
  message = 'Placeholder values were detected. Manual review is required.',
  actualValue?: string | number | null,
): void {
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
