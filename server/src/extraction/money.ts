export interface ParsedMoney {
  amount: number | null;
  currency: string | null;
  inferredCurrency: boolean;
  symbol: string | null;
  correctedCurrencyFrom: string | null;
}

const supportedCurrencies = ['EUR', 'BAM', 'USD', 'GBP', 'AED'] as const;
const currencyLikeTokens = [...supportedCurrencies, 'EAM', '8AM', 'B4M', 'EUF', 'EIJR', 'USO', 'G8P'];
const currencyCorrections: Record<string, string> = {
  EAM: 'BAM',
  '8AM': 'BAM',
  B4M: 'BAM',
  EUF: 'EUR',
  EIJR: 'EUR',
  USO: 'USD',
  G8P: 'GBP',
};

export function parseMoney(value: string | undefined): ParsedMoney {
  if (!value) {
    return emptyMoney();
  }

  const currencyToken = value.match(new RegExp(String.raw`\b(${currencyLikeTokens.join('|')})\b`, 'i'))?.[1]?.toUpperCase() ?? null;
  const correctedCurrency = currencyToken ? currencyCorrections[currencyToken] ?? null : null;
  const currencyCode = correctedCurrency ?? (currencyToken && supportedCurrencies.includes(currencyToken as typeof supportedCurrencies[number]) ? currencyToken : null);
  const symbol = value.match(/[$\u00A3\u20AC]/)?.[0] ?? null;
  const inferredCurrency = !currencyCode && Boolean(symbol);
  const currency = currencyCode ?? inferCurrencyFromSymbol(symbol);
  const numericText = extractNumericText(value);

  return {
    amount: parseLocalizedNumber(numericText),
    currency,
    inferredCurrency,
    symbol,
    correctedCurrencyFrom: correctedCurrency ? currencyToken : null,
  };
}

export function parseLocalizedNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let normalized = trimmed.replace(/[^\d,.\s-]/g, '').replace(/\s+/g, '');

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, '');
  } else if (hasComma) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function moneyValuePattern() {
  const currencyPattern = currencyLikeTokens.join('|');
  return String.raw`(?:[$\u00A3\u20AC]\s*)?(?:(?:${currencyPattern})\s*)?[0-9][\d\s,.]*(?:\.\d+|,\d+)?\s*(?:${currencyPattern})?`;
}

function extractNumericText(value: string) {
  return value.match(/[0-9][\d\s,.]*(?:[.,]\d+)?/)?.[0];
}

function emptyMoney(): ParsedMoney {
  return {
    amount: null,
    currency: null,
    inferredCurrency: false,
    symbol: null,
    correctedCurrencyFrom: null,
  };
}

function inferCurrencyFromSymbol(symbol: string | null) {
  if (symbol === '$') {
    return 'USD';
  }

  if (symbol === '\u00A3') {
    return 'GBP';
  }

  if (symbol === '\u20AC') {
    return 'EUR';
  }

  return null;
}
