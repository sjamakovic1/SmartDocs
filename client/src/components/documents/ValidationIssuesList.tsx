import type { ValidationIssue } from '../../types/document';
import Card from '../common/Card';
import SeverityBadge from '../common/SeverityBadge';

export default function ValidationIssuesList({ issues }: { issues: ValidationIssue[] }) {
  const openIssues = issues.filter((issue) => !issue.resolved);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">
        Validation issues ({openIssues.length})
      </h2>
      <div className="mt-4 space-y-3">
        {openIssues.length > 0 ? (
          openIssues.map((issue) => (
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" key={issue.id}>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={issue.severity} />
                <span className="text-sm font-semibold text-slate-700">{issue.field}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{issue.message}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No open validation issues.</p>
        )}
      </div>
    </Card>
  );
}
