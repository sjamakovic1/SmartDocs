const supportedExtensions = ['.pdf', '.csv', '.txt', '.png', '.jpg', '.jpeg'];

const supportedMimeTypes = [
  'application/pdf',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
];

export const uploadAccept = [...supportedExtensions, ...supportedMimeTypes].join(',');

export function isSupportedUploadFile(file: File) {
  const extension = getFileExtension(file.name);
  return supportedExtensions.includes(extension) || supportedMimeTypes.includes(file.type);
}

export function getSupportedFormatsLabel() {
  return 'PDF, PNG, JPG, JPEG, CSV, TXT';
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}
