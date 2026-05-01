import type { DocumentType } from '../types/document';

const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: 'Invoice',
  PURCHASE_ORDER: 'Purchase Order',
  UNKNOWN: 'Unknown',
};

export function formatDocumentType(documentType?: DocumentType | null) {
  return documentType ? documentTypeLabels[documentType] : '-';
}
