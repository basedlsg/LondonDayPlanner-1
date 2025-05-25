// server/lib/errors.ts

// Abstract base error class
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean; // To distinguish operational errors from programmer errors

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name; // Set error name to class name
    // Maintaining proper stack trace (only if V8 is available, common in Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// --- Business Logic / Client-Side Errors (4xx) ---

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(message = 'Access denied') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message);
  }
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(message = 'Too many requests. Please try again later.') {
    super(message);
  }
}

// --- External Service / Server-Side Operational Errors (5xx a_s_needed, usually 502, 503, 504) ---

export class NLPServiceError extends AppError {
  readonly statusCode = 502; // Bad Gateway, as we depend on an upstream service
  readonly isOperational = true;

  constructor(message = 'Natural language processing service error', cause?: Error) {
    super(message, cause);
  }
}

export class GooglePlacesError extends AppError {
  readonly statusCode = 502; // Bad Gateway
  readonly isOperational = true;

  constructor(message = 'Google Places service error', cause?: Error) {
    super(message, cause);
  }
}

export class WeatherServiceError extends AppError {
  readonly statusCode = 503; // Service Unavailable (if weather is optional but failing)
  readonly isOperational = true;

  constructor(message = 'Weather service error', cause?: Error) {
    super(message, cause);
  }
}

// --- Internal Server Errors (Usually 500) ---

export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false; // Often indicates a programmer error or unexpected DB state

  constructor(message = 'Database operation failed', cause?: Error) {
    super(message, cause);
  }
}

// Generic unexpected error for internal issues
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false; // Indicates a bug or unhandled situation

  constructor(message = 'An unexpected internal server error occurred', cause?: Error) {
    super(message, cause);
  }
} 