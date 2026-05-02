import type { ValidationIssue } from '../types/document';

const currencyCorrections: Record<string, string> = {
  EAM: 'BAM',
  '8AM': 'BAM',
  B4M: 'BAM',
  EUF: 'EUR',
  EIJR: 'EUR',
  USO: 'USD',
  G8P: 'GBP',
};

export interface NormalizedOcrText {
  normalizedText: string;
  warnings: ValidationIssue[];
}

export function normalizeOcrText(rawText: string): NormalizedOcrText {
  const warnings: ValidationIssue[] = [];
  let normalizedText = rawText
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  normalizedText = normalizedText
    .replace(/\btola[tt1I!]\b/gi, 'total')
    .replace(/\btotat\b/gi, 'total')
    .replace(/\btota[1I!]\b/gi, 'total')
    .replace(/\bsupp[I1]ier\b/gi, 'supplier')
    .replace(/\binvo[1l]ce\b/gi, 'invoice')
    .replace(/\binv0ice\b/gi, 'invoice')
    .replace(/\bsub\s+tota[1I]\b/gi, 'subtotal')
    .replace(/\b([0-9][\d,.]*)\s*(EUR|BAM|USD|GBP|AED|EAM|8AM|B4M|EUF|EIJR|USO|G8P)\b/gi, '$1 $2');

  normalizedText = normalizedText.replace(/\b(EAM|8AM|B4M|EUF|EIJR|USO|G8P)\b/g, (token) => {
    const corrected = currencyCorrections[token.toUpperCase()];
    if (!corrected) {
      return token;
    }

    addCurrencyCorrectionWarning(warnings, token, corrected);
    return corrected;
  });

  return {
    normalizedText: normalizedText.trim(),
    warnings,
  };
}

function addCurrencyCorrectionWarning(
  warnings: ValidationIssue[],
  originalValue: string,
  correctedValue: string,
) {
  const exists = warnings.some(
    (warning) =>
      warning.code === 'OCR_CURRENCY_CORRECTED' &&
      warning.actualValue === originalValue &&
      warning.expectedValue === correctedValue,
  );
  if (exists) {
    return;
  }

  warnings.push({
    field: 'currency',
    code: 'OCR_CURRENCY_CORRECTED',
    message: `Currency was corrected from OCR value '${originalValue}' to '${correctedValue}'. Please verify.`,
    severity: 'INFO',
    actualValue: originalValue,
    expectedValue: correctedValue,
  });
}
