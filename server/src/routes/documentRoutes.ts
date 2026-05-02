import { Router } from 'express';

import {
  confirmDocument,
  getDocument,
  getDocumentFileUrl,
  listDocuments,
  rejectDocument,
  removeDocument,
  reopenDocument,
  updateDocument,
  uploadDocument,
  validateDocument,
} from '../controllers/documentController';
import { upload } from '../config/multer';

const documentRouter = Router();

documentRouter.get('/', listDocuments);
documentRouter.post('/upload', upload.single('file'), uploadDocument);
documentRouter.get('/:id/file-url', getDocumentFileUrl);
documentRouter.get('/:id', getDocument);
documentRouter.put('/:id', updateDocument);
documentRouter.delete('/:id', removeDocument);
documentRouter.post('/:id/validate', validateDocument);
documentRouter.post('/:id/confirm', confirmDocument);
documentRouter.post('/:id/reject', rejectDocument);
documentRouter.post('/:id/reopen', reopenDocument);

export default documentRouter;
