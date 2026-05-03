import { parseDateToIso, dateValuePattern } from './dates';
import { aliasPattern } from './fieldAliases';

export function extractDateByAliases(rawText: string, aliases: readonly string[]): string | null {
  const frenchDate = extractFrenchDate(rawText, aliases);
  if (frenchDate) {
    return frenchDate;
  }

  const value = extractValueByAliases(rawText, aliases, new RegExp(dateValuePattern(), 'i'));
  return parseDateToIso(value ?? undefined);
}

function extractFrenchDate(rawText: string, aliases: readonly string[]): string | null {
  const pattern = dateValuePattern();

  if (aliases.includes('Date de Facturation')) {
    const value = rawText.match(new RegExp(String.raw`\bDate\s+de\s+Facturation\s*:?\s*(${pattern})`, 'i'))?.[1];
    return parseEuropeanDateToIso(value) ?? parseDateToIso(value);
  }

  if (aliases.some((alias) => alias.includes('Ã©chÃ©ance') || alias === 'Echeance')) {
    const value = rawText.match(new RegExp(String.raw`\b(?:Date\s+d['â€™]Ã©chÃ©ance|d['â€™]Ã©chÃ©ance|Date\s+d\s+echeance|Echeance)\s*:?\s*(${pattern})`, 'i'))?.[1];
    return parseEuropeanDateToIso(value) ?? parseDateToIso(value);
  }

  return null;
}

function parseEuropeanDateToIso(value: string | undefined): string | null {
  const match = value?.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) {
    return null;
  }

  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
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
