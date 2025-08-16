// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';
import { AppError as CoreAppError } from './errors';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  timestamp: Date;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(`Database error: ${message}`, 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(`Validation error: ${message}`, 400);
    this.name = 'ValidationError';
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(`API error: ${message}`, statusCode);
    this.name = 'APIError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string) {
    super(`Timeout error: ${message}`, 408);
    this.name = 'TimeoutError';
  }
}

// Global error handler middleware
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  logger.error('Global error handler caught:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle known AppError instances (both local and core errors)
  if (err instanceof AppError || err instanceof CoreAppError) {
    const statusCode = (err as any).statusCode || 500;
    return res.status(statusCode).json({
      error: true,
      message: err.message,
      timestamp: (err as any).timestamp || new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle specific database errors
  if (err.message?.includes('column') && err.message?.includes('does not exist')) {
    return res.status(500).json({
      error: true,
      message: 'Database schema error. Please contact support.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle API rate limiting
  if (err.message?.includes('rate limit') || err.message?.includes('quota')) {
    return res.status(429).json({
      error: true,
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60
    });
  }

  // Handle timeout errors
  if (err.message?.includes('timeout') || err.name === 'TimeoutError') {
    return res.status(408).json({
      error: true,
      message: 'Request timeout. Please try again.',
    });
  }

  // Default error response
  res.status(500).json({
    error: true,
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      originalError: err.message,
      stack: err.stack 
    })
  });
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation helper
export function validateRequired(fields: Record<string, any>, requiredFields: string[]) {
  const missing = requiredFields.filter(field => !fields[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

// Database operation wrapper with retry logic
export async function withDatabaseFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.warn(`Database operation '${operationName}' failed, using fallback:`, error);
    return await fallback();
  }
}

// API call wrapper with timeout and retry
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new TimeoutError(errorMessage)), timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}