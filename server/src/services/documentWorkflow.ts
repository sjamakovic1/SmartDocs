import type { DocumentStatus, ValidationIssue } from '../types/document';
import { hasBlockingValidationIssues } from '../validation/documentValidation';

export function getReviewStatus(
  currentStatus: DocumentStatus,
  validationIssues: ValidationIssue[],
): DocumentStatus {
  if (hasBlockingValidationIssues(validationIssues)) {
    return currentStatus === 'UPLOADED' ? 'UPLOADED' : 'NEEDS_REVIEW';
  }

  if (currentStatus === 'VALIDATED' || currentStatus === 'UPLOADED') {
    return currentStatus;
  }

  return 'NEEDS_REVIEW';
}

export function getStatusAfterSave(currentStatus: DocumentStatus): DocumentStatus {
  if (currentStatus === 'VALIDATED') {
    return 'VALIDATED';
  }

  if (currentStatus === 'UPLOADED') {
    return 'NEEDS_REVIEW';
  }

  return 'NEEDS_REVIEW';
}
