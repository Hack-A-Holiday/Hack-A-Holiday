/**
 * Retry Utility Functions
 * 
 * Provides exponential backoff retry logic with jitter for API calls
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 16000, // 16 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1
};

export enum ApiErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT'
}

export interface ApiError extends Error {
  type: ApiErrorType;
  retryable: boolean;
  endpoint: string;
  timestamp: string;
  statusCode?: number;
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );
  
  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * config.jitterFactor * Math.random();
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error.type) {
    return error.retryable;
  }
  
  // Check HTTP status codes
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    return status === 429 || status === 502 || status === 503 || status === 504;
  }
  
  // Check error messages
  const message = error.message?.toLowerCase() || '';
  return message.includes('timeout') || 
         message.includes('network') || 
         message.includes('rate limit') ||
         message.includes('too many requests');
}

/**
 * Create an ApiError from a generic error
 */
export function createApiError(
  error: any, 
  endpoint: string, 
  type?: ApiErrorType
): ApiError {
  const apiError = new Error(error.message || 'API request failed') as ApiError;
  
  apiError.type = type || classifyError(error);
  apiError.retryable = isRetryableError(error);
  apiError.endpoint = endpoint;
  apiError.timestamp = new Date().toISOString();
  apiError.statusCode = error.status || error.statusCode;
  
  return apiError;
}

/**
 * Classify error type based on error details
 */
function classifyError(error: any): ApiErrorType {
  const status = error.status || error.statusCode;
  const message = error.message?.toLowerCase() || '';
  
  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    return ApiErrorType.RATE_LIMIT;
  }
  
  if (status >= 500 || message.includes('server error')) {
    return ApiErrorType.SERVICE_UNAVAILABLE;
  }
  
  if (message.includes('timeout')) {
    return ApiErrorType.TIMEOUT;
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return ApiErrorType.NETWORK_ERROR;
  }
  
  return ApiErrorType.INVALID_RESPONSE;
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  endpoint: string = 'unknown'
): Promise<T> {
  let lastError: ApiError;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${config.maxAttempts} for ${endpoint}`);
      return await operation();
    } catch (error) {
      lastError = createApiError(error, endpoint);
      
      console.error(`❌ Attempt ${attempt} failed for ${endpoint}:`, lastError.message);
      
      // Don't retry if error is not retryable or this is the last attempt
      if (!lastError.retryable || attempt === config.maxAttempts) {
        break;
      }
      
      // Calculate delay and wait before next attempt
      const delay = calculateBackoffDelay(attempt, config);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}