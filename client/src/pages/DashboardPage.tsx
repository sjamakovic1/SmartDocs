import { useEffect, useState } from 'react';

import CurrencyTotals from '../components/dashboard/CurrencyTotals';
import DashboardStats from '../components/dashboard/DashboardStats';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { getApiErrorMessage } from '../services/api';
import { documentService } from '../services/documentService';
import type { Document } from '../types/document';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function loadDocuments() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setDocuments(await documentService.getDocuments());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className="border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-800">Could not load dashboard data.</p>
        <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
        <Button className="mt-4" onClick={loadDocuments} variant="secondary">
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {documents.length === 0 ? (
        <Card className="p-6">
          <p className="font-semibold text-slate-950">No documents yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload a document to populate this dashboard.
          </p>
        </Card>
      ) : null}
      <DashboardStats documents={documents} />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <CurrencyTotals documents={documents} />
        <RecentDocuments documents={documents} />
      </div>
    </div>
  );
}
