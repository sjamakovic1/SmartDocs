export interface ParsedMoney {
  amount: number | null;
  currency: string | null;
  inferredCurrency: boolean;
  symbol: string | null;
  correctedCurrencyFrom: string | null;
}

const supportedCurrencies = ['EUR', 'BAM', 'USD', 'GBP', 'AED'] as const;
type SupportedCurrency = typeof supportedCurrencies[number];

const currencyLikeTokens = [...supportedCurrencies, 'EAM', '8AM', 'B4M', 'EUF', 'EIJR', 'USO', 'G8P'];
const CURRENCY_LIKE_TOKEN_PATTERN = currencyLikeTokens.join('|');
const currencyCorrections: Record<string, string> = {
  EAM: 'BAM',
  '8AM': 'BAM',
  B4M: 'BAM',
  EUF: 'EUR',
  EIJR: 'EUR',
  USO: 'USD',
  G8P: 'GBP',
};
const CURRENCY_BY_SYMBOL: Record<string, SupportedCurrency> = {
  $: 'USD',
  '\u00A3': 'GBP',
  '\u20AC': 'EUR',
};

export function parseMoney(value: string | undefined): ParsedMoney {
  if (!value) {
    return emptyMoney();
  }

  const currencyToken = findCurrencyToken(value);
  const correctedCurrency = currencyToken ? currencyCorrections[currencyToken] ?? null : null;
  const currencyCode = correctedCurrency ?? getSupportedCurrencyToken(currencyToken);
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

export function parseLocalizedNumber(value: string | undefined): number | null {
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

export function moneyValuePattern(): string {
  return String.raw`(?:[$\u00A3\u20AC]\s*)?(?:(?:${CURRENCY_LIKE_TOKEN_PATTERN})\s*)?[0-9][\d\s,.]*(?:\.\d+|,\d+)?\s*(?:${CURRENCY_LIKE_TOKEN_PATTERN})?`;
}

function extractNumericText(value: string): string | undefined {
  return value.match(/[0-9][\d\s,.]*(?:[.,]\d+)?/)?.[0];
}

function findCurrencyToken(value: string): string | null {
  const standaloneMatch = value.match(
    new RegExp(String.raw`(?:^|[^A-Z0-9])(${CURRENCY_LIKE_TOKEN_PATTERN})(?=$|[^A-Z0-9])`, 'i'),
  )?.[1];
  if (standaloneMatch) {
    return standaloneMatch.toUpperCase();
  }

  return value.match(new RegExp(String.raw`\d\s*(${CURRENCY_LIKE_TOKEN_PATTERN})(?=$|[^A-Z0-9])`, 'i'))?.[1]?.toUpperCase() ?? null;
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

function getSupportedCurrencyToken(currencyToken: string | null): SupportedCurrency | null {
  if (!currencyToken || !supportedCurrencies.includes(currencyToken as SupportedCurrency)) {
    return null;
  }

  return currencyToken as SupportedCurrency;
}

function inferCurrencyFromSymbol(symbol: string | null): SupportedCurrency | null {
  return symbol ? CURRENCY_BY_SYMBOL[symbol] ?? null : null;
}
