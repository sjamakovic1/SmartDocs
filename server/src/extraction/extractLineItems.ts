import type { LineItem } from '../types/document';
import { parseLocalizedNumber } from './money';

const lineMoneyPattern = String.raw`[$\u00A3\u20AC]?\s*[0-9][\d,]*(?:\.\d+)?(?:\s*(?:EUR|BAM|USD|GBP|AED))?`;

export function extractLineItems(rawText: string): LineItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lineItems: LineItem[] = [];
  const { candidates, hasHeader } = getCandidateLines(lines);

  for (let index = 0; index < candidates.length; index += 1) {
    const line = candidates[index];
    if (isSummaryLine(line)) {
      if (hasHeader) {
        break;
      }
      continue;
    }

    const lineItem = parseLineItemLine(line, lineItems.length)
      ?? parseTwoLineLineItem(candidates, index, lineItems.length);
    if (lineItem) {
      lineItems.push(lineItem);
    }
  }

  return lineItems;
}

function getCandidateLines(lines: string[]) {
  const headerIndex = lines.findIndex((line) =>
    /description|item|service|product|hrs\/qty/i.test(line) &&
    /qty|quantity|hrs\/qty/i.test(line) &&
    /price|amount|total/i.test(line),
  );

  return {
    candidates: headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines,
    hasHeader: headerIndex >= 0,
  };
}

function parseLineItemLine(line: string, index: number): LineItem | null {
  return parseLeadingQuantityLine(line, index)
    ?? parseMoneyQuantityMoneyLine(line, index)
    ?? parseTrailingNumbersLine(line, index);
}

function parseTwoLineLineItem(lines: string[], lineIndex: number, itemIndex: number): LineItem | null {
  const firstLine = lines[lineIndex];
  const leadingMatch = firstLine.match(/^([0-9]+(?:[.,][0-9]+)?)\s+(.+)$/);
  if (!leadingMatch || isSummaryLine(firstLine)) {
    return null;
  }

  for (let offset = 1; offset <= 2; offset += 1) {
    const lookahead = lines[lineIndex + offset];
    if (!lookahead || isSummaryLine(lookahead)) {
      continue;
    }

    const moneyValues = extractMoneyValues(lookahead);
    if (moneyValues.length >= 2) {
      return makeLineItem(
        itemIndex,
        leadingMatch[2],
        leadingMatch[1],
        moneyValues[0],
        moneyValues[moneyValues.length - 1],
      );
    }
  }

  return null;
}

function parseLeadingQuantityLine(line: string, index: number): LineItem | null {
  const match = line.match(
    new RegExp(String.raw`^([0-9]+(?:[.,][0-9]+)?)\s+(.+?)\s+(${lineMoneyPattern})\s+(?:[0-9]+(?:[.,][0-9]+)?%)\s+(${lineMoneyPattern})$`, 'i'),
  );

  if (!match) {
    return null;
  }

  return makeLineItem(index, match[2], match[1], match[3], match[4]);
}

function parseTrailingNumbersLine(line: string, index: number): LineItem | null {
  const quantityAndPriceUnitMatch = line.match(
    new RegExp(String.raw`^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s+(?:each|unit|units|nos|pcs)\s+(${lineMoneyPattern})\s+(?:each|unit|units|nos|pcs)\s+(${lineMoneyPattern})$`, 'i'),
  );
  if (quantityAndPriceUnitMatch) {
    return makeLineItem(
      index,
      quantityAndPriceUnitMatch[1],
      quantityAndPriceUnitMatch[2],
      quantityAndPriceUnitMatch[3],
      quantityAndPriceUnitMatch[4],
    );
  }

  const withUnitMatch = line.match(
    new RegExp(String.raw`^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s+(?:each|unit|units|nos|pcs)\s+(${lineMoneyPattern})\s+(?:[0-9]+(?:[.,][0-9]+)?%\s+)?(${lineMoneyPattern})$`, 'i'),
  );
  if (withUnitMatch) {
    return makeLineItem(index, withUnitMatch[1], withUnitMatch[2], withUnitMatch[3], withUnitMatch[4]);
  }

  const simpleMatch = line.match(
    new RegExp(String.raw`^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s+(${lineMoneyPattern})\s+(${lineMoneyPattern})$`, 'i'),
  );
  if (simpleMatch) {
    return makeLineItem(index, simpleMatch[1], simpleMatch[2], simpleMatch[3], simpleMatch[4]);
  }

  return null;
}

function parseMoneyQuantityMoneyLine(line: string, index: number): LineItem | null {
  const match = line.match(
    new RegExp(String.raw`^(.+?)\s+((?:[$\u00A3\u20AC]\s*[0-9][\d,]*(?:\.\d+)?|[0-9][\d,]*(?:\.\d+)?\s*(?:EUR|BAM|USD|GBP|AED)))\s+([0-9]+(?:[.,][0-9]+)?)\s+(${lineMoneyPattern})$`, 'i'),
  );

  if (!match) {
    return null;
  }

  return makeLineItem(index, match[1], match[3], match[2], match[4]);
}

function makeLineItem(
  index: number,
  description: string | undefined,
  quantityValue: string | undefined,
  unitPriceValue: string | undefined,
  lineTotalValue: string | undefined,
): LineItem | null {
  const quantity = parseLocalizedNumber(quantityValue);
  const unitPrice = parseLocalizedNumber(unitPriceValue);
  const lineTotal = parseLocalizedNumber(lineTotalValue);

  if (quantity === null || unitPrice === null || lineTotal === null) {
    return null;
  }

  return {
    id: `extracted-line-${index + 1}`,
    description: description?.trim() ?? '',
    quantity,
    unitPrice,
    lineTotal,
  };
}

function extractMoneyValues(line: string) {
  const withoutPercentages = line.replace(/\b[0-9]+(?:[.,][0-9]+)?%/g, ' ');
  return [...withoutPercentages.matchAll(new RegExp(lineMoneyPattern, 'gi'))]
    .map((match) => match[0])
    .filter((value) => /[$\u00A3\u20AC]|\b(?:EUR|BAM|USD|GBP|AED)\b|[0-9]/i.test(value));
}

function isSummaryLine(line: string) {
  return /\b(subtotal|sub\s*total|total|total\s+due|grand\s+total|amount\s+due|tax|vat|tva|balance|paid|bank|from|to|invoice\s+number|invoice\s+date|due\s+date|payment\s+method|terms|conditions)\b/i.test(line);
}
