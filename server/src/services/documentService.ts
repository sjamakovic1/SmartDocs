import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { parseCsvDocument } from '../parsers/csvParser';
import { parseImageDocument } from '../parsers/imageParser';
import { parsePdfDocument } from '../parsers/pdfParser';
import { parseTxtDocument } from '../parsers/txtParser';
import type { ParsedDocument } from '../parsers/parserTypes';
import type { DocumentRecord, ValidationIssue } from '../types/document';
import { detectSupportedUploadFileType, type SupportedUploadFileType } from '../utils/fileType';
import {
  DocumentSaveError,
  DocumentValidationError,
  RejectedDocumentUpdateError,
  StorageUploadError,
  UnsupportedFileTypeError,
} from './documentErrors';
import {
  documentInclude,
  normalizeCurrency,
  toPrismaDocumentCreateInput,
  toPrismaDocumentUpdateInput,
  toPrismaLineItems,
  toPrismaValidationIssues,
  toStoredDocument,
} from './documentMapper';
import { hasBlockingValidationIssues, validateDocument } from '../validation/documentValidation';
import {
  createOriginalFileSignedUrlFromStoragePath,
  removeOriginalFile,
  uploadOriginalFile,
} from './documentStorageService';
import { getReviewStatus, getStatusAfterSave } from './documentWorkflow';

export {
  DocumentSaveError,
  DocumentValidationError,
  RejectedDocumentUpdateError,
  StorageSignedUrlError,
  StorageUploadError,
  UnsupportedFileTypeError,
} from './documentErrors';

export interface UploadedDocumentFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
}

export interface StoredDocument extends DocumentRecord {
  id: string;
  status: NonNullable<DocumentRecord['status']>;
  validationIssues: ValidationIssue[];
  createdAt: string;
  updatedAt: string;
  mimeType?: string | null;
  fileSize?: number | null;
  fileStorageBucket?: string | null;
  fileStoragePath?: string | null;
}

export type DocumentUpdatePayload = Partial<
  Pick<
    DocumentRecord,
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
  >
>;

export async function uploadAndParseDocument(file: UploadedDocumentFile): Promise<StoredDocument> {
  const fileType = detectSupportedUploadFileType(file.originalname, file.mimetype);

  if (!fileType) {
    throw new UnsupportedFileTypeError(
      'Unsupported file type. Supported formats are PDF, CSV, TXT, PNG, JPG, and JPEG.',
    );
  }

  const parsedDocument = await parseUploadedDocument(file, fileType);
  const parserIssues = parsedDocument.validationIssues ?? [];
  const existingDocuments = await getDocuments();

  const documentWithId: StoredDocument = {
    ...parsedDocument,
    currency: normalizeCurrency(parsedDocument.currency),
    id: createDocumentId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    validationIssues: parserIssues,
    status: 'UPLOADED',
    mimeType: file.mimetype,
    fileSize: file.size ?? file.buffer.byteLength,
  };

  const validationIssues = validateDocument(documentWithId, {
    existingDocuments,
  });
  const combinedIssues = [...parserIssues, ...validationIssues];

  const createdDocument = await prisma.document
    .create({
      data: {
        ...toPrismaDocumentCreateInput(documentWithId, 'UPLOADED'),
        lineItems: {
          create: toPrismaLineItems(documentWithId.lineItems, createLineItemId),
        },
        validationIssues: {
          create: toPrismaValidationIssues(combinedIssues, createValidationIssueId),
        },
      },
      include: documentInclude,
    })
    .catch((error: unknown) => {
      throw new DocumentSaveError('Failed to save parsed document to the database.', error);
    });

  let fileStorage: Prisma.DocumentUpdateInput;
  try {
    fileStorage = await uploadOriginalFile(file, createdDocument.id);
  } catch (error) {
    await cleanupCreatedDocument(createdDocument.id);

    if (error instanceof StorageUploadError) {
      throw error;
    }

    throw new StorageUploadError('Failed to upload original file to Supabase Storage.');
  }

  const updatedDocument = await prisma.document
    .update({
      where: {
        id: createdDocument.id,
      },
      data: fileStorage,
      include: documentInclude,
    })
    .catch(async (error: unknown) => {
      if (typeof fileStorage.fileStoragePath === 'string') {
        await removeOriginalFile(
          typeof fileStorage.fileStorageBucket === 'string' ? fileStorage.fileStorageBucket : null,
          fileStorage.fileStoragePath,
        );
      }

      throw new DocumentSaveError('Failed to save original file metadata to the database.', error);
    });

  return toStoredDocument(updatedDocument);
}

async function cleanupCreatedDocument(id: string): Promise<void> {
  await prisma.document.delete({
    where: {
      id,
    },
  }).catch(() => undefined);
}

async function parseUploadedDocument(
  file: UploadedDocumentFile,
  fileType: SupportedUploadFileType,
): Promise<ParsedDocument> {
  if (fileType === 'PDF') {
    return parsePdfDocument(file.buffer, file.originalname);
  }

  if (fileType === 'IMAGE') {
    return parseImageDocument(file.buffer, file.originalname, file.mimetype);
  }

  const rawText = file.buffer.toString('utf8');
  if (fileType === 'TXT') {
    return parseTxtDocument(rawText, file.originalname);
  }

  return parseCsvDocument(rawText, file.originalname);
}

export async function getDocuments(): Promise<StoredDocument[]> {
  const documents = await prisma.document.findMany({
    include: documentInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return documents.map(toStoredDocument);
}

export async function getDocumentById(id: string): Promise<StoredDocument | null> {
  const document = await prisma.document.findUnique({
    where: {
      id,
    },
    include: documentInclude,
  });

  return document ? toStoredDocument(document) : null;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const document = await prisma.document.findUnique({
    where: {
      id,
    },
    select: {
      fileStorageBucket: true,
      fileStoragePath: true,
    },
  });

  if (!document) {
    return false;
  }

  if (document.fileStoragePath) {
    await removeOriginalFile(document.fileStorageBucket, document.fileStoragePath);
  }

  const deleted = await prisma.document.deleteMany({
    where: {
      id,
    },
  });

  return deleted.count > 0;
}

export async function createOriginalFileSignedUrl(id: string) {
  const document = await prisma.document.findUnique({
    where: {
      id,
    },
    select: {
      fileStorageBucket: true,
      fileStoragePath: true,
    },
  });

  if (!document?.fileStoragePath) {
    return null;
  }

  const expiresIn = 3600;
  const signedUrl = await createOriginalFileSignedUrlFromStoragePath(
    document.fileStoragePath,
    expiresIn,
    document.fileStorageBucket,
  );

  return {
    signedUrl,
    expiresIn,
  };
}

export async function validateStoredDocument(id: string): Promise<StoredDocument | null> {
  const document = await getDocumentById(id);

  if (!document) {
    return null;
  }

  if (document.status === 'REJECTED') {
    return document;
  }

  const existingDocuments = await getDocuments();
  const validationIssues = validateDocument(document, {
    existingDocuments,
  });
  const status = getReviewStatus(document.status, validationIssues);

  return replaceValidationIssues(id, validationIssues, {
    status,
  });
}

export async function updateStoredDocument(
  id: string,
  payload: DocumentUpdatePayload,
): Promise<StoredDocument | null> {
  const document = await getDocumentById(id);

  if (!document) {
    return null;
  }

  if (document.status === 'REJECTED') {
    throw new RejectedDocumentUpdateError('Reopen this document before saving corrections.');
  }

  const updatedDocumentDraft: StoredDocument = {
    ...document,
    ...pickDocumentUpdateFields(payload),
    currency:
      payload.currency === undefined ? document.currency : normalizeCurrency(payload.currency),
    lineItems: payload.lineItems ?? document.lineItems,
    status: getStatusAfterSave(document.status),
    updatedAt: new Date().toISOString(),
  };
  const existingDocuments = await getDocuments();
  const validationIssues = validateDocument(updatedDocumentDraft, {
    existingDocuments,
  });

  return prisma.$transaction(async (tx) => {
    await tx.validationIssue.deleteMany({
      where: {
        documentId: id,
      },
    });

    if (payload.lineItems) {
      await tx.lineItem.deleteMany({
        where: {
          documentId: id,
        },
      });
      if (payload.lineItems.length > 0) {
        await tx.lineItem.createMany({
          data: toPrismaLineItems(payload.lineItems, createLineItemId).map((lineItem) => ({
            ...lineItem,
            documentId: id,
          })),
        });
      }
    }

    if (validationIssues.length > 0) {
      await tx.validationIssue.createMany({
        data: toPrismaValidationIssues(validationIssues, createValidationIssueId).map((issue) => ({
          ...issue,
          documentId: id,
        })),
      });
    }

    const updated = await tx.document.update({
      where: {
        id,
      },
      data: {
        ...toPrismaDocumentUpdateInput(updatedDocumentDraft),
        status: updatedDocumentDraft.status,
      },
      include: documentInclude,
    });

    return toStoredDocument(updated);
  });
}

export async function confirmStoredDocument(id: string): Promise<StoredDocument | null> {
  const document = await getDocumentById(id);

  if (!document) {
    return null;
  }

  if (document.status === 'REJECTED') {
    throw new RejectedDocumentUpdateError('Reopen this document before confirming it.');
  }

  const existingDocuments = await getDocuments();
  const validationIssues = validateDocument(document, {
    existingDocuments,
  });
  const status = hasBlockingValidationIssues(validationIssues) ? 'NEEDS_REVIEW' : 'VALIDATED';
  const updatedDocument = await replaceValidationIssues(id, validationIssues, {
    status,
  });

  if (hasBlockingValidationIssues(validationIssues)) {
    throw new DocumentValidationError('Document still has validation issues.', updatedDocument);
  }

  return updatedDocument;
}

export async function rejectStoredDocument(
  id: string,
  rejectReason: string,
): Promise<StoredDocument | null> {
  const document = await prisma.document.update({
    where: {
      id,
    },
    data: {
      rejectReason,
      status: 'REJECTED',
    },
    include: documentInclude,
  }).catch((error: unknown) => {
    if (isPrismaNotFoundError(error)) {
      return null;
    }
    throw error;
  });

  return document ? toStoredDocument(document) : null;
}

export async function reopenStoredDocument(id: string): Promise<StoredDocument | null> {
  const document = await getDocumentById(id);

  if (!document) {
    return null;
  }

  const draft: StoredDocument = {
    ...document,
    rejectReason: null,
    status: 'NEEDS_REVIEW',
  };
  const existingDocuments = await getDocuments();
  const validationIssues = validateDocument(draft, {
    existingDocuments,
  });

  return replaceValidationIssues(id, validationIssues, {
    rejectReason: null,
    status: 'NEEDS_REVIEW',
  });
}

async function replaceValidationIssues(
  id: string,
  validationIssues: ValidationIssue[],
  documentUpdates: Prisma.DocumentUpdateInput,
): Promise<StoredDocument> {
  return prisma.$transaction(async (tx) => {
    await tx.validationIssue.deleteMany({
      where: {
        documentId: id,
      },
    });

    if (validationIssues.length > 0) {
      await tx.validationIssue.createMany({
        data: toPrismaValidationIssues(validationIssues, createValidationIssueId).map((issue) => ({
          ...issue,
          documentId: id,
        })),
      });
    }

    const updated = await tx.document.update({
      where: {
        id,
      },
      data: documentUpdates,
      include: documentInclude,
    });

    return toStoredDocument(updated);
  });
}

function pickDocumentUpdateFields(payload: DocumentUpdatePayload): DocumentUpdatePayload {
  const updateFields: DocumentUpdatePayload = {
    documentType: payload.documentType,
    documentNumber: payload.documentNumber,
    supplierName: payload.supplierName,
    issueDate: payload.issueDate,
    dueDate: payload.dueDate,
    currency: payload.currency,
    subtotal: payload.subtotal,
    taxRate: payload.taxRate,
    tax: payload.tax,
    total: payload.total,
  };

  return Object.fromEntries(
    Object.entries(updateFields).filter(([, value]) => value !== undefined),
  ) as DocumentUpdatePayload;
}

function createDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createLineItemId(index: number): string {
  return `line_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`;
}

function createValidationIssueId(index: number): string {
  return `issue_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`;
}

function isPrismaNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
