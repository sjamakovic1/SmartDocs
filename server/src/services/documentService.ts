import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { getStorageBucketName, supabase } from '../config/supabase';
import { parseCsvDocument } from '../parsers/csvParser';
import { parseImageDocument } from '../parsers/imageParser';
import { parsePdfDocument } from '../parsers/pdfParser';
import { parseTxtDocument } from '../parsers/txtParser';
import type { DocumentRecord, LineItem, ValidationIssue } from '../types/document';
import { detectSupportedUploadFileType, type SupportedUploadFileType } from '../utils/fileType';
import {
  hasBlockingValidationIssues,
  validateDocument,
} from '../validation/documentValidation';

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

const documentInclude = {
  lineItems: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  validationIssues: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.DocumentInclude;

type PrismaDocumentWithRelations = Prisma.DocumentGetPayload<{
  include: typeof documentInclude;
}>;

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

  const createdDocument = await prisma.document.create({
      data: {
        ...toPrismaDocumentCreateInput(documentWithId, 'UPLOADED'),
        lineItems: {
          create: toPrismaLineItems(documentWithId.lineItems),
        },
        validationIssues: {
          create: toPrismaValidationIssues(combinedIssues),
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

  const updatedDocument = await prisma.document.update({
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

async function cleanupCreatedDocument(id: string) {
  await prisma.document.delete({
    where: {
      id,
    },
  }).catch(() => undefined);
}

async function parseUploadedDocument(
  file: UploadedDocumentFile,
  fileType: SupportedUploadFileType,
) {
  if (fileType === 'PDF') {
    return parsePdfDocument(file.buffer, file.originalname);
  }

  if (fileType === 'IMAGE') {
    return parseImageDocument(file.buffer, file.originalname, file.mimetype);
  }

  const rawText = file.buffer.toString('utf8');
  return fileType === 'TXT'
    ? parseTxtDocument(rawText, file.originalname)
    : parseCsvDocument(rawText, file.originalname);
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
  const bucket = document.fileStorageBucket ?? getStorageBucketName();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(document.fileStoragePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new StorageSignedUrlError('Failed to create signed URL for original file.');
  }

  return {
    signedUrl: data.signedUrl,
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
  const status = getReviewStatus(document, validationIssues);

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
          data: toPrismaLineItems(payload.lineItems).map((lineItem) => ({
            ...lineItem,
            documentId: id,
          })),
        });
      }
    }

    if (validationIssues.length > 0) {
      await tx.validationIssue.createMany({
        data: toPrismaValidationIssues(validationIssues).map((issue) => ({
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

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class RejectedDocumentUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RejectedDocumentUpdateError';
  }
}

export class DocumentValidationError extends Error {
  constructor(
    message: string,
    public document: StoredDocument,
  ) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}

export class StorageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUploadError';
  }
}

export class StorageSignedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageSignedUrlError';
  }
}

export class DocumentSaveError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'DocumentSaveError';
  }
}

async function replaceValidationIssues(
  id: string,
  validationIssues: ValidationIssue[],
  documentUpdates: Prisma.DocumentUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    await tx.validationIssue.deleteMany({
      where: {
        documentId: id,
      },
    });

    if (validationIssues.length > 0) {
      await tx.validationIssue.createMany({
        data: toPrismaValidationIssues(validationIssues).map((issue) => ({
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

function getReviewStatus(document: StoredDocument, validationIssues: ValidationIssue[]) {
  if (hasBlockingValidationIssues(validationIssues)) {
    return document.status === 'UPLOADED' ? 'UPLOADED' : 'NEEDS_REVIEW';
  }

  return document.status === 'VALIDATED' || document.status === 'UPLOADED'
    ? document.status
    : 'NEEDS_REVIEW';
}

function getStatusAfterSave(status: NonNullable<DocumentRecord['status']>) {
  return status === 'VALIDATED' ? 'VALIDATED' : 'NEEDS_REVIEW';
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

function toPrismaDocumentCreateInput(
  document: StoredDocument,
  status: NonNullable<DocumentRecord['status']>,
): Prisma.DocumentCreateInput {
  return {
    id: document.id,
    documentType: document.documentType,
    status,
    documentNumber: document.documentNumber ?? null,
    supplierName: document.supplierName ?? null,
    issueDate: toDate(document.issueDate),
    dueDate: toDate(document.dueDate),
    currency: normalizeCurrency(document.currency),
    subtotal: toDecimal(document.subtotal),
    taxRate: toDecimal(document.taxRate),
    tax: toDecimal(document.tax),
    total: toDecimal(document.total),
    rawText: document.rawText ?? null,
    fileName: document.fileName ?? null,
    mimeType: document.mimeType ?? null,
    fileSize: document.fileSize ?? null,
    fileStorageBucket: document.fileStorageBucket ?? null,
    fileStoragePath: document.fileStoragePath ?? null,
    rejectReason: document.rejectReason ?? null,
    ocrConfidence: document.ocrConfidence ?? null,
    imageWidth: document.imageWidth ?? null,
    imageHeight: document.imageHeight ?? null,
  };
}

function toPrismaDocumentUpdateInput(document: StoredDocument): Prisma.DocumentUpdateInput {
  return {
    documentType: document.documentType,
    documentNumber: document.documentNumber ?? null,
    supplierName: document.supplierName ?? null,
    issueDate: toDate(document.issueDate),
    dueDate: toDate(document.dueDate),
    currency: normalizeCurrency(document.currency),
    subtotal: toDecimal(document.subtotal),
    taxRate: toDecimal(document.taxRate),
    tax: toDecimal(document.tax),
    total: toDecimal(document.total),
  };
}

function toPrismaLineItems(lineItems: LineItem[]) {
  return lineItems.map((lineItem, index) => ({
    id: createLineItemId(index),
    description: lineItem.description,
    quantity: toDecimal(lineItem.quantity) ?? new Prisma.Decimal(0),
    unitPrice: toDecimal(lineItem.unitPrice) ?? new Prisma.Decimal(0),
    lineTotal: toDecimal(lineItem.lineTotal) ?? new Prisma.Decimal(0),
  }));
}

function toPrismaValidationIssues(validationIssues: ValidationIssue[]) {
  return validationIssues.map((issue, index) => ({
    id: createValidationIssueId(index),
    code: issue.code,
    field: issue.field ?? null,
    severity: issue.severity,
    message: issue.message,
  }));
}

function toStoredDocument(document: PrismaDocumentWithRelations): StoredDocument {
  return {
    id: document.id,
    documentType: document.documentType as DocumentRecord['documentType'],
    documentNumber: document.documentNumber,
    supplierName: document.supplierName,
    issueDate: toApiDate(document.issueDate),
    dueDate: toApiDate(document.dueDate),
    currency: document.currency,
    subtotal: toNumber(document.subtotal),
    taxRate: toNumber(document.taxRate),
    tax: toNumber(document.tax),
    total: toNumber(document.total),
    status: document.status as NonNullable<DocumentRecord['status']>,
    rejectReason: document.rejectReason,
    rawText: document.rawText,
    ocrConfidence: document.ocrConfidence,
    imageWidth: document.imageWidth,
    imageHeight: document.imageHeight,
    fileName: document.fileName,
    fileUrl: null,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    fileStorageBucket: document.fileStorageBucket,
    fileStoragePath: document.fileStoragePath,
    validationIssues: document.validationIssues.map((issue) => ({
      id: issue.id,
      field: issue.field ?? '',
      code: issue.code as ValidationIssue['code'],
      message: issue.message,
      severity: issue.severity as ValidationIssue['severity'],
      resolved: false,
    })),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    lineItems: document.lineItems.map((lineItem) => ({
      id: lineItem.id,
      description: lineItem.description,
      quantity: toNumber(lineItem.quantity) ?? 0,
      unitPrice: toNumber(lineItem.unitPrice) ?? 0,
      lineTotal: toNumber(lineItem.lineTotal) ?? 0,
    })),
  };
}

function normalizeCurrency(currency: string | null | undefined) {
  const normalized = currency?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function toDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toApiDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDecimal(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? null
    : new Prisma.Decimal(value);
}

function toNumber(value: Prisma.Decimal | null) {
  return value === null ? null : value.toNumber();
}

function createDocumentId() {
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function uploadOriginalFile(file: UploadedDocumentFile, documentId: string) {
  const bucket = getStorageBucketName();
  const fileStoragePath = createStoragePath(documentId, file.originalname);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileStoragePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new StorageUploadError(`Failed to upload original file to Supabase Storage: ${error.message}`);
  }

  return {
    fileStorageBucket: bucket,
    fileStoragePath,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size ?? file.buffer.byteLength,
  };
}

async function removeOriginalFile(bucket: string | null, fileStoragePath: string) {
  const { error } = await supabase.storage
    .from(bucket ?? getStorageBucketName())
    .remove([fileStoragePath]);

  if (error) {
    console.warn(`Failed to delete original file from Supabase Storage: ${error.message}`);
  }
}

function createStoragePath(documentId: string, originalFileName: string) {
  const safeFileName = sanitizeFileName(originalFileName);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  return `documents/${documentId}/${timestamp}-${safeFileName}`;
}

function sanitizeFileName(fileName: string) {
  const fallbackName = 'uploaded-file';
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/(\.[A-Za-z0-9]{1,12})$/);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? '';
  const baseName = (extension ? trimmed.slice(0, -extension.length) : trimmed)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();

  return `${baseName || fallbackName}${extension}`;
}

function createLineItemId(index: number) {
  return `line_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`;
}

function createValidationIssueId(index: number) {
  return `issue_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`;
}

function isPrismaNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
