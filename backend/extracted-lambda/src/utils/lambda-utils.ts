import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { ApiError, ERROR_CODES } from '../types';

export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  correlationId: string;
  startTime: number;
}

/**
 * Create standardized API response
 */
export function createResponse(
  statusCode: number,
  data: any,
  requestId: string,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  // Dynamically set CORS origin: use request's Origin header if present and allowed, else fallback
  let allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  // Try to get Origin from headers if available (for Lambda proxy integration, event.headers is passed in)
  // This function doesn't have access to event, so allow passing origin via headers['__request_origin']
  let requestOrigin = headers['__request_origin'] || '';
  if (requestOrigin && (requestOrigin === allowedOrigin || allowedOrigin === '*' /* fallback, but never send * with credentials */)) {
    allowedOrigin = requestOrigin;
  }
  if (allowedOrigin === '*') {
    // Never send * if credentials are used
    allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  }
  // Remove the special header so it doesn't leak
  if (headers['__request_origin']) delete headers['__request_origin'];

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'X-Request-ID': requestId,
    ...headers,
  };

  const response = {
    success: statusCode >= 200 && statusCode < 300,
    data: statusCode >= 200 && statusCode < 300 ? data : undefined,
    error: statusCode >= 400 ? data : undefined,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(response),
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  statusCode: number,
  error: string | ApiError,
  requestId: string
): APIGatewayProxyResult {
  let errorData: ApiError;

  if (typeof error === 'string') {
    errorData = {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error,
      requestId,
      timestamp: new Date().toISOString(),
    };
  } else {
    errorData = {
      ...error,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  return createResponse(statusCode, errorData, requestId);
}

/**
 * Parse JSON body from API Gateway event
 */
export function parseJsonBody<T = any>(event: APIGatewayProxyEvent): T | null {
  if (!event.body) {
    return null;
  }

  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Extract user ID from event (from JWT token, API key, etc.)
 */
export function extractUserId(event: APIGatewayProxyEvent): string | undefined {
  // 1. Try to extract userId from JWT in cookie
  if (event.headers && event.headers.cookie) {
    const cookies = event.headers.cookie.split(';').map(c => c.trim());
    const jwtCookie = cookies.find(c => c.startsWith('token='));
    if (jwtCookie) {
      const token = jwtCookie.replace('token=', '');
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        return decoded.userId || decoded.sub;
      } catch (err) {
        // Invalid token, ignore
      }
    }
  }
  // 2. Check for user ID in headers (from authentication middleware)
  const userIdHeader = event.headers['x-user-id'] || event.headers['X-User-Id'];
  if (userIdHeader) {
    return userIdHeader;
  }
  // 3. (legacy) Cognito JWT claims check removed
  const claims = event.requestContext.authorizer?.claims;
  if (claims && claims.sub) {
    return claims.sub;
  }
  // 4. Check for user ID in path parameters
  if (event.pathParameters?.userId) {
    return event.pathParameters.userId;
  }
  // 5. Check for user ID in query parameters
  if (event.queryStringParameters?.userId) {
    return event.queryStringParameters.userId;
  }
  return undefined;
}

/**
 * Create request context for tracking
 */
export function createRequestContext(event: APIGatewayProxyEvent): RequestContext {
  return {
    requestId: event.requestContext.requestId,
    userId: extractUserId(event),
    correlationId: event.headers['x-correlation-id'] || randomUUID(),
    startTime: Date.now(),
  };
}

/**
 * Log request details
 */
export function logRequest(
  event: APIGatewayProxyEvent,
  context: Context,
  requestContext: RequestContext
): void {
  console.log('Request started', {
    requestId: requestContext.requestId,
    correlationId: requestContext.correlationId,
    userId: requestContext.userId,
    method: event.httpMethod,
    path: event.path,
    resource: event.resource,
    userAgent: event.headers['User-Agent'],
    sourceIp: event.requestContext.identity.sourceIp,
    functionName: context.functionName,
    functionVersion: context.functionVersion,
  });
}

/**
 * Log response details
 */
export function logResponse(
  response: APIGatewayProxyResult,
  requestContext: RequestContext,
  error?: Error
): void {
  const duration = Date.now() - requestContext.startTime;
  
  console.log('Request completed', {
    requestId: requestContext.requestId,
    correlationId: requestContext.correlationId,
    userId: requestContext.userId,
    statusCode: response.statusCode,
    duration,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : undefined,
  });
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(event: APIGatewayProxyEvent): APIGatewayProxyResult | null {
  if (event.httpMethod === 'OPTIONS') {
    const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': ORIGIN,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }
  return null;
}

/**
 * Middleware wrapper for Lambda functions
 */
export function withMiddleware(
  handler: (
    event: APIGatewayProxyEvent,
    context: Context,
    requestContext: RequestContext
  ) => Promise<APIGatewayProxyResult>
) {
  return async (
    event: APIGatewayProxyEvent,
    context: Context
  ): Promise<APIGatewayProxyResult> => {
    const requestContext = createRequestContext(event);
    
    try {
      // Handle CORS preflight
      const corsResponse = handleCorsPreflightRequest(event);
      if (corsResponse) {
        return corsResponse;
      }

      // Log request
      logRequest(event, context, requestContext);

      // Execute handler
      const response = await handler(event, context, requestContext);

      // Log response
      logResponse(response, requestContext);

      return response;
    } catch (error) {
      console.error('Unhandled error in Lambda function:', error);
      
      const errorResponse = createErrorResponse(
        500,
        {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
          requestId: requestContext.requestId,
          timestamp: new Date().toISOString(),
        },
        requestContext.requestId
      );

      logResponse(errorResponse, requestContext, error as Error);
      return errorResponse;
    }
  };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * In production, use Redis or DynamoDB for distributed rate limiting
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this key
    let requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(key, requests);
    
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute

/**
 * Apply rate limiting to requests
 */
export function applyRateLimit(
  event: APIGatewayProxyEvent,
  requestContext: RequestContext
): APIGatewayProxyResult | null {
  const key = requestContext.userId || event.requestContext.identity.sourceIp;
  
  if (!globalRateLimiter.isAllowed(key)) {
    return createErrorResponse(
      429,
      {
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded. Please try again later.',
        requestId: requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      requestContext.requestId
    );
  }
  
  return null;
}

/**
 * Validate request method
 */
export function validateMethod(
  event: APIGatewayProxyEvent,
  allowedMethods: string[]
): APIGatewayProxyResult | null {
  if (!allowedMethods.includes(event.httpMethod)) {
    return createErrorResponse(
      405,
      {
        code: ERROR_CODES.INVALID_INPUT,
        message: `Method ${event.httpMethod} not allowed`,
        requestId: event.requestContext.requestId,
        timestamp: new Date().toISOString(),
      },
      event.requestContext.requestId
    );
  }
  
  return null;
}

/**
 * Extract pagination parameters
 */
export function extractPaginationParams(event: APIGatewayProxyEvent): {
  limit: number;
  offset: number;
  lastEvaluatedKey?: string;
} {
  const queryParams = event.queryStringParameters || {};
  
  const limit = Math.min(
    parseInt(queryParams.limit || '20', 10),
    100 // Maximum limit
  );
  
  const offset = Math.max(
    parseInt(queryParams.offset || '0', 10),
    0
  );
  
  const lastEvaluatedKey = queryParams.lastEvaluatedKey;
  
  return {
    limit,
    offset,
    ...(lastEvaluatedKey && { lastEvaluatedKey }),
  };
}