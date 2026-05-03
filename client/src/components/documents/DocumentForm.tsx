import type { ChangeEvent } from 'react';

import type { Document, DocumentType } from '../../types/document';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';

interface DocumentFormProps {
  document: Document;
  isReadOnly?: boolean;
  onDocumentChange: (document: Document) => void;
}

const SUPPORTED_CURRENCIES = ['EUR', 'BAM', 'USD', 'GBP', 'AED'];

export default function DocumentForm({
  document,
  isReadOnly = false,
  onDocumentChange,
}: DocumentFormProps) {
  function updateField(field: keyof Document, value: string | number | null): void {
    onDocumentChange({
      ...document,
      [field]: value,
    });
  }

  function handleNumberChange(field: keyof Document, event: ChangeEvent<HTMLInputElement>): void {
    updateField(field, event.target.value === '' ? null : Number(event.target.value));
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-950">Extracted fields</h2>
      {!isReadOnly ? (
        <p className="mt-1 text-sm text-slate-500">
          Saving changes automatically re-runs validation.
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Select
          label="Document type"
          disabled={isReadOnly}
          value={document.documentType}
          onChange={(event) => updateField('documentType', event.target.value as DocumentType)}
        >
          <option value="INVOICE">Invoice</option>
          <option value="PURCHASE_ORDER">Purchase Order</option>
          <option value="UNKNOWN">Unknown</option>
        </Select>
        <Input
          label="Document number"
          disabled={isReadOnly}
          value={document.documentNumber ?? ''}
          onChange={(event) => updateField('documentNumber', event.target.value || null)}
        />
        <Input
          label="Supplier/company"
          disabled={isReadOnly}
          value={document.supplierName ?? ''}
          onChange={(event) => updateField('supplierName', event.target.value || null)}
        />
        <Input
          label="Issue date"
          disabled={isReadOnly}
          type="date"
          value={document.issueDate ?? ''}
          onChange={(event) => updateField('issueDate', event.target.value || null)}
        />
        <Input
          label="Due date"
          disabled={isReadOnly}
          type="date"
          value={document.dueDate ?? ''}
          onChange={(event) => updateField('dueDate', event.target.value || null)}
        />
        <Select
          label="Currency"
          disabled={isReadOnly}
          value={document.currency ?? ''}
          onChange={(event) => updateField('currency', event.target.value || null)}
        >
          <option value="">Select currency</option>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </Select>
        <Input
          label="Subtotal"
          disabled={isReadOnly}
          type="number"
          value={document.subtotal ?? ''}
          onChange={(event) => handleNumberChange('subtotal', event)}
        />
        <Input
          label="Tax rate %"
          disabled={isReadOnly}
          type="number"
          value={document.taxRate ?? ''}
          onChange={(event) => handleNumberChange('taxRate', event)}
        />
        <Input
          label="Tax amount"
          disabled={isReadOnly}
          type="number"
          value={document.tax ?? ''}
          onChange={(event) => handleNumberChange('tax', event)}
        />
        <Input
          label="Total"
          disabled={isReadOnly}
          type="number"
          value={document.total ?? ''}
          onChange={(event) => handleNumberChange('total', event)}
        />
      </div>
    </Card>
  );
}
