import type { Document } from '../../types/document';
import { formatCurrency } from '../../utils/formatCurrency';
import Card from '../common/Card';

export default function CurrencyTotals({ documents }: { documents: Document[] }) {
  const entries = getCurrencyTotals(documents);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-950">Totals by currency</h2>
      <div className="mt-4 space-y-3">
        {entries.length > 0 ? (
          entries.map(([currency, total]) => (
            <div
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
              key={currency}
            >
              <span className="text-sm font-medium text-slate-600">{currency}</span>
              <span className="font-semibold text-slate-950">{formatCurrency(total, currency)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No totals available yet.</p>
        )}
      </div>
    </Card>
  );
}

function getCurrencyTotals(documents: Document[]): Array<[string, number]> {
  const totals = documents.reduce<Record<string, number>>((acc, document) => {
    if (document.currency && document.total && document.status !== 'REJECTED') {
      acc[document.currency] = (acc[document.currency] ?? 0) + document.total;
    }
    return acc;
  }, {});

  return Object.entries(totals);
}
