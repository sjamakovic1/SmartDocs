import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parsePdfDocument } from '../src/parsers/pdfParser';
import { validateDocument } from '../src/validation/documentValidation';

const samplePath = process.argv[2];

if (!samplePath) {
  console.log('Usage: npx tsx src/scripts/testPdfParser.ts <path-to-pdf>');
  process.exit(0);
}

async function main() {
  const absolutePath = resolve(samplePath as string);
  const buffer = readFileSync(absolutePath);
  const pathParts = absolutePath.split(/[\\/]/);
  const fileName = pathParts[pathParts.length - 1];
  const document = await parsePdfDocument(buffer, fileName);
  const issues = validateDocument(document);

  console.log(JSON.stringify(document, null, 2));
  console.log('Validation issues:');
  issues.forEach((issue) => {
    console.log(`- ${issue.code}: ${issue.message}`);
  });
}

void main();
