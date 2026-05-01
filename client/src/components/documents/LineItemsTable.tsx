import type { ChangeEvent } from 'react';

import type { LineItem } from '../../types/document';
import Button from '../common/Button';
import Card from '../common/Card';

interface LineItemsTableProps {
  isReadOnly?: boolean;
  lineItems: LineItem[];
  onLineItemsChange: (lineItems: LineItem[]) => void;
}

export default function LineItemsTable({
  isReadOnly = false,
  lineItems,
  onLineItemsChange,
}: LineItemsTableProps) {
  function addLineItem() {
    onLineItemsChange([
      ...lineItems,
      {
        id: `line-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  }

  function removeLineItem(id: string) {
    onLineItemsChange(lineItems.filter((lineItem) => lineItem.id !== id));
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number | null) {
    onLineItemsChange(
      lineItems.map((lineItem) =>
        lineItem.id === id
          ? {
              ...lineItem,
              [field]: value,
            }
          : lineItem,
      ),
    );
  }

  function handleNumberChange(
    id: string,
    field: keyof LineItem,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    updateLineItem(id, field, event.target.value === '' ? null : Number(event.target.value));
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Line items</h2>
        {!isReadOnly ? (
          <Button onClick={addLineItem} type="button" variant="secondary">
            Add line item
          </Button>
        ) : null}
      </div>

      {lineItems.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-800">No line items extracted yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Add at least one line item so the document can be validated.
          </p>
          {!isReadOnly ? (
            <Button className="mt-4" onClick={addLineItem} type="button">
              Add line item
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-3 text-sm text-slate-500">
            Line total is calculated before tax. Tax is validated at the document level.
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Quantity</th>
                  <th className="px-3 py-3">Unit price</th>
                  <th className="px-3 py-3">Line total</th>
                  {!isReadOnly ? <th className="px-3 py-3 text-right">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((lineItem) => (
                  <tr key={lineItem.id}>
                    <td className="px-3 py-3">
                      <input
                        className="h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        disabled={isReadOnly}
                        value={lineItem.description}
                        onChange={(event) =>
                          updateLineItem(lineItem.id, 'description', event.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        disabled={isReadOnly}
                        type="number"
                        value={lineItem.quantity}
                        onChange={(event) => handleNumberChange(lineItem.id, 'quantity', event)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        disabled={isReadOnly}
                        type="number"
                        value={lineItem.unitPrice}
                        onChange={(event) => handleNumberChange(lineItem.id, 'unitPrice', event)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        disabled={isReadOnly}
                        type="number"
                        value={lineItem.lineTotal}
                        onChange={(event) => handleNumberChange(lineItem.id, 'lineTotal', event)}
                      />
                    </td>
                    {!isReadOnly ? (
                      <td className="px-3 py-3 text-right">
                        <Button
                          onClick={() => removeLineItem(lineItem.id)}
                          type="button"
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
