import multer from 'multer';
import { ApiError } from '../utils/api-error.js';
import type { Request } from 'express';

const storage = multer.memoryStorage();
const ALLOWED_MIME_TYPE = ['image/jpeg', 'image/png', 'image/webp'];

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!ALLOWED_MIME_TYPE.includes(file.mimetype)) {
    cb(
      new ApiError(
        400,
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      ),
    );
    return;
  }

  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 512 * 1024, // 512 KB
  },
});
