const SUPPORTED_EXTENSIONS = ['.pdf', '.csv', '.txt', '.png', '.jpg', '.jpeg'];

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
];

export const uploadAccept = [...SUPPORTED_EXTENSIONS, ...SUPPORTED_MIME_TYPES].join(',');

export function isSupportedUploadFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  return SUPPORTED_EXTENSIONS.includes(extension) || SUPPORTED_MIME_TYPES.includes(file.type);
}

export function getSupportedFormatsLabel(): string {
  return 'PDF, CSV, TXT, PNG, JPG, JPEG';
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}
