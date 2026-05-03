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
      <div className="divide-y divide-slate-100 md:hidden">
        {documents.map((document) => (
          <DocumentMobileCard
            document={document}
            key={document.id}
            onDeleteDocument={onDeleteDocument}
          />
        ))}
        {documents.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            No documents match the current filters.
          </div>
        ) : null}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
              <DocumentTableRow
                document={document}
                key={document.id}
                onDeleteDocument={onDeleteDocument}
              />
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

function getOpenIssueCount(document: Document): number {
  return document.validationIssues.filter((issue) => !issue.resolved).length;
}

function DocumentActions({
  document,
  onDeleteDocument,
}: {
  document: Document;
  onDeleteDocument: (document: Document) => void;
}) {
  return (
    <>
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
    </>
  );
}

function DocumentMobileCard({
  document,
  onDeleteDocument,
}: {
  document: Document;
  onDeleteDocument: (document: Document) => void;
}) {
  return (
    <div className="space-y-3 bg-white p-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">
            {document.documentNumber ?? 'Missing'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDocumentType(document.documentType)}
          </p>
        </div>
        <StatusBadge status={document.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="font-medium text-slate-500">Supplier</p>
          <p className="mt-1 break-words text-slate-800">{document.supplierName ?? '-'}</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">Total</p>
          <p className="mt-1 font-semibold text-slate-800">
            {formatCurrency(document.total, document.currency)}
          </p>
        </div>
        <div>
          <p className="font-medium text-slate-500">Issues</p>
          <p className="mt-1 text-slate-800">{getOpenIssueCount(document)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-500">Created</p>
          <p className="mt-1 text-slate-800">{formatDate(document.createdAt)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link className="w-full sm:w-auto" to={`/documents/${document.id}`}>
          <Button className="w-full sm:w-auto" variant="secondary">
            Review
          </Button>
        </Link>
        <Button
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
          onClick={() => onDeleteDocument(document)}
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function DocumentTableRow({
  document,
  onDeleteDocument,
}: {
  document: Document;
  onDeleteDocument: (document: Document) => void;
}) {
  return (
    <tr className="bg-white hover:bg-slate-50">
      <td className="px-5 py-4 font-semibold text-slate-950">
        {document.documentNumber ?? 'Missing'}
      </td>
      <td className="px-5 py-4 text-slate-600">{formatDocumentType(document.documentType)}</td>
      <td className="px-5 py-4 text-slate-600">{document.supplierName ?? '-'}</td>
      <td className="px-5 py-4">
        <StatusBadge status={document.status} />
      </td>
      <td className="px-5 py-4 text-right font-medium text-slate-700">
        {formatCurrency(document.total, document.currency)}
      </td>
      <td className="px-5 py-4 text-slate-600">{document.currency ?? '-'}</td>
      <td className="px-5 py-4 text-center text-slate-600">{getOpenIssueCount(document)}</td>
      <td className="px-5 py-4 text-slate-600">{formatDate(document.createdAt)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <DocumentActions document={document} onDeleteDocument={onDeleteDocument} />
        </div>
      </td>
    </tr>
  );
}
