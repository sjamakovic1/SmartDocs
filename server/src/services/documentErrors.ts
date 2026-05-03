import type { StoredDocument } from './documentService';

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class RejectedDocumentUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RejectedDocumentUpdateError';
  }
}

export class DocumentValidationError extends Error {
  constructor(
    message: string,
    public document: StoredDocument,
  ) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}

export class StorageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUploadError';
  }
}

export class StorageSignedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageSignedUrlError';
  }
}

export class DocumentSaveError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'DocumentSaveError';
  }
}
