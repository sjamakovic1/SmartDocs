import { parseImageOcrText } from '../parsers/imageParser';

const sampleOcrText = `
Description Quantity Unit Price VAT Amount
Small coffee 2 each 2.00 20% 4.00
Magazine 1 each 5.00 0% 5.00
Children's car seat 1 each 60.00 5% 60.00
Ice cream 2 each 2.00 20% 4.00
Subtotal without VAT 73.00
VAT 0% of 5.00 0.00
VAT 20% of 8.00 1.60
VAT 5% of 60.00 3.00
Total GBP 77.60
`;

const document = parseImageOcrText(sampleOcrText, 'sample-ocr-text.txt');

console.log(JSON.stringify({
  currency: document.currency,
  subtotal: document.subtotal,
  tax: document.tax,
  taxRate: document.taxRate,
  total: document.total,
  lineItems: document.lineItems,
}, null, 2));
