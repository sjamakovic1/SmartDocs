import type { DocumentStatus } from '../../types/document';
import { statusLabels } from '../../utils/status';

const statusClasses: Record<DocumentStatus, string> = {
  UPLOADED: 'bg-blue-50 text-blue-700 ring-blue-200',
  NEEDS_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  VALIDATED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
};

export default function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
