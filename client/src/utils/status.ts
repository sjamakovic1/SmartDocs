import type { DocumentStatus, ValidationSeverity } from '../types/document';

export const statusLabels: Record<DocumentStatus, string> = {
  UPLOADED: 'Uploaded',
  NEEDS_REVIEW: 'Needs Review',
  VALIDATED: 'Validated',
  REJECTED: 'Rejected',
};

export const severityLabels: Record<ValidationSeverity, string> = {
  INFO: 'Info',
  WARNING: 'Warning',
  ERROR: 'Error',
};
