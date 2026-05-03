import { extractCommonFields } from '../src/extraction/extractCommonFields';
import { parsePdfText } from '../src/parsers/pdfParser';
import { validateDocument } from '../src/validation/documentValidation';

const generatedPdfText = `Invoice
Supplier: Company 5
Number: INV-1005
Date: 2026-04-28
Description Qty Unit Price Total
Service A 5 71 355
Subtotal 355
Tax (17%) 60.35
Total 415.35`;

const realWorldInvoiceText = `Invoice
Payment is due within 30 days from date of invoice. Late payment is subject to fees of 5% per month.
Thanks for choosing DEMO - Sliced Invoices | admin@slicedinvoices.com
Page 1/1
From:
DEMO - Sliced Invoices
Suite 5A-1204
123 Somewhere Street
Your City AZ 12345
admin@slicedinvoices.com
Invoice Number INV-3337
Order Number 12345
Invoice Date January 25, 2016
Due Date January 31, 2016
Total Due $93.50
To:
Test Business
123 Somewhere St
Melbourne, VIC 3000
test@test.com
Hrs/Qty Service Rate/Price Adjust Sub Total
1.00 Web Design
This is a sample description... $85.00 0.00% $85.00
Sub Total $85.00
Tax $8.50
Total $93.50
ANZ Bank
ACC # 1234 1234
BSB # 4321 432
Paid`;

const ocrTableText = `Description Quantity Unit Price VAT Amount
Small coffee 2 each 2.00 20% 4.00
Magazine 1 each 5.00 0% 5.00
Children's car seat 1 each 60.00 5% 60.00
Ice cream 2 each 2.00 20% 4.00
Subtotal without VAT 73.00
VAT 0% of 5.00 0.00
VAT 20% of 8.00 1.60
VAT 5% of 60.00 3.00
Total GBP 77.60`;

const invalidInvoiceText = `Invoice
Supplier: Company 1
Number: INV-1000
Date: 2026-04-28
Due Date: 2026-05-28
Description Qty Unit Price Total
Service A 1 100 100
Subtotal 100
Tax (10%) 10
Total 999`;

const templateInvoiceText = `[Company Name]
[Company Slogan]
DATE: 5/13/2011
[Stress Address] INVOICE # [123456]
[City, ST ZIP] Customer ID [123]
Phone: [000-000-0000]
Fax: [000-000-0000]
[Name Here]
[Company Name]
[Stress Address]
[City, ST ZIP]
[Phone]
[Service Fee] 230.00
[Labor: 5 hours at $75/hr] 375.00
[Parts] X 345.00
Subtotal $ 950.00
Taxable $ 345.00
Tax rate 6.250%
1. Total payment due in 30 days Tax due $ 21.56
2. Please include the invoice number on your check Other
TOTAL Due $ 971.56
Make all checks payable to
[Your Company Name]
If you have any questions about this invoice, please contact
[Name, Phone #, E-mail]
Thank You For Your Business!
Free Invoice Template`;

printExtraction('Generated PDF text', generatedPdfText);
printExtraction('Real-world invoice text', realWorldInvoiceText);
printExtraction('Template invoice text', templateInvoiceText);
printExtraction('OCR table text', ocrTableText);
printValidation('Invalid invoice still mismatches', invalidInvoiceText);

function printExtraction(label: string, rawText: string) {
  const extracted = extractCommonFields(rawText);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(extracted, null, 2));
}

function printValidation(label: string, rawText: string) {
  const document = parsePdfText(rawText, `${label}.pdf`);
  const issues = validateDocument(document);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify({
    total: document.total,
    subtotal: document.subtotal,
    tax: document.tax,
    issueCodes: issues.map((issue) => issue.code),
    hasTotalMismatch: issues.some((issue) => issue.code === 'TOTAL_MISMATCH'),
  }, null, 2));
}
