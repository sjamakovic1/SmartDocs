import type { Document } from '../../types/document';
import StatCard from './StatCard';

export default function DashboardStats({ documents }: { documents: Document[] }) {
  const uploaded = documents.filter((document) => document.status === 'UPLOADED').length;
  const needsReview = documents.filter((document) => document.status === 'NEEDS_REVIEW').length;
  const validated = documents.filter((document) => document.status === 'VALIDATED').length;
  const rejected = documents.filter((document) => document.status === 'REJECTED').length;
  const issueCount = documents.reduce(
    (sum, document) => sum + document.validationIssues.filter((issue) => !issue.resolved).length,
    0,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <StatCard label="Total documents" value={documents.length} />
      <StatCard label="Uploaded" value={uploaded} />
      <StatCard label="Needs review" value={needsReview} />
      <StatCard label="Validated" value={validated} />
      <StatCard label="Rejected" value={rejected} />
      <StatCard label="Open issues" value={issueCount} />
    </div>
  );
}
