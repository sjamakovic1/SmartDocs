import { useEffect, useState } from 'react';

import CurrencyTotals from '../components/dashboard/CurrencyTotals';
import DashboardStats from '../components/dashboard/DashboardStats';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import { documentService } from '../services/documentService';
import type { Document } from '../types/document';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    void documentService.getDocuments().then(setDocuments);
  }, []);

  return (
    <div className="space-y-6">
      <DashboardStats documents={documents} />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <CurrencyTotals documents={documents} />
        <RecentDocuments documents={documents} />
      </div>
    </div>
  );
}
