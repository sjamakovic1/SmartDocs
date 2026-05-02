import type { Document, LineItem, ValidationIssue } from '../types/document';
import { api } from './api';

interface DocumentResponse {
  document: BackendDocument;
}

interface DocumentsResponse {
  documents: BackendDocument[];
}

interface FileUrlResponse {
  signedUrl: string;
  expiresIn: number;
}

type BackendDocument = Omit<Document, 'lineItems' | 'validationIssues'> & {
  lineItems?: Partial<LineItem>[];
  validationIssues?: Partial<ValidationIssue>[];
};

export type DocumentUpdatePayload = Pick<
  Document,
  | 'documentType'
  | 'documentNumber'
  | 'supplierName'
  | 'issueDate'
  | 'dueDate'
  | 'currency'
  | 'subtotal'
  | 'taxRate'
  | 'tax'
  | 'total'
  | 'lineItems'
>;

export const documentService = {
  async getDocuments() {
    const response = await api.get<DocumentsResponse>('/documents');
    return response.data.documents.map(normalizeDocument);
  },

  async getDocumentById(id: string) {
    try {
      const response = await api.get<DocumentResponse>(`/documents/${id}`);
      return normalizeDocument(response.data.document);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  },

  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<DocumentResponse>('/documents/upload', formData);
    return normalizeDocument(response.data.document);
  },

  async deleteDocument(id: string) {
    await api.delete(`/documents/${id}`);
  },

  async getOriginalFileUrl(id: string) {
    const response = await api.get<FileUrlResponse>(`/documents/${id}/file-url`);
    return response.data.signedUrl;
  },

  async revalidateDocument(id: string) {
    const response = await api.post<DocumentResponse>(`/documents/${id}/validate`);
    return normalizeDocument(response.data.document);
  },

  async updateDocument(id: string, payload: DocumentUpdatePayload) {
    const response = await api.put<DocumentResponse>(`/documents/${id}`, payload);
    return normalizeDocument(response.data.document);
  },

  async confirmDocument(id: string) {
    const response = await api.post<DocumentResponse>(`/documents/${id}/confirm`);
    return normalizeDocument(response.data.document);
  },

  async rejectDocument(id: string, rejectReason: string) {
    const response = await api.post<DocumentResponse>(`/documents/${id}/reject`, {
      rejectReason,
    });
    return normalizeDocument(response.data.document);
  },

  async reopenDocument(id: string) {
    const response = await api.post<DocumentResponse>(`/documents/${id}/reopen`);
    return normalizeDocument(response.data.document);
  },
};

export function normalizeDocumentResponse(document: BackendDocument) {
  return normalizeDocument(document);
}

function normalizeDocument(document: BackendDocument): Document {
  return {
    ...document,
    lineItems: (document.lineItems ?? []).map(normalizeLineItem),
    validationIssues: (document.validationIssues ?? []).map(normalizeValidationIssue),
  };
}

function normalizeLineItem(lineItem: Partial<LineItem>, index: number): LineItem {
  return {
    id: lineItem.id ?? `line-${index + 1}`,
    description: lineItem.description ?? '',
    quantity: lineItem.quantity ?? 0,
    unitPrice: lineItem.unitPrice ?? 0,
    lineTotal: lineItem.lineTotal ?? 0,
  };
}

function normalizeValidationIssue(
  issue: Partial<ValidationIssue>,
  index: number,
): ValidationIssue {
  return {
    id: issue.id ?? `${issue.field ?? 'issue'}-${issue.code ?? index}-${index}`,
    field: issue.field ?? 'document',
    code: issue.code,
    message: issue.message ?? 'Validation issue detected.',
    severity: issue.severity ?? 'INFO',
    resolved: issue.resolved ?? false,
    expectedValue: issue.expectedValue,
    actualValue: issue.actualValue,
  };
}

function isNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    error.response.status === 404
  );
}
