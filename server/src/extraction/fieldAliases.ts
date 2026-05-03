export const fieldAliases = {
  documentNumber: [
    'Invoice Number',
    'Invoice No',
    'Invoice #',
    'Number',
    'Document Number',
    'PO Number',
    'Purchase Order Number',
    'Order Number',
  ],
  issueDate: ['Invoice Date', 'Issue Date', 'Date', 'Document Date', 'Date de Facturation'],
  dueDate: ["Date d'échéance", "d'échéance", 'Date d echeance', 'Echeance', 'Due Date', 'Payment Due', 'Due'],
  supplierName: ['Supplier', 'Vendor', 'Company', 'From'],
  subtotal: ['Subtotal without VAT', 'Subtotal', 'Sub Total', 'Total H.T.', 'Total HT', 'Prix HT', 'Base HT'],
  tax: [
    'VAT Amount',
    'Total VAT',
    'Total Tax',
    'Total T.V.A.',
    'Montant T.V.A.',
    'Tax due',
    'Tax',
    'VAT',
    'TVA',
  ],
  total: ['Total Due', 'Grand Total', 'Amount Due', 'Balance Due', 'Prix TTC', 'Total TTC', 'Total'],
} as const;

export function aliasPattern(aliases: readonly string[]): string {
  return aliases.map(escapeRegExp).join('|');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}
