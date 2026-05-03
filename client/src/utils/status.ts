import type { DocumentStatus, ValidationSeverity } from '../types/document';

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: 'Uploaded',
  NEEDS_REVIEW: 'Needs Review',
  VALIDATED: 'Validated',
  REJECTED: 'Rejected',
};

export const SEVERITY_LABELS: Record<ValidationSeverity, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  ERROR: 'Error',
};
