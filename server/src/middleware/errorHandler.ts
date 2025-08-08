import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = null;

  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // Handle MySQL errors
  else if (error.message.includes('ER_DUP_ENTRY')) {
    statusCode = 409;
    message = 'Duplicate entry. This record already exists.';
  }
  else if (error.message.includes('ER_NO_REFERENCED_ROW')) {
    statusCode = 400;
    message = 'Referenced record does not exist.';
  }
  else if (error.message.includes('ER_ROW_IS_REFERENCED')) {
    statusCode = 400;
    message = 'Cannot delete this record as it is referenced by other records.';
  }
  // Handle JWT errors
  else if (error.message.includes('jwt')) {
    statusCode = 401;
    message = 'Invalid or expired token.';
  }
  // Handle validation errors
  else if (error.message.includes('validation')) {
    statusCode = 400;
    message = 'Validation error.';
    details = error.message;
  }
  // Handle file upload errors
  else if (error.message.includes('LIMIT_FILE_SIZE')) {
    statusCode = 413;
    message = 'File too large.';
  }
  else if (error.message.includes('LIMIT_UNEXPECTED_FILE')) {
    statusCode = 400;
    message = 'Unexpected file field.';
  }
  // Handle other known errors
  else if (error.message.includes('ENOENT')) {
    statusCode = 404;
    message = 'File not found.';
  }
  else if (error.message.includes('ECONNREFUSED')) {
    statusCode = 503;
    message = 'Database connection failed.';
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?.id
    });
    details = error.stack;
  }

  // Send error response
  const errorResponse: ApiError = {
    message,
    code: error.constructor.name,
    details: process.env.NODE_ENV === 'development' ? details : undefined
  };

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error helper
export const createValidationError = (field: string, message: string): AppError => {
  return new AppError(`Validation error: ${field} - ${message}`, 400);
};

// Not found error helper
export const createNotFoundError = (resource: string): AppError => {
  return new AppError(`${resource} not found`, 404);
};

// Unauthorized error helper
export const createUnauthorizedError = (message: string = 'Unauthorized'): AppError => {
  return new AppError(message, 401);
};

// Forbidden error helper
export const createForbiddenError = (message: string = 'Forbidden'): AppError => {
  return new AppError(message, 403);
};

// Conflict error helper
export const createConflictError = (message: string = 'Conflict'): AppError => {
  return new AppError(message, 409);
};
