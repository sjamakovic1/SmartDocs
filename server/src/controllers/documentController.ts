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
  StorageSignedUrlError,
  StorageUploadError,
  UnsupportedFileTypeError,
  updateStoredDocument,
  uploadAndParseDocument,
  validateStoredDocument,
} from '../services/documentService';

export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded.',
      });
    }

    const document = await uploadAndParseDocument(req.file);

    return res.status(201).json({
      document,
    });
  } catch (error) {
    if (error instanceof UnsupportedFileTypeError) {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error instanceof StorageUploadError) {
      return res.status(500).json({
        message: error.message,
      });
    }

    if (error instanceof DocumentSaveError) {
      return res.status(500).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Failed to parse uploaded document.',
    });
  }
}

export async function listDocuments(_req: Request, res: Response) {
  return res.json({
    documents: await getDocuments(),
  });
}

export async function getDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  const document = await getDocumentById(id);

  if (!document) {
    return res.status(404).json({
      message: 'Document not found.',
    });
  }

  return res.json({
    document,
  });
}

export async function getDocumentFileUrl(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  try {
    const signedUrl = await createOriginalFileSignedUrl(id);

    if (!signedUrl) {
      return res.status(404).json({
        message: 'Original file not found.',
      });
    }

    return res.json(signedUrl);
  } catch (error) {
    if (error instanceof StorageSignedUrlError) {
      return res.status(500).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Failed to create original file URL.',
    });
  }
}

export async function removeDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  const wasDeleted = await deleteDocument(id);

  if (!wasDeleted) {
    return res.status(404).json({
      message: 'Document not found.',
    });
  }

  return res.json({
    success: true,
  });
}

export async function validateDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  const document = await validateStoredDocument(id);

  if (!document) {
    return res.status(404).json({
      message: 'Document not found.',
    });
  }

  return res.json({
    document,
  });
}

export async function updateDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  try {
    const document = await updateStoredDocument(id, req.body);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    return res.json({
      document,
    });
  } catch (error) {
    if (error instanceof RejectedDocumentUpdateError) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Failed to update document.',
    });
  }
}

export async function confirmDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  try {
    const document = await confirmStoredDocument(id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    return res.json({
      document,
    });
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return res.status(400).json({
        message: error.message,
        document: error.document,
        validationIssues: error.document.validationIssues,
      });
    }

    if (error instanceof RejectedDocumentUpdateError) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Failed to confirm document.',
    });
  }
}

export async function rejectDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  const rejectReason = typeof req.body?.rejectReason === 'string' ? req.body.rejectReason.trim() : '';
  if (!rejectReason) {
    return res.status(400).json({
      message: 'Reject reason is required.',
    });
  }

  const document = await rejectStoredDocument(id, rejectReason);

  if (!document) {
    return res.status(404).json({
      message: 'Document not found.',
    });
  }

  return res.json({
    document,
  });
}

export async function reopenDocument(req: Request, res: Response) {
  const id = getParam(req, 'id');
  if (!id) {
    return res.status(400).json({
      message: 'Document id is required.',
    });
  }

  const document = await reopenStoredDocument(id);

  if (!document) {
    return res.status(404).json({
      message: 'Document not found.',
    });
  }

  return res.json({
    document,
  });
}

function getParam(req: Request, name: string) {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}
