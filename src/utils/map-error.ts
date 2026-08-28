import { ApiError } from './api-error.js';
import { Prisma } from '../generated/prisma/client.js';

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
    default: {
      return new ApiError(500, 'Database error');
    }
  }
}
