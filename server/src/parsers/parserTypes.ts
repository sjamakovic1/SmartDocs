import type { DocumentRecord, DocumentType } from '../types/document';

export interface ParseDocumentOptions {
  fileName?: string;
}

export type ParsedDocument = DocumentRecord;

export function createEmptyParsedDocument(
  rawText: string,
  fileName: string | undefined,
  documentType: DocumentType,
): ParsedDocument {
  return {
    documentType,
    documentNumber: null,
    supplierName: null,
    issueDate: null,
    dueDate: null,
    currency: null,
    subtotal: null,
    taxRate: null,
    tax: null,
    total: null,
    status: 'NEEDS_REVIEW',
    rawText,
    fileName: fileName ?? null,
    fileUrl: null,
    lineItems: [],
  };
}

export function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
