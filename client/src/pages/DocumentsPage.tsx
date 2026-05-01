import { useEffect, useMemo, useState } from 'react';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import DocumentFilters from '../components/documents/DocumentFilters';
import DocumentTable from '../components/documents/DocumentTable';
import { documentService } from '../services/documentService';
import type { Document, DocumentStatus } from '../types/document';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | DocumentStatus>('ALL');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  useEffect(() => {
    void documentService.getDocuments().then(setDocuments);
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesStatus = status === 'ALL' || document.status === status;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (document.documentNumber ?? '').toLowerCase().includes(normalizedSearch) ||
        (document.supplierName ?? '').toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [documents, search, status]);

  async function confirmDeleteDocument() {
    if (!documentToDelete) {
      return;
    }

    await documentService.deleteDocument(documentToDelete.id);
    setDocumentToDelete(null);
    setDocuments(await documentService.getDocuments());
  }

  function getDeleteIdentifier(document: Document) {
    return document.documentNumber ?? document.fileName ?? 'Missing number';
  }

  return (
    <div className="space-y-6">
      <DocumentFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />
      <DocumentTable documents={filteredDocuments} onDeleteDocument={setDocumentToDelete} />

      {documentToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <Card className="w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-950">Delete document?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will remove the document from the current workspace. This action cannot be
              undone.
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-500">Document</p>
              <p className="mt-1 font-semibold text-slate-950">
                {getDeleteIdentifier(documentToDelete)}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setDocumentToDelete(null)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={confirmDeleteDocument} variant="danger">
                Delete document
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
