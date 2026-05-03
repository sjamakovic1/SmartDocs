import { Prisma } from '@prisma/client';

import type {
  DocumentRecord,
  DocumentStatus,
  LineItem,
  ValidationIssue,
} from '../types/document';
import type { StoredDocument } from './documentService';

type IdFactory = (index: number) => string;

export const documentInclude = {
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

export function toPrismaDocumentCreateInput(
  document: StoredDocument,
  status: DocumentStatus,
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

export function toPrismaDocumentUpdateInput(document: StoredDocument): Prisma.DocumentUpdateInput {
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

export function toPrismaLineItems(lineItems: LineItem[], createLineItemId: IdFactory) {
  return lineItems.map((lineItem, index) => ({
    id: createLineItemId(index),
    description: lineItem.description,
    quantity: toDecimal(lineItem.quantity) ?? new Prisma.Decimal(0),
    unitPrice: toDecimal(lineItem.unitPrice) ?? new Prisma.Decimal(0),
    lineTotal: toDecimal(lineItem.lineTotal) ?? new Prisma.Decimal(0),
  }));
}

export function toPrismaValidationIssues(
  validationIssues: ValidationIssue[],
  createValidationIssueId: IdFactory,
) {
  return validationIssues.map((issue, index) => ({
    id: createValidationIssueId(index),
    code: issue.code,
    field: issue.field ?? null,
    severity: issue.severity,
    message: issue.message,
  }));
}

export function toStoredDocument(document: PrismaDocumentWithRelations): StoredDocument {
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

export function normalizeCurrency(currency: string | null | undefined): string | null {
  const normalized = currency?.trim().toUpperCase();
  return normalized ? normalized : null;
}

export function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toApiDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toDecimal(value: number | null | undefined): Prisma.Decimal | null {
  return value === null || value === undefined || !Number.isFinite(value)
    ? null
    : new Prisma.Decimal(value);
}

export function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}
