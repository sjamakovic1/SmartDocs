import multer from 'multer';

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
  },
});