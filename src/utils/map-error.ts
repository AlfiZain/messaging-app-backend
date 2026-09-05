import { ApiError } from './api-error.js';
import { Prisma } from '../generated/prisma/client.js';
import multer from 'multer';

export function mapError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400 &&
    'body' in error
  ) {
    return jsonError();
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(400, 'File size must not exceed 512 KB');
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(error);
  }

  return new ApiError(500, 'Internal Server Error');
}

function jsonError() {
  return new ApiError(
    400,
    'Invalid request body. Please check your JSON syntax and Content-Type header.',
  );
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target ? `(${error.meta.target})` : '';

  switch (error.code) {
    case 'P2002': {
      return new ApiError(409, `Resource already exists ${target}`);
    }
    case 'P2025': {
      return new ApiError(404, 'Resource not found');
    }
    case 'P2006':
    case 'P2007': {
      return new ApiError(
        400,
        'Invalid input format or invalid UUID parameter',
      );
    }
    default: {
      return new ApiError(500, 'Database error');
    }
  }
}
