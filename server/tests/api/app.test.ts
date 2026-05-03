import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import type { StoredDocument } from '../../src/services/documentService';

const serviceMocks = vi.hoisted(() => {
  class UnsupportedFileTypeError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'UnsupportedFileTypeError';
    }
  }

  class RejectedDocumentUpdateError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'RejectedDocumentUpdateError';
    }
  }

  class DocumentValidationError extends Error {
    constructor(
      message: string,
      public document: StoredDocument,
    ) {
      super(message);
      this.name = 'DocumentValidationError';
    }
  }

  class DocumentSaveError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DocumentSaveError';
    }
  }

  class StorageUploadError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StorageUploadError';
    }
  }

  class StorageSignedUrlError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StorageSignedUrlError';
    }
  }

  return {
    confirmStoredDocument: vi.fn(),
    createOriginalFileSignedUrl: vi.fn(),
    deleteDocument: vi.fn(),
    getDocumentById: vi.fn(),
    getDocuments: vi.fn(),
    rejectStoredDocument: vi.fn(),
    reopenStoredDocument: vi.fn(),
    updateStoredDocument: vi.fn(),
    uploadAndParseDocument: vi.fn(),
    validateStoredDocument: vi.fn(),
    DocumentSaveError,
    DocumentValidationError,
    RejectedDocumentUpdateError,
    StorageSignedUrlError,
    StorageUploadError,
    UnsupportedFileTypeError,
  };
});

vi.mock('../../src/services/documentService', () => serviceMocks);

function mockDocument(overrides: Partial<StoredDocument> = {}): StoredDocument {
  return {
    id: 'doc_1',
    documentType: 'INVOICE',
    documentNumber: 'INV-1',
    supplierName: 'Supplier',
    issueDate: '2026-04-28',
    dueDate: '2026-05-28',
    currency: 'EUR',
    subtotal: 100,
    taxRate: 10,
    tax: 10,
    total: 110,
    status: 'NEEDS_REVIEW',
    rejectReason: null,
    rawText: 'Invoice INV-1',
    ocrConfidence: null,
    imageWidth: null,
    imageHeight: null,
    fileName: 'invoice.pdf',
    fileUrl: null,
    mimeType: 'application/pdf',
    fileSize: 123,
    fileStorageBucket: null,
    fileStoragePath: null,
    validationIssues: [],
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
    lineItems: [],
    ...overrides,
  };
}

describe('app routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the health response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({
      message: 'SmartDocs API is running',
      status: 'ok',
    });
  });

  it('returns JSON for unknown routes', async () => {
    const response = await request(app).get('/api/not-a-real-route');

    expect(response.status).toBe(404);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found.',
      },
    });
  });

  it('returns UPLOAD_NO_FILE when upload has no multipart file', async () => {
    const response = await request(app).post('/api/documents/upload');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'UPLOAD_NO_FILE',
      message: 'No file uploaded.',
    });
  });

  it('returns UPLOAD_UNSUPPORTED_TYPE for unsupported uploads', async () => {
    serviceMocks.uploadAndParseDocument.mockRejectedValueOnce(
      new serviceMocks.UnsupportedFileTypeError(
        'Unsupported file type. Supported formats are PDF, CSV, TXT, PNG, JPG, and JPEG.',
      ),
    );

    const response = await request(app)
      .post('/api/documents/upload')
      .attach('file', Buffer.from('not executable'), {
        filename: 'malware.exe',
        contentType: 'application/octet-stream',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('UPLOAD_UNSUPPORTED_TYPE');
    expect(response.body.error.message).toContain('PDF, CSV, TXT, PNG, JPG, and JPEG');
  });

  it('returns DOCUMENT_NOT_FOUND for missing documents', async () => {
    serviceMocks.getDocumentById.mockResolvedValueOnce(null);

    const response = await request(app).get('/api/documents/non-existing-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'DOCUMENT_NOT_FOUND',
      message: 'Document not found.',
    });
  });

  it('lists documents successfully', async () => {
    serviceMocks.getDocuments.mockResolvedValueOnce([]);

    const response = await request(app).get('/api/documents');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      documents: [],
    });
  });

  it('returns DOCUMENT_CONFIRM_BLOCKED when validation issues remain', async () => {
    const document = mockDocument({
      validationIssues: [
        {
          id: 'issue_1',
          field: 'supplierName',
          code: 'MISSING_FIELD',
          message: 'Supplier/company name is required.',
          severity: 'WARNING',
          resolved: false,
        },
      ],
    });
    serviceMocks.confirmStoredDocument.mockRejectedValueOnce(
      new serviceMocks.DocumentValidationError('Document still has validation issues.', document),
    );

    const response = await request(app).post('/api/documents/doc_1/confirm');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'DOCUMENT_CONFIRM_BLOCKED',
      message: 'Document cannot be confirmed while validation errors remain.',
    });
    expect(response.body.document.id).toBe('doc_1');
    expect(response.body.validationIssues).toHaveLength(1);
  });

  it('requires reject reason', async () => {
    const response = await request(app)
      .post('/api/documents/doc_1/reject')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'REJECT_REASON_REQUIRED',
      message: 'Rejection reason is required.',
    });
  });

  it('returns ORIGINAL_FILE_NOT_FOUND when document has no stored file', async () => {
    serviceMocks.createOriginalFileSignedUrl.mockResolvedValueOnce(null);

    const response = await request(app).get('/api/documents/doc_1/file-url');

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'ORIGINAL_FILE_NOT_FOUND',
      message: 'Original file is not available for this document.',
    });
  });

  it('deletes documents successfully', async () => {
    serviceMocks.deleteDocument.mockResolvedValueOnce(true);

    const response = await request(app).delete('/api/documents/doc_1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
    });
  });
});
