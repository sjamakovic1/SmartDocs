import { parseCsvDocument } from '../parsers/csvParser';
import { parseTxtDocument } from '../parsers/txtParser';
import { validateDocument } from '../validation/documentValidation';

const txtExamples = [
  `Invoice TXT-0
Total: 758 EUR`,
  `Invoice TXT-1
Total: 406 EUR`,
  `Invoice TXT-2
Total: 999 BAM`,
];

const csvExamples = [
  `desc,qty,price,total
Item,1,78,78
Item,2,84,168`,
  `desc,qty,price,total
Item,1,22,22
Item,1,23,23`,
  `desc,qty,price,total
Item,3,87,261
Item,3,55,165`,
];

txtExamples.forEach((example, index) => {
  const document = parseTxtDocument(example, `text_${index + 1}.txt`);
  printResult(`TXT example ${index + 1}`, document);
});

csvExamples.forEach((example, index) => {
  const document = parseCsvDocument(example, `data_${index + 1}.csv`);
  printResult(`CSV example ${index + 1}`, document);
});

function printResult(label: string, document: ReturnType<typeof parseTxtDocument>) {
  const issues = validateDocument(document);

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(document, null, 2));
  console.log('Validation issues:');
  issues.forEach((issue) => {
    console.log(`- ${issue.code}: ${issue.message}`);
  });
}
