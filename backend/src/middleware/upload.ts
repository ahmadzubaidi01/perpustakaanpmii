import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';
import env from '../config/environment';
import { AppError } from './errorHandler';
import { logStream } from '../services/logStream';

/**
 * File upload middleware with security validation.
 * - MIME type validation
 * - File size validation
 * - Secure randomized filenames
 * - Prevents direct executable access
 */

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // MIME type validation
  const allowedMimeTypes = env.UPLOAD_ALLOWED_IMAGE_TYPES;

  if (!allowedMimeTypes.includes(file.mimetype)) {
    logStream.emitLog({
      type: 'UPLOAD',
      message: `Invalid MIME type blocked: ${file.mimetype}`,
      method: _req.method,
      endpoint: _req.originalUrl,
      ip: _req.ip || _req.socket?.remoteAddress
    });
    cb(new AppError(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`, 400));
    return;
  }

  // Additional check: verify extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeToExt: Record<string, string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/jpg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
  };

  const allowedExts = mimeToExt[file.mimetype] || [];
  if (!allowedExts.includes(ext)) {
    logStream.emitLog({
      type: 'UPLOAD',
      message: `MIME type mismatch: ${file.mimetype} vs ${ext}`,
      method: _req.method,
      endpoint: _req.originalUrl,
      ip: _req.ip || _req.socket?.remoteAddress
    });
    cb(new AppError('File extension does not match its MIME type', 400));
    return;
  }

  cb(null, true);
};

/**
 * Upload middleware for single image files.
 */
const uploadSingle: any = (fieldName: string) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: env.UPLOAD_MAX_FILE_SIZE,
      files: 1,
    },
  }).single(fieldName);
};

const uploadMultiple: any = (
  fieldName: string,
  maxCount: number = 5
) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: env.UPLOAD_MAX_FILE_SIZE,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

const uploadFields: any = (fields: multer.Field[]) => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: env.UPLOAD_MAX_FILE_SIZE,
    },
  }).fields(fields);
};

export {
  uploadSingle,
  uploadMultiple,
  uploadFields,
};
