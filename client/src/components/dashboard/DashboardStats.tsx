import type { Document } from '../../types/document';
import StatCard from './StatCard';

type DashboardStatsSummary = {
  totalDocuments: number;
  uploaded: number;
  needsReview: number;
  validated: number;
  rejected: number;
  issueCount: number;
};

export default function DashboardStats({ documents }: { documents: Document[] }) {
  const stats = getDashboardStats(documents);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <StatCard label="Total documents" value={stats.totalDocuments} />
      <StatCard label="Uploaded" value={stats.uploaded} />
      <StatCard label="Needs review" value={stats.needsReview} />
      <StatCard label="Validated" value={stats.validated} />
      <StatCard label="Rejected" value={stats.rejected} />
      <StatCard label="Open issues" value={stats.issueCount} />
    </div>
  );
}

function getDashboardStats(documents: Document[]): DashboardStatsSummary {
  return documents.reduce(
    (stats, document) => {
      if (document.status === 'UPLOADED') {
        stats.uploaded += 1;
      }

      if (document.status === 'NEEDS_REVIEW') {
        stats.needsReview += 1;
      }

      if (document.status === 'VALIDATED') {
        stats.validated += 1;
      }

      if (document.status === 'REJECTED') {
        stats.rejected += 1;
      }

      stats.issueCount += document.validationIssues.filter((issue) => !issue.resolved).length;
      return stats;
    },
    {
      totalDocuments: documents.length,
      uploaded: 0,
      needsReview: 0,
      validated: 0,
      rejected: 0,
      issueCount: 0,
    },
  );
}
