import axios from 'axios';

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
  async getDocuments(): Promise<Document[]> {
    const response = await api.get<DocumentsResponse>('/documents');
    return response.data.documents.map(normalizeDocument);
  },

  async getDocumentById(id: string): Promise<Document | null> {
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

  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<DocumentResponse>('/documents/upload', formData);
    return normalizeDocument(response.data.document);
  },

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async getOriginalFileUrl(id: string): Promise<string> {
    const response = await api.get<FileUrlResponse>(`/documents/${id}/file-url`);
    return response.data.signedUrl;
  },

  async revalidateDocument(id: string): Promise<Document> {
    const response = await api.post<DocumentResponse>(`/documents/${id}/validate`);
    return normalizeDocument(response.data.document);
  },

  async updateDocument(id: string, payload: DocumentUpdatePayload): Promise<Document> {
    const response = await api.put<DocumentResponse>(`/documents/${id}`, payload);
    return normalizeDocument(response.data.document);
  },

  async confirmDocument(id: string): Promise<Document> {
    const response = await api.post<DocumentResponse>(`/documents/${id}/confirm`);
    return normalizeDocument(response.data.document);
  },

  async rejectDocument(id: string, rejectReason: string): Promise<Document> {
    const response = await api.post<DocumentResponse>(`/documents/${id}/reject`, {
      rejectReason,
    });
    return normalizeDocument(response.data.document);
  },

  async reopenDocument(id: string): Promise<Document> {
    const response = await api.post<DocumentResponse>(`/documents/${id}/reopen`);
    return normalizeDocument(response.data.document);
  },
};

export function normalizeDocumentResponse(document: BackendDocument): Document {
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

function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
