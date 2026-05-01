export type DocumentType = 'INVOICE' | 'PURCHASE_ORDER' | 'UNKNOWN';

export type DocumentStatus =
  | 'UPLOADED'
  | 'NEEDS_REVIEW'
  | 'VALIDATED'
  | 'REJECTED';

export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ValidationIssue {
  id: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
  resolved: boolean;
}

export interface Document {
  id: string;
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
  status: DocumentStatus;
  rejectReason?: string | null;
  rawText?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: LineItem[];
  validationIssues: ValidationIssue[];
}
