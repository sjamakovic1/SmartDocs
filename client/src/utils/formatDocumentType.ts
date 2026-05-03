import type { DocumentType } from '../types/document';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  INVOICE: 'Invoice',
  PURCHASE_ORDER: 'Purchase Order',
  UNKNOWN: 'Unknown',
};

export function formatDocumentType(documentType?: DocumentType | null): string {
  return documentType ? DOCUMENT_TYPE_LABELS[documentType] : '-';
}
