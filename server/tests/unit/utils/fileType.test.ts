import { describe, expect, it } from 'vitest';

import { detectSupportedUploadFileType } from '../../../src/utils/fileType';

describe('detectSupportedUploadFileType', () => {
  it.each([
    ['invoice.pdf', 'application/pdf', 'PDF'],
    ['items.csv', 'text/csv', 'CSV'],
    ['notes.txt', 'text/plain', 'TXT'],
    ['scan.png', 'image/png', 'IMAGE'],
    ['scan.jpg', 'image/jpeg', 'IMAGE'],
    ['scan.jpeg', 'image/jpeg', 'IMAGE'],
  ] as const)('detects %s / %s', (fileName, mimeType, expected) => {
    expect(detectSupportedUploadFileType(fileName, mimeType)).toBe(expected);
  });

  it('returns null for unsupported files', () => {
    expect(detectSupportedUploadFileType('archive.zip', 'application/zip')).toBeNull();
  });
});
