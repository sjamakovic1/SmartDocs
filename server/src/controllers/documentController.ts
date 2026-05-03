import type { Request, Response } from 'express';

import {
  confirmStoredDocument,
  createOriginalFileSignedUrl,
  deleteDocument,
  DocumentSaveError,
  DocumentValidationError,
  getDocumentById,
  getDocuments,
  rejectStoredDocument,
  RejectedDocumentUpdateError,
  reopenStoredDocument,
  StorageUploadError,
  UnsupportedFileTypeError,
  updateStoredDocument,
  uploadAndParseDocument,
  validateStoredDocument,
} from '../services/documentService';
import { sendApiError } from '../utils/apiError';

export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return sendApiError(res, 400, 'UPLOAD_NO_FILE', 'No file uploaded.');
    }

    const document = await uploadAndParseDocument(req.file);

    return res.status(201).json({
      document,
    });
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError) {
      return sendApiError(res, 400, 'UPLOAD_UNSUPPORTED_TYPE', error.message);
    }

    if (error instanceof StorageUploadError) {
      return sendApiError(
        res,
        500,
        'FILE_STORAGE_UPLOAD_FAILED',
        'Failed to store original uploaded file.',
      );
    }

    if (error instanceof DocumentSaveError) {
      return sendApiError(res, 500, 'DOCUMENT_SAVE_FAILED', 'Failed to save document.');
    }

    return sendApiError(res, 500, 'DOCUMENT_PARSE_FAILED', 'Failed to parse uploaded document.');
  }
}

export async function listDocuments(_req: Request, res: Response) {
  return res.json({
    documents: await getDocuments(),
  });
}

export async function getDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  const document = await getDocumentById(id);

  if (!document) {
    return sendDocumentNotFound(res);
  }

  return res.json({
    document,
  });
}

export async function getDocumentFileUrl(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  try {
    const signedUrl = await createOriginalFileSignedUrl(id);

    if (!signedUrl) {
      return sendApiError(
        res,
        404,
        'ORIGINAL_FILE_NOT_FOUND',
        'Original file is not available for this document.',
      );
    }

    return res.json(signedUrl);
  } catch {
    return sendApiError(
      res,
      500,
      'SIGNED_URL_FAILED',
      'Failed to generate original file access link.',
    );
  }
}

export async function removeDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  const wasDeleted = await deleteDocument(id);

  if (!wasDeleted) {
    return sendDocumentNotFound(res);
  }

  return res.json({
    success: true,
  });
}

export async function validateDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  const document = await validateStoredDocument(id);

  if (!document) {
    return sendDocumentNotFound(res);
  }

  return res.json({
    document,
  });
}

export async function updateDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  try {
    const document = await updateStoredDocument(id, req.body);

    if (!document) {
      return sendDocumentNotFound(res);
    }

    return res.json({
      document,
    });
  } catch (error) {
    if (error instanceof RejectedDocumentUpdateError) {
      return sendApiError(
        res,
        400,
        'DOCUMENT_REJECTED_LOCKED',
        'Reopen the document before making changes.',
      );
    }

    return sendApiError(res, 500, 'DOCUMENT_UPDATE_FAILED', 'Failed to update document.');
  }
}

export async function confirmDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  try {
    const document = await confirmStoredDocument(id);

    if (!document) {
      return sendDocumentNotFound(res);
    }

    return res.json({
      document,
    });
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return res.status(400).json({
        error: {
          code: 'DOCUMENT_CONFIRM_BLOCKED',
          message: 'Document cannot be confirmed while validation errors remain.',
        },
        document: error.document,
        validationIssues: error.document.validationIssues,
      });
    }

    if (error instanceof RejectedDocumentUpdateError) {
      return sendApiError(
        res,
        400,
        'DOCUMENT_REJECTED_LOCKED',
        'Reopen the document before making changes.',
      );
    }

    return sendApiError(res, 500, 'DOCUMENT_CONFIRM_FAILED', 'Failed to confirm document.');
  }
}

export async function rejectDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  const rejectReason = getRejectReason(req);
  if (!rejectReason) {
    return sendApiError(res, 400, 'REJECT_REASON_REQUIRED', 'Rejection reason is required.');
  }

  const document = await rejectStoredDocument(id, rejectReason);

  if (!document) {
    return sendDocumentNotFound(res);
  }

  return res.json({
    document,
  });
}

export async function reopenDocument(req: Request, res: Response) {
  const id = getRequiredDocumentId(req, res);
  if (!id) {
    return;
  }

  const document = await reopenStoredDocument(id);

  if (!document) {
    return sendDocumentNotFound(res);
  }

  return res.json({
    document,
  });
}

function getParam(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function getRequiredDocumentId(req: Request, res: Response) {
  const id = getParam(req, 'id');

  if (!id) {
    sendApiError(res, 400, 'DOCUMENT_ID_REQUIRED', 'Document id is required.');
    return undefined;
  }

  return id;
}

function sendDocumentNotFound(res: Response) {
  return sendApiError(res, 404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
}

function getRejectReason(req: Request) {
  return typeof req.body?.rejectReason === 'string' ? req.body.rejectReason.trim() : '';
}
