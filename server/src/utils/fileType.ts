export type SupportedUploadFileType = 'TXT' | 'CSV' | 'PDF' | 'IMAGE';

const supportedFileTypesByExtension: Record<string, SupportedUploadFileType> = {
  '.txt': 'TXT',
  '.csv': 'CSV',
  '.pdf': 'PDF',
  '.png': 'IMAGE',
  '.jpg': 'IMAGE',
  '.jpeg': 'IMAGE',
};

const supportedFileTypesByMimeType: Record<string, SupportedUploadFileType> = {
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/csv': 'CSV',
  'application/vnd.ms-excel': 'CSV',
  'application/pdf': 'PDF',
  'image/png': 'IMAGE',
  'image/jpeg': 'IMAGE',
};

export function detectSupportedUploadFileType(
  originalName: string,
  mimeType: string,
): SupportedUploadFileType | null {
  const extension = getFileExtension(originalName);
  return supportedFileTypesByExtension[extension] ?? supportedFileTypesByMimeType[mimeType] ?? null;
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}
