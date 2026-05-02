import { useEffect, useMemo, useState } from 'react';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import DocumentFilters from '../components/documents/DocumentFilters';
import DocumentTable from '../components/documents/DocumentTable';
import { getApiErrorMessage } from '../services/api';
import { documentService } from '../services/documentService';
import type { Document, DocumentStatus } from '../types/document';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | DocumentStatus>('ALL');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorTitle, setErrorTitle] = useState('Failed to load documents.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function loadDocuments() {
    setIsLoading(true);
    setErrorTitle('Failed to load documents.');
    setErrorMessage(null);

    try {
      setDocuments(await documentService.getDocuments());
    } catch (error) {
      setErrorTitle('Failed to load documents.');
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

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

    setErrorMessage(null);

    try {
      await documentService.deleteDocument(documentToDelete.id);
      setDocumentToDelete(null);
      await loadDocuments();
    } catch (error) {
      setDocumentToDelete(null);
      setErrorTitle('Failed to delete document.');
      setErrorMessage(getApiErrorMessage(error));
    }
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
      {isLoading ? (
        <Card className="p-6">
          <p className="text-sm text-slate-500">Loading documents...</p>
        </Card>
      ) : errorMessage ? (
        <Card className="border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">{errorTitle}</p>
          <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          <Button className="mt-4" onClick={loadDocuments} variant="secondary">
            Try again
          </Button>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-slate-950">No documents uploaded yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF, CSV, or TXT document to start reviewing extracted data.
          </p>
        </Card>
      ) : (
        <DocumentTable documents={filteredDocuments} onDeleteDocument={setDocumentToDelete} />
      )}

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
