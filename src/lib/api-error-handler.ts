import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): ErrorResponse {
  return {
    error: 'Validation Error',
    message: 'Invalid input data',
    statusCode: 400,
    details: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

/**
 * Handle Firebase errors
 */
function handleFirebaseError(error: any): ErrorResponse {
  const code = error.code || '';

  console.error('[API Error Handler] Firebase error:', {
    code,
    message: error.message,
    details: error.details
  });

  // Map Firebase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'The requested resource was not found',
    'already-exists': 'A resource with this identifier already exists',
    'resource-exhausted': 'Service quota exceeded. Please try again later',
    'unauthenticated': 'Authentication required',
    'unavailable': 'Service temporarily unavailable. Please try again',
    'deadline-exceeded': 'Request timeout. Please try again',
    'failed-precondition': 'A required database index is pending. This is a one-time setup that completes within minutes.',
    'auth/invalid-phone-number': 'Invalid phone number format. Use 10 digits or E.164 format (+919876543210)',
    'auth/phone-number-already-exists': 'Phone number already registered',
    'auth/email-already-exists': 'Email address already registered',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/invalid-email': 'Invalid email address format',
  };

  const message = errorMessages[code] || 'Database operation failed';

  // Determine status code based on error type
  let statusCode = 500;
  if (code === 'permission-denied' || code === 'unauthenticated') {
    statusCode = 403;
  } else if (code === 'auth/email-already-exists' || code === 'auth/phone-number-already-exists') {
    statusCode = 409;
  } else if (code.startsWith('auth/invalid-') || code === 'auth/weak-password') {
    statusCode = 400;
  }

  return {
    error: code.startsWith('auth/') ? 'Authentication Error' : 'Database Error',
    message,
    statusCode,
  };
}

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }

  // Handle known error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: 'API Error',
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const errorResponse = handleZodError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }

  // Handle Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const errorResponse = handleFirebaseError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      },
      { status: 500 }
    );
  }

  // Fallback for unknown error types
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: (message = 'Authentication required') =>
    NextResponse.json(
      {
        error: 'Unauthorized',
        message,
        statusCode: 401,
      },
      { status: 401 }
    ),

  forbidden: (message = 'You do not have permission to perform this action') =>
    NextResponse.json(
      {
        error: 'Forbidden',
        message,
        statusCode: 403,
      },
      { status: 403 }
    ),

  notFound: (resource = 'Resource') =>
    NextResponse.json(
      {
        error: 'Not Found',
        message: `${resource} not found`,
        statusCode: 404,
      },
      { status: 404 }
    ),

  conflict: (message = 'Resource already exists') =>
    NextResponse.json(
      {
        error: 'Conflict',
        message,
        statusCode: 409,
      },
      { status: 409 }
    ),

  badRequest: (message = 'Invalid request', details?: Record<string, string[]>) =>
    NextResponse.json(
      {
        error: 'Bad Request',
        message,
        statusCode: 400,
        details,
      },
      { status: 400 }
    ),
};
