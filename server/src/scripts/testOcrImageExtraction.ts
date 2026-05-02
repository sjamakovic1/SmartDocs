import { normalizeOcrText } from '../extraction/normalizeOcrText';
import { parseImageOcrText } from '../parsers/imageParser';

const samples = [
  {
    name: 'A simple EUR total',
    text: `Invoice 3205
Supplier Img 5
Total: 439 EUR`,
  },
  {
    name: 'B Tolat BAM',
    text: `Invoice 3724
Supplier Img 0
Tolat 1123 BAM`,
  },
  {
    name: 'C glued USD',
    text: `Invoice 3293
Supplier Img 1
Total 514USD`,
  },
  {
    name: 'D Totat BAM',
    text: `Invoice 3490
Supplier Img 2
Totat 1634 BAM`,
  },
  {
    name: 'E corrected EAM',
    text: `Invoice 3561
Supplier Img3
Tolat 502 EAM`,
  },
  {
    name: 'F Tot EUR',
    text: `Invoice 3872
Supplier Img 4
Tot 1062 EUR`,
  },
  {
    name: 'GBP VAT table',
    text: `Description Quantity Unit Price VAT Amount
Small coffee 2 each 2.00 20% 4.00
Magazine 1 each 5.00 0% 5.00
Children's car seat 1 each 60.00 5% 60.00
Ice cream 2 each 2.00 20% 4.00
Subtotal without VAT 73.00
VAT 0% of 5.00 0.00
VAT 20% of 8.00 1.60
VAT 5% of 60.00 3.00
Total GBP 77.60`,
  },
  {
    name: 'Generated invoice table',
    text: `Invoice Number INV-10
Description Qty Unit Price Total
Service A 5 71 355
Grand Total $355`,
  },
  {
    name: 'Real invoice line',
    text: `Tax Invoice
Invoice No 88
1.00 Web Design $85.00 0.00% $85.00
Total Due $85.00`,
  },
  {
    name: 'Purple invoice style',
    text: `Invoice # P-77
Product Name Here $450 2 $900
GRAND TOTAL $900`,
  },
  {
    name: 'AED tax invoice style',
    text: `Tax Invoice
Invoice Number AED-1
Description Qty Unit Amount (AED) VAT Amount (AED)
Keyboards 2 nos 100 nos 200
Total 200`,
  },
  {
    name: 'French facture',
    text: `FACTURE PROFORMA
Facture 2026-01
Date de Facturation 01/04/2026
Date d'échéance 15/04/2026
Description Qté Prix unitaire Prix HT TVA Prix TTC
Service conseil 1 100.00 100.00 20% 120.00
Total H.T. 100.00
Total T.V.A. 20.00
Prix TTC 120.00 EUR`,
  },
  {
    name: 'Non-document dashboard',
    text: `Dashboard Customers Users Billing Monitoring Reporting
Company Details
CRS API Configuration
Portal Access
Add Host
Edit Details`,
  },
  {
    name: 'Multiple document collage',
    text: `Invoice Number A-1
Invoice Date 01/01/2026
Total 10 EUR
Tax Invoice
Invoice No B-2
Invoice Date 02/01/2026
Total 20 EUR`,
  },
];

for (const sample of samples) {
  const normalized = normalizeOcrText(sample.text);
  const document = parseImageOcrText(sample.text, `${sample.name}.txt`);

  console.log(`\n=== ${sample.name} ===`);
  console.log('Normalized text:');
  console.log(normalized.normalizedText);
  console.log('Extracted fields:');
  console.log(JSON.stringify({
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    supplierName: document.supplierName,
    issueDate: document.issueDate,
    dueDate: document.dueDate,
    currency: document.currency,
    subtotal: document.subtotal,
    taxRate: document.taxRate,
    tax: document.tax,
    total: document.total,
    lineItems: document.lineItems,
    issues: document.validationIssues?.map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      message: issue.message,
      actualValue: issue.actualValue,
      expectedValue: issue.expectedValue,
    })),
  }, null, 2));
}
