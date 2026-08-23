export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown;

  constructor(statusCode: number, message: string, errors: unknown = null) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;

    Error.captureStackTrace?.(this, this.constructor);
  }
}
