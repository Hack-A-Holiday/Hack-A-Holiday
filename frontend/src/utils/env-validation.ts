/**
 * Environment Variable Validation Utility
 * 
 * Validates required environment variables and provides startup checks
 * for API connectivity and development vs production environment detection.
 */

import { getApiConfig, buildApiUrl } from '../config/api';

interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: 'development' | 'production' | 'test';
  apiConfig: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
}

interface ConnectivityCheckResult {
  isConnected: boolean;
  responseTime?: number;
  error?: string;
  statusCode?: number;
}

/**
 * Validates all required environment variables
 */
export function validateEnvironmentVariables(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Detect environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const environment = nodeEnv as 'development' | 'production' | 'test';
  
  // Check for API URL configuration
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (!apiUrl && !backendUrl) {
    if (environment === 'production') {
      errors.push('Missing required environment variable: NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL must be set in production');
    } else {
      warnings.push('No API URL configured, using localhost fallback for development');
    }
  }
  
  // Validate URL format if provided
  if (apiUrl && !isValidUrl(apiUrl)) {
    errors.push(`Invalid NEXT_PUBLIC_API_URL format: ${apiUrl}`);
  }
  
  if (backendUrl && !isValidUrl(backendUrl)) {
    errors.push(`Invalid NEXT_PUBLIC_BACKEND_URL format: ${backendUrl}`);
  }
  
  // Check for localhost in production
  if (environment === 'production') {
    if (apiUrl?.includes('localhost') || backendUrl?.includes('localhost')) {
      errors.push('Localhost URLs detected in production environment');
    }
  }
  
  // Get API configuration
  let apiConfig;
  try {
    apiConfig = getApiConfig();
  } catch (error) {
    errors.push(`Failed to get API configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    apiConfig = { baseUrl: 'unknown', timeout: 0, retries: 0 };
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    environment,
    apiConfig
  };
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Performs API connectivity check
 */
export async function checkApiConnectivity(timeout: number = 5000): Promise<ConnectivityCheckResult> {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Try to reach a simple health check endpoint
    const response = await fetch(buildApiUrl('/health'), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      isConnected: response.ok,
      responseTime,
      statusCode: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error types
    if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
      return {
        isConnected: false,
        error: `Connection timeout after ${timeout}ms`
      };
    }
    
    if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
      return {
        isConnected: false,
        error: 'Network error - unable to reach API server'
      };
    }
    
    return {
      isConnected: false,
      error: errorMessage
    };
  }
}

/**
 * Performs startup environment validation and connectivity checks
 */
export async function performStartupChecks(): Promise<{
  validation: EnvironmentValidationResult;
  connectivity: ConnectivityCheckResult;
}> {
  console.log('🔍 Performing startup environment checks...');
  
  // Validate environment variables
  const validation = validateEnvironmentVariables();
  
  // Log validation results
  if (validation.errors.length > 0) {
    console.error('❌ Environment validation errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment validation warnings:', validation.warnings);
  }
  
  console.log('🌍 Environment:', validation.environment);
  console.log('🔗 API Configuration:', validation.apiConfig);
  
  // Check API connectivity (only if validation passed)
  let connectivity: ConnectivityCheckResult = { isConnected: false, error: 'Skipped due to validation errors' };
  
  if (validation.isValid) {
    console.log('🔌 Checking API connectivity...');
    connectivity = await checkApiConnectivity();
    
    if (connectivity.isConnected) {
      console.log(`✅ API connected successfully (${connectivity.responseTime}ms)`);
    } else {
      console.error('❌ API connectivity failed:', connectivity.error);
    }
  }
  
  return {
    validation,
    connectivity
  };
}

/**
 * Development vs Production environment detection
 */
export function getEnvironmentInfo() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  
  // Detect if running on localhost
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.startsWith('192.168.'));
  
  // Detect deployment platform
  const isVercel = typeof window !== 'undefined' && 
    window.location.hostname.includes('vercel.app');
  
  const isNetlify = typeof window !== 'undefined' && 
    window.location.hostname.includes('netlify.app');
  
  return {
    nodeEnv,
    isDevelopment,
    isProduction,
    isTest,
    isLocalhost,
    isVercel,
    isNetlify,
    platform: isVercel ? 'vercel' : isNetlify ? 'netlify' : isLocalhost ? 'localhost' : 'unknown'
  };
}

/**
 * Logs environment information for debugging
 */
export function logEnvironmentInfo() {
  const envInfo = getEnvironmentInfo();
  const validation = validateEnvironmentVariables();
  
  console.group('🌍 Environment Information');
  console.log('Environment:', envInfo.nodeEnv);
  console.log('Platform:', envInfo.platform);
  console.log('Is Development:', envInfo.isDevelopment);
  console.log('Is Production:', envInfo.isProduction);
  console.log('Is Localhost:', envInfo.isLocalhost);
  console.log('API Base URL:', validation.apiConfig.baseUrl);
  
  if (validation.errors.length > 0) {
    console.error('Validation Errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Validation Warnings:', validation.warnings);
  }
  
  console.groupEnd();
}

// Auto-run environment logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  logEnvironmentInfo();
}