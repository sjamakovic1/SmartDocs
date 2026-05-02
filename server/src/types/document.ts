export type DocumentType = 'INVOICE' | 'PURCHASE_ORDER' | 'UNKNOWN';

export type DocumentStatus =
  | 'UPLOADED'
  | 'NEEDS_REVIEW'
  | 'VALIDATED'
  | 'REJECTED';

export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR';

export type ValidationIssueCode =
  | 'MISSING_FIELD'
  | 'INVALID_DATE'
  | 'UNSUPPORTED_CURRENCY'
  | 'CURRENCY_INFERRED'
  | 'OCR_LOW_CONFIDENCE'
  | 'OCR_NO_TEXT_DETECTED'
  | 'IMAGE_LOW_RESOLUTION'
  | 'UNSUPPORTED_DOCUMENT_TYPE'
  | 'OCR_CURRENCY_CORRECTED'
  | 'OCR_LIMITED_EXTRACTION'
  | 'MULTIPLE_DOCUMENTS_DETECTED'
  | 'TAX_RATE_DERIVED'
  | 'PLACEHOLDER_VALUE_DETECTED'
  | 'DUPLICATE_DOCUMENT_NUMBER'
  | 'LINE_TOTAL_MISMATCH'
  | 'SUBTOTAL_MISMATCH'
  | 'TAX_MISMATCH'
  | 'TOTAL_MISMATCH';

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ValidationIssue {
  id?: string;
  field: string;
  code: ValidationIssueCode;
  message: string;
  severity: ValidationSeverity;
  resolved?: boolean;
  expectedValue?: string | number | null;
  actualValue?: string | number | null;
}

export interface DocumentRecord {
  id?: string;
  documentType: DocumentType;
  documentNumber?: string | null;
  supplierName?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  taxRate?: number | null;
  tax?: number | null;
  total?: number | null;
  status?: DocumentStatus;
  rejectReason?: string | null;
  rawText?: string | null;
  ocrConfidence?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  fileName?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  fileStorageBucket?: string | null;
  fileStoragePath?: string | null;
  validationIssues?: ValidationIssue[];
  createdAt?: string;
  updatedAt?: string;
  lineItems: LineItem[];
}
