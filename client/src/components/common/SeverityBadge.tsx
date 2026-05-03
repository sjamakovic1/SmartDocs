import type { ValidationSeverity } from '../../types/document';
import { SEVERITY_LABELS } from '../../utils/status';

interface SeverityBadgeProps {
  severity: ValidationSeverity;
}

const SEVERITY_CLASSES: Record<ValidationSeverity, string> = {
  ERROR: 'bg-red-50 text-red-700 ring-red-200',
  WARNING: 'bg-amber-50 text-amber-700 ring-amber-200',
  INFO: 'bg-blue-50 text-blue-700 ring-blue-200',
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${SEVERITY_CLASSES[severity]}`}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
