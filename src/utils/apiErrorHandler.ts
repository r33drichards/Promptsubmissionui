import { toast } from 'sonner';

/**
 * Detailed error information extracted from various error types
 */
interface ErrorDetails {
  type: 'network' | 'cors' | 'server' | 'client' | 'auth' | 'unknown';
  status?: number;
  message: string;
  title: string;
  technical?: string;
}

/**
 * Analyzes an error and extracts detailed information about what went wrong
 */
function analyzeError(error: unknown): ErrorDetails {
  // Network failure (fetch failed completely)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      title: 'Network Error',
      message:
        'Unable to connect to the backend. Please check your internet connection.',
      technical: error.message,
    };
  }

  // Response error from fetch API
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;

    // 502 Bad Gateway - Backend is down
    if (status === 502) {
      return {
        type: 'server',
        status: 502,
        title: 'Backend Service Down',
        message:
          'The backend service is currently unavailable. This may be due to deployment or maintenance. Please try again in a few minutes.',
        technical: 'HTTP 502 Bad Gateway',
      };
    }

    // 503 Service Unavailable
    if (status === 503) {
      return {
        type: 'server',
        status: 503,
        title: 'Service Unavailable',
        message:
          'The backend service is temporarily unavailable. Please try again later.',
        technical: 'HTTP 503 Service Unavailable',
      };
    }

    // 504 Gateway Timeout
    if (status === 504) {
      return {
        type: 'server',
        status: 504,
        title: 'Request Timeout',
        message: 'The backend took too long to respond. Please try again.',
        technical: 'HTTP 504 Gateway Timeout',
      };
    }

    // 401 Unauthorized
    if (status === 401) {
      return {
        type: 'auth',
        status: 401,
        title: 'Authentication Required',
        message:
          'Your session may have expired. Please log out and log back in.',
        technical: 'HTTP 401 Unauthorized',
      };
    }

    // 403 Forbidden
    if (status === 403) {
      return {
        type: 'auth',
        status: 403,
        title: 'Access Denied',
        message: "You don't have permission to perform this action.",
        technical: 'HTTP 403 Forbidden',
      };
    }

    // 400 Bad Request
    if (status === 400) {
      return {
        type: 'client',
        status: 400,
        title: 'Invalid Request',
        message:
          'The request was invalid. Please check your input and try again.',
        technical: 'HTTP 400 Bad Request',
      };
    }

    // 404 Not Found
    if (status === 404) {
      return {
        type: 'client',
        status: 404,
        title: 'Not Found',
        message: 'The requested resource was not found.',
        technical: 'HTTP 404 Not Found',
      };
    }

    // 500 Internal Server Error
    if (status === 500) {
      return {
        type: 'server',
        status: 500,
        title: 'Server Error',
        message:
          'An internal server error occurred. Our team has been notified.',
        technical: 'HTTP 500 Internal Server Error',
      };
    }

    // Other 5xx errors
    if (status >= 500) {
      return {
        type: 'server',
        status,
        title: 'Server Error',
        message: 'The server encountered an error. Please try again later.',
        technical: `HTTP ${status}`,
      };
    }

    // Other 4xx errors
    if (status >= 400) {
      return {
        type: 'client',
        status,
        title: 'Request Error',
        message: 'There was a problem with your request.',
        technical: `HTTP ${status}`,
      };
    }
  }

  // CORS error (specific detection)
  if (error instanceof Error) {
    if (
      error.message.includes('CORS') ||
      error.message.includes("No 'Access-Control-Allow-Origin'")
    ) {
      return {
        type: 'cors',
        title: 'CORS Error',
        message:
          'The backend is not configured to accept requests from this origin. This usually means the backend is down or misconfigured.',
        technical: error.message,
      };
    }

    // Generic error with message
    return {
      type: 'unknown',
      title: 'Error',
      message: error.message || 'An unexpected error occurred.',
      technical: error.message,
    };
  }

  // Completely unknown error
  return {
    type: 'unknown',
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    technical: String(error),
  };
}

/**
 * Handles API errors and displays appropriate toast notifications
 * @param error The error that occurred
 * @param context Optional context about where the error occurred
 * @returns The analyzed error details
 */
export function handleApiError(error: unknown, context?: string): ErrorDetails {
  const details = analyzeError(error);

  // Build the toast message
  const contextPrefix = context ? `${context}: ` : '';
  const toastMessage = `${contextPrefix}${details.message}`;

  // Show appropriate toast based on error type
  switch (details.type) {
    case 'network':
    case 'cors':
    case 'server':
      toast.error(details.title, {
        description: toastMessage,
        duration: 6000, // Longer duration for critical errors
      });
      break;

    case 'auth':
      toast.error(details.title, {
        description: toastMessage,
        duration: 8000, // Even longer for auth issues
      });
      break;

    case 'client':
      toast.warning(details.title, {
        description: toastMessage,
        duration: 5000,
      });
      break;

    default:
      toast.error(details.title, {
        description: toastMessage,
        duration: 5000,
      });
  }

  // Log technical details to console for debugging
  console.error('[API Error]', {
    type: details.type,
    title: details.title,
    message: details.message,
    status: details.status,
    technical: details.technical,
    context,
    originalError: error,
  });

  return details;
}

/**
 * Wraps an async function with error handling that automatically shows toasts
 * @param fn The async function to wrap
 * @param context Context description for the operation
 * @returns Wrapped function that handles errors
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, context);
      throw error; // Re-throw so React Query can handle it
    }
  }) as T;
}
