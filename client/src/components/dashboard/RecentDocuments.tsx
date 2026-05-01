import { Link } from 'react-router-dom';

import type { Document } from '../../types/document';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';

export default function RecentDocuments({ documents }: { documents: Document[] }) {
  const recentDocuments = [...documents]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 5);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-950">Recent documents</h2>
        <Link className="text-sm font-semibold text-slate-700 hover:text-slate-950" to="/documents">
          View all
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentDocuments.map((document) => (
              <tr className="bg-white hover:bg-slate-50" key={document.id}>
                <td className="px-4 py-4">
                  <Link className="font-semibold text-slate-950 hover:underline" to={`/documents/${document.id}`}>
                    {document.documentNumber ?? 'Missing number'}
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-600">{document.supplierName ?? '-'}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={document.status} />
                </td>
                <td className="px-4 py-4 text-right font-medium text-slate-700">
                  {formatCurrency(document.total, document.currency)}
                </td>
                <td className="px-4 py-4 text-slate-600">{formatDate(document.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </Card>
  );
}
