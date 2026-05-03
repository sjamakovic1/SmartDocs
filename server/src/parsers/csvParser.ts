import type { LineItem } from '../types/document';
import { createEmptyParsedDocument, parseNumber, type ParsedDocument } from './parserTypes';

type LineItemColumn = 'description' | 'quantity' | 'unitPrice' | 'lineTotal';

const COLUMN_ALIASES: Record<LineItemColumn, string[]> = {
  description: ['desc', 'description', 'item', 'name'],
  quantity: ['qty', 'quantity'],
  unitPrice: ['price', 'unitprice', 'unit_price', 'unit price'],
  lineTotal: ['total', 'linetotal', 'line_total', 'line total', 'amount'],
};

export function parseCsvDocument(rawText: string, fileName?: string): ParsedDocument {
  const document = createEmptyParsedDocument(rawText, fileName, 'UNKNOWN');
  const rows = parseCsvRows(rawText);

  if (rows.length < 2) {
    return document;
  }

  const headers = rows[0] ?? [];
  const columnIndexes = resolveColumnIndexes(headers);

  document.lineItems = rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row, index) => createLineItem(row, columnIndexes, index));

  return document;
}

function createLineItem(
  row: string[],
  columnIndexes: Partial<Record<LineItemColumn, number>>,
  index: number,
): LineItem {
  return {
    id: `csv-line-${index + 1}`,
    description: getCell(row, columnIndexes.description) ?? '',
    quantity: parseNumber(getCell(row, columnIndexes.quantity)) ?? Number.NaN,
    unitPrice: parseNumber(getCell(row, columnIndexes.unitPrice)) ?? Number.NaN,
    lineTotal: parseNumber(getCell(row, columnIndexes.lineTotal)) ?? Number.NaN,
  };
}

function resolveColumnIndexes(headers: string[]): Partial<Record<LineItemColumn, number>> {
  const normalizedHeaders = headers.map(normalizeHeader);
  const indexes: Partial<Record<LineItemColumn, number>> = {};

  (Object.keys(COLUMN_ALIASES) as LineItemColumn[]).forEach((column) => {
    const aliases = COLUMN_ALIASES[column].map(normalizeHeader);
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header));

    if (index >= 0) {
      indexes[column] = index;
    }
  });

  return indexes;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getCell(row: string[], index: number | undefined): string | undefined {
  return index === undefined ? undefined : row[index]?.trim();
}

function parseCsvRows(rawText: string): string[][] {
  return rawText
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map(parseCsvLine);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (char === ',' && !isInsideQuotes) {
      cells.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  cells.push(currentCell.trim());
  return cells;
}
