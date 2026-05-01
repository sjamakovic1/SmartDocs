import { mockDocuments } from './mockDocuments';
import type { Document } from '../types/document';
import { validateDocument } from '../utils/validateDocument';

let documents: Document[] = structuredClone(mockDocuments);

export const documentService = {
  async getDocuments() {
    return clone(documents);
  },

  async getDocumentById(id: string) {
    const document = documents.find((item) => item.id === id);
    return document ? clone(document) : null;
  },

  async updateDocument(id: string, data: Partial<Document>) {
    documents = documents.map((document) => {
      if (document.id !== id) {
        return document;
      }

      const updated: Document = {
        ...document,
        ...data,
        lineItems: data.lineItems ?? document.lineItems,
        updatedAt: new Date().toISOString(),
      };

      const validationIssues = validateDocument(updated, documents);
      return {
        ...updated,
        validationIssues,
        status:
          updated.status === 'REJECTED'
            ? 'REJECTED'
            : validationIssues.length > 0
              ? 'NEEDS_REVIEW'
              : updated.status,
      };
    });

    return this.getDocumentById(id);
  },

  async confirmDocument(id: string) {
    documents = documents.map((document) =>
      document.id === id && document.validationIssues.filter((issue) => !issue.resolved).length === 0
        ? {
            ...document,
            status: 'VALIDATED',
            validationIssues: document.validationIssues.map((issue) => ({
              ...issue,
              resolved: true,
            })),
            updatedAt: new Date().toISOString(),
          }
        : document,
    );

    return this.getDocumentById(id);
  },

  async rejectDocument(id: string, rejectReason: string) {
    documents = documents.map((document) =>
      document.id === id
        ? { ...document, rejectReason, status: 'REJECTED', updatedAt: new Date().toISOString() }
        : document,
    );

    return this.getDocumentById(id);
  },

  async reopenDocument(id: string) {
    documents = documents.map((document) =>
      document.id === id
        ? {
            ...document,
            rejectReason: null,
            status: 'NEEDS_REVIEW',
            updatedAt: new Date().toISOString(),
          }
        : document,
    );

    return this.getDocumentById(id);
  },

  async deleteDocument(id: string) {
    documents = documents.filter((document) => document.id !== id);
  },

  async mockUploadDocument(file: File) {
    const uploaded: Document = {
      id: `doc-upload-${Date.now()}`,
      documentType: guessDocumentType(file.name),
      documentNumber: null,
      supplierName: null,
      issueDate: null,
      dueDate: null,
      currency: null,
      subtotal: null,
      taxRate: null,
      tax: null,
      total: null,
      status: 'UPLOADED',
      rejectReason: null,
      rawText: `Mock extraction queued for ${file.name}.`,
      fileName: file.name,
      fileUrl: '#',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineItems: [],
      validationIssues: [
        {
          id: `issue-upload-${Date.now()}`,
          field: 'extraction',
          message: 'Document uploaded. Extraction and validation are pending.',
          severity: 'INFO',
          resolved: false,
        },
      ],
    };

    documents = [uploaded, ...documents];
    return clone(uploaded);
  },
};

function guessDocumentType(fileName: string): Document['documentType'] {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('po')) {
    return 'PURCHASE_ORDER';
  }

  if (lowerName.includes('invoice') || lowerName.includes('txt')) {
    return 'INVOICE';
  }

  return 'UNKNOWN';
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
