import sharp from 'sharp';
import Tesseract from 'tesseract.js';

import { extractCommonFields } from '../extraction/extractCommonFields';
import { normalizeOcrText } from '../extraction/normalizeOcrText';
import type { DocumentType, ValidationIssue } from '../types/document';
import { createEmptyParsedDocument, type ParsedDocument } from './parserTypes';

const LOW_CONFIDENCE_THRESHOLD = 60;
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const IMAGE_PURCHASE_ORDER_REGEX = /\bpurchase\s+order\b|\bpo\s*(?:number|#|no\.?)\b/i;
const IMAGE_INVOICE_REGEX = /\binvoice\b|\bfacture(?:\s+proforma)?\b/i;
const FALLBACK_DOCUMENT_NUMBER_REGEX =
  /\binvoice\s*(?:#|no\.?|number)?\s*:?\s*#?\s*([A-Z0-9-]+)/i;
const FALLBACK_SUPPLIER_REGEX = /\b(?:supplier|company)\s*:\s*(.+?)(?:\n|$)/i;
const FALLBACK_SUPPLIER_WITHOUT_COLON_REGEX = /\bsupplier\s+((?!details\b).+?)(?:\n|$)/i;
const BUSINESS_DOCUMENT_REGEX =
  /\b(invoice|tax\s+invoice|facture|purchase\s+order|po\s+number|supplier|total|amount|tax|vat|tva|subtotal)\b/i;
const MULTIPLE_DOCUMENTS_REGEX =
  /\b(invoice\s+(?:number|no\.?)|tax\s+invoice|invoice\s+date|purchase\s+order)\b/gi;

export async function parseImageDocument(
  buffer: Buffer,
  fileName?: string,
  _mimeType?: string,
): Promise<ParsedDocument> {
  const metadata = await sharp(buffer).metadata();
  const imageWidth = metadata.width ?? null;
  const imageHeight = metadata.height ?? null;
  const warnings: ValidationIssue[] = [];

  addLowResolutionWarning(warnings, imageWidth, imageHeight);

  const processedImage = await preprocessImageForOcr(buffer);
  const ocrResult = await Tesseract.recognize(processedImage, 'eng');
  const rawText = ocrResult.data.text;
  const { normalizedText, warnings: normalizationWarnings } = normalizeOcrText(rawText);
  const ocrConfidence = getOcrConfidence(ocrResult.data.confidence);

  addOcrQualityWarnings(warnings, rawText, ocrConfidence);

  const documentType = detectImageDocumentType(normalizedText);
  const document = createEmptyParsedDocument(rawText, fileName, documentType);

  document.ocrConfidence = ocrConfidence;
  document.imageWidth = imageWidth;
  document.imageHeight = imageHeight;
  const commonWarnings = applyExtractedOcrFields(document, normalizedText);
  document.validationIssues = [...warnings, ...normalizationWarnings, ...commonWarnings];

  applyImageTextWarnings(document, normalizedText);
  addLimitedExtractionWarning(document);

  return document;
}

export function parseImageOcrText(rawText: string, fileName?: string): ParsedDocument {
  const { normalizedText, warnings: normalizationWarnings } = normalizeOcrText(rawText);
  const documentType = detectImageDocumentType(normalizedText);
  const document = createEmptyParsedDocument(rawText, fileName, documentType);

  document.validationIssues = [
    ...normalizationWarnings,
    ...applyExtractedOcrFields(document, normalizedText),
  ];
  applyImageTextWarnings(document, normalizedText);
  addLimitedExtractionWarning(document);

  return document;
}

async function preprocessImageForOcr(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();
}

function addLowResolutionWarning(
  warnings: ValidationIssue[],
  imageWidth: number | null,
  imageHeight: number | null,
): void {
  if (
    imageWidth !== null &&
    imageHeight !== null &&
    (imageWidth < MIN_IMAGE_WIDTH || imageHeight < MIN_IMAGE_HEIGHT)
  ) {
    warnings.push(
      makeOcrIssue(
        'image',
        'IMAGE_LOW_RESOLUTION',
        'Image resolution is low and may affect OCR accuracy.',
        'WARNING',
      ),
    );
  }
}

function getOcrConfidence(confidence: number): number | null {
  return Number.isFinite(confidence) ? confidence : null;
}

function addOcrQualityWarnings(
  warnings: ValidationIssue[],
  rawText: string,
  ocrConfidence: number | null,
): void {
  if (ocrConfidence !== null && ocrConfidence < LOW_CONFIDENCE_THRESHOLD) {
    warnings.push(
      makeOcrIssue(
        'ocr',
        'OCR_LOW_CONFIDENCE',
        'OCR confidence is low. Please review the extracted text manually.',
        'WARNING',
        LOW_CONFIDENCE_THRESHOLD,
        ocrConfidence,
      ),
    );
  }

  if (rawText.replace(/\s/g, '').length < 20) {
    warnings.push(
      makeOcrIssue(
        'ocr',
        'OCR_NO_TEXT_DETECTED',
        'No readable text was detected in the image.',
        'ERROR',
      ),
    );
  }
}

function applyImageTextWarnings(document: ParsedDocument, normalizedText: string): void {
  if (looksLikeDashboardInsteadOfDocument(normalizedText)) {
    document.documentType = 'UNKNOWN';
    clearExtractedFields(document);
    document.validationIssues?.push(
      makeOcrIssue(
        'documentType',
        'UNSUPPORTED_DOCUMENT_TYPE',
        'The uploaded image does not appear to be an invoice or purchase order.',
        'ERROR',
      ),
    );
  }

  if (
    document.documentType === 'UNKNOWN' &&
    !looksLikeBusinessDocument(normalizedText) &&
    !hasIssue(document, 'UNSUPPORTED_DOCUMENT_TYPE')
  ) {
    document.validationIssues?.push(
      makeOcrIssue(
        'documentType',
        'UNSUPPORTED_DOCUMENT_TYPE',
        'The uploaded image does not appear to be an invoice or purchase order.',
        'ERROR',
      ),
    );
  }

  if (looksLikeMultipleDocuments(normalizedText)) {
    document.validationIssues?.push(
      makeOcrIssue(
        'rawText',
        'MULTIPLE_DOCUMENTS_DETECTED',
        'Multiple documents may be present in this image. Please upload one document at a time.',
        'WARNING',
      ),
    );
  }
}

function clearExtractedFields(document: ParsedDocument): void {
  document.documentNumber = null;
  document.supplierName = null;
  document.issueDate = null;
  document.dueDate = null;
  document.currency = null;
  document.subtotal = null;
  document.taxRate = null;
  document.tax = null;
  document.total = null;
  document.lineItems = [];
}

function hasIssue(document: ParsedDocument, code: ValidationIssue['code']): boolean {
  return document.validationIssues?.some((issue) => issue.code === code) ?? false;
}

function detectImageDocumentType(rawText: string): DocumentType {
  if (IMAGE_PURCHASE_ORDER_REGEX.test(rawText)) {
    return 'PURCHASE_ORDER';
  }

  if (IMAGE_INVOICE_REGEX.test(rawText)) {
    return 'INVOICE';
  }

  return 'UNKNOWN';
}

function extractDocumentNumber(rawText: string): string | null {
  const match = rawText.match(FALLBACK_DOCUMENT_NUMBER_REGEX);

  return match?.[1]?.trim() ?? null;
}

function extractSupplierName(rawText: string): string | null {
  const match = rawText.match(FALLBACK_SUPPLIER_REGEX)
    ?? rawText.match(FALLBACK_SUPPLIER_WITHOUT_COLON_REGEX);
  return match?.[1]?.trim() ?? null;
}

function applyExtractedOcrFields(document: ParsedDocument, rawText: string): ValidationIssue[] {
  const commonFields = extractCommonFields(rawText);

  document.documentNumber = commonFields.documentNumber ?? extractDocumentNumber(rawText);
  document.supplierName = commonFields.supplierName ?? extractSupplierName(rawText);
  document.issueDate = commonFields.issueDate ?? null;
  document.dueDate = commonFields.dueDate ?? null;
  document.subtotal = commonFields.subtotal ?? null;
  document.taxRate = commonFields.taxRate ?? null;
  document.tax = commonFields.tax ?? null;
  document.total = commonFields.total ?? null;
  document.currency = commonFields.currency ?? null;
  document.lineItems = commonFields.lineItems ?? [];

  return commonFields.warnings;
}

function looksLikeBusinessDocument(rawText: string): boolean {
  return BUSINESS_DOCUMENT_REGEX.test(rawText);
}

function looksLikeDashboardInsteadOfDocument(rawText: string): boolean {
  const dashboardTerms = [
    /\bdashboard\b/i,
    /\bcustomers\b/i,
    /\busers\b/i,
    /\bbilling\b/i,
    /\bmonitoring\b/i,
    /\breporting\b/i,
    /\bconfiguration\b/i,
    /\bportal\s+access\b/i,
    /\badd\s+host\b/i,
    /\bedit\s+details\b/i,
  ];
  const dashboardHits = dashboardTerms.filter((term) => term.test(rawText)).length;
  return dashboardHits >= 4 && !looksLikeBusinessDocument(rawText);
}

function looksLikeMultipleDocuments(rawText: string): boolean {
  const matches = rawText.match(MULTIPLE_DOCUMENTS_REGEX) ?? [];
  return matches.length >= 3 && new Set(matches.map((match) => match.toLowerCase())).size >= 2;
}

function addLimitedExtractionWarning(document: ParsedDocument): void {
  const hasIdentityField = Boolean(document.documentNumber || document.supplierName);
  const hasFinancialField = Boolean(
    document.total !== null ||
    document.currency ||
    document.lineItems.length > 0,
  );

  if (!hasIdentityField || hasFinancialField) {
    return;
  }

  document.validationIssues?.push(
    makeOcrIssue(
      'rawText',
      'OCR_LIMITED_EXTRACTION',
      'Only limited fields could be extracted from this image. Manual review is required.',
      'WARNING',
    ),
  );
}

function makeOcrIssue(
  field: string,
  code: ValidationIssue['code'],
  message: string,
  severity: ValidationIssue['severity'],
  expectedValue?: string | number | null,
  actualValue?: string | number | null,
): ValidationIssue {
  return {
    field,
    code,
    message,
    severity,
    expectedValue,
    actualValue,
  };
}
