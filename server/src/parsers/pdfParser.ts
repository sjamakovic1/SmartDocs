import { PDFParse } from 'pdf-parse';

import { extractCommonFields } from '../extraction/extractCommonFields';
import { createEmptyParsedDocument, type ParsedDocument } from './parserTypes';

export async function parsePdfDocument(buffer: Buffer, fileName?: string): Promise<ParsedDocument> {
  const parser = new PDFParse({ data: buffer });
  const parsedPdf = await parser.getText();
  await parser.destroy();

  return parsePdfText(parsedPdf.text, fileName);
}

export function parsePdfText(rawText: string, fileName?: string): ParsedDocument {
  const normalizedText = normalizePdfText(rawText);
  const commonFields = extractCommonFields(normalizedText);
  const document = createEmptyParsedDocument(
    normalizedText,
    fileName,
    commonFields.documentType ?? 'UNKNOWN',
  );

  document.documentNumber = commonFields.documentNumber ?? null;
  document.supplierName = commonFields.supplierName ?? null;
  document.issueDate = commonFields.issueDate ?? null;
  document.dueDate = commonFields.dueDate ?? null;
  document.currency = commonFields.currency ?? null;
  document.subtotal = commonFields.subtotal ?? null;
  document.taxRate = commonFields.taxRate ?? null;
  document.tax = commonFields.tax ?? null;
  document.total = commonFields.total ?? null;
  document.lineItems = commonFields.lineItems ?? [];
  document.validationIssues = commonFields.warnings;

  return document;
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
