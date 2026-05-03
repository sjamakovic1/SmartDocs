import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ValidationIssue } from '../../../src/types/document';
import {
  confirmStoredDocument,
  rejectStoredDocument,
  reopenStoredDocument,
  updateStoredDocument,
  uploadAndParseDocument,
} from '../../../src/services/documentService';

const prismaMocks = vi.hoisted(() => {
  const tx = {
    document: {
      update: vi.fn(),
    },
    lineItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    validationIssue: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((callback: (txClient: typeof tx) => unknown) => callback(tx)),
      document: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      tx,
    },
  };
});

const storageUploadMock = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));

vi.mock('../../../src/config/prisma', () => ({
  prisma: prismaMocks.prisma,
}));

vi.mock('../../../src/config/supabase', () => ({
  getStorageBucketName: () => 'documents',
  supabase: {
    storage: {
      from: () => ({
        upload: storageUploadMock,
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

const date = new Date('2026-05-02T00:00:00.000Z');

describe('document status workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.prisma.$transaction.mockImplementation((callback) => callback(prismaMocks.prisma.tx));
    storageUploadMock.mockResolvedValue({ error: null });
  });

  it('creates uploaded documents with validation issues during upload', async () => {
    let createdDocument = makePrismaDocument({ status: 'UPLOADED' });
    prismaMocks.prisma.document.findMany.mockResolvedValueOnce([]);
    prismaMocks.prisma.document.create.mockImplementationOnce(({ data }) => {
      expect(data.status).toBe('UPLOADED');
      expect(data.validationIssues.create.length).toBeGreaterThan(0);
      createdDocument = makePrismaDocument({
        id: data.id,
        status: data.status,
        rawText: data.rawText,
        fileName: data.fileName,
        validationIssues: data.validationIssues.create.map(makePrismaIssue),
      });
      return Promise.resolve(createdDocument);
    });
    prismaMocks.prisma.document.update.mockImplementationOnce(({ data }) =>
      Promise.resolve(
        makePrismaDocument({
          ...createdDocument,
          fileName: data.fileName,
          fileStorageBucket: data.fileStorageBucket,
          fileStoragePath: data.fileStoragePath,
        }),
      ),
    );

    const document = await uploadAndParseDocument({
      buffer: Buffer.from('Invoice'),
      mimetype: 'text/plain',
      originalname: 'invoice.txt',
    });

    expect(document.status).toBe('UPLOADED');
    expect(document.validationIssues.length).toBeGreaterThan(0);
  });

  it('moves uploaded documents to needs review when saved', async () => {
    const uploadedDocument = makePrismaDocument({ status: 'UPLOADED' });
    prismaMocks.prisma.document.findUnique.mockResolvedValueOnce(uploadedDocument);
    prismaMocks.prisma.document.findMany.mockResolvedValueOnce([uploadedDocument]);
    prismaMocks.prisma.tx.document.update.mockImplementationOnce(({ data }) => {
      expect(data.status).toBe('NEEDS_REVIEW');
      return Promise.resolve(makePrismaDocument({ status: data.status }));
    });

    const document = await updateStoredDocument('doc_1', {
      supplierName: 'Updated Supplier',
    });

    expect(document?.status).toBe('NEEDS_REVIEW');
  });

  it('confirms documents as validated', async () => {
    const reviewDocument = makePrismaDocument({ status: 'NEEDS_REVIEW' });
    prismaMocks.prisma.document.findUnique.mockResolvedValueOnce(reviewDocument);
    prismaMocks.prisma.document.findMany.mockResolvedValueOnce([reviewDocument]);
    prismaMocks.prisma.tx.document.update.mockImplementationOnce(({ data }) => {
      expect(data.status).toBe('VALIDATED');
      return Promise.resolve(makePrismaDocument({ status: data.status }));
    });

    const document = await confirmStoredDocument('doc_1');

    expect(document?.status).toBe('VALIDATED');
  });

  it('rejects documents', async () => {
    prismaMocks.prisma.document.update.mockImplementationOnce(({ data }) => {
      expect(data.status).toBe('REJECTED');
      expect(data.rejectReason).toBe('Unreadable file');
      return Promise.resolve(makePrismaDocument({ status: data.status, rejectReason: data.rejectReason }));
    });

    const document = await rejectStoredDocument('doc_1', 'Unreadable file');

    expect(document?.status).toBe('REJECTED');
  });

  it('reopens rejected documents into needs review', async () => {
    const rejectedDocument = makePrismaDocument({
      rejectReason: 'Unreadable file',
      status: 'REJECTED',
    });
    prismaMocks.prisma.document.findUnique.mockResolvedValueOnce(rejectedDocument);
    prismaMocks.prisma.document.findMany.mockResolvedValueOnce([rejectedDocument]);
    prismaMocks.prisma.tx.document.update.mockImplementationOnce(({ data }) => {
      expect(data.status).toBe('NEEDS_REVIEW');
      expect(data.rejectReason).toBeNull();
      return Promise.resolve(makePrismaDocument({ rejectReason: null, status: data.status }));
    });

    const document = await reopenStoredDocument('doc_1');

    expect(document?.status).toBe('NEEDS_REVIEW');
  });
});

function makePrismaDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc_1',
    documentType: 'INVOICE',
    documentNumber: 'INV-1',
    supplierName: 'Supplier',
    issueDate: date,
    dueDate: new Date('2026-05-28T00:00:00.000Z'),
    currency: 'EUR',
    subtotal: new Prisma.Decimal(100),
    taxRate: new Prisma.Decimal(10),
    tax: new Prisma.Decimal(10),
    total: new Prisma.Decimal(110),
    status: 'NEEDS_REVIEW',
    rejectReason: null,
    rawText: 'Invoice INV-1',
    ocrConfidence: null,
    imageWidth: null,
    imageHeight: null,
    fileName: 'invoice.txt',
    fileUrl: null,
    mimeType: 'text/plain',
    fileSize: 123,
    fileStorageBucket: null,
    fileStoragePath: null,
    createdAt: date,
    updatedAt: date,
    lineItems: [
      {
        id: 'line_1',
        description: 'Service',
        quantity: new Prisma.Decimal(1),
        unitPrice: new Prisma.Decimal(100),
        lineTotal: new Prisma.Decimal(100),
        createdAt: date,
        documentId: 'doc_1',
      },
    ],
    validationIssues: [],
    ...overrides,
  };
}

function makePrismaIssue(issue: ValidationIssue, index: number) {
  return {
    id: issue.id ?? `issue_${index}`,
    code: issue.code,
    field: issue.field,
    severity: issue.severity,
    message: issue.message,
    createdAt: date,
    documentId: 'doc_1',
  };
}
