import { Link } from 'react-router-dom';

import type { Document } from '../../types/document';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { formatDocumentType } from '../../utils/formatDocumentType';
import Button from '../common/Button';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';

interface DocumentTableProps {
  documents: Document[];
  onDeleteDocument: (document: Document) => void;
}

export default function DocumentTable({ documents, onDeleteDocument }: DocumentTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Number</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Supplier</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5">Currency</th>
              <th className="px-5 py-3.5 text-center">Issues</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => (
              <tr key={document.id} className="bg-white hover:bg-slate-50">
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {document.documentNumber ?? 'Missing'}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {formatDocumentType(document.documentType)}
                </td>
                <td className="px-5 py-4 text-slate-600">{document.supplierName ?? '-'}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={document.status} />
                </td>
                <td className="px-5 py-4 text-right font-medium text-slate-700">
                  {formatCurrency(document.total, document.currency)}
                </td>
                <td className="px-5 py-4 text-slate-600">{document.currency ?? '-'}</td>
                <td className="px-5 py-4 text-center text-slate-600">
                  {document.validationIssues.filter((issue) => !issue.resolved).length}
                </td>
                <td className="px-5 py-4 text-slate-600">{formatDate(document.createdAt)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/documents/${document.id}`}>
                      <Button variant="secondary">Review</Button>
                    </Link>
                    <Button
                      className="px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onDeleteDocument(document)}
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 ? (
          <div className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">
            No documents match the current filters.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
