/**
 * Centralized API Configuration Utility
 * Handles environment variable resolution with fallbacks and URL validation
 */

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

interface EnvironmentConfig {
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_BACKEND_URL?: string;
  NODE_ENV: string;
}

/**
 * Validates if a URL is properly formatted
 */
function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes trailing slash from URL
 */
function removeTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Gets the base API URL with environment variable resolution and fallbacks
 */
function getBaseApiUrl(): string {
  const env = process.env as EnvironmentConfig;
  
  // Primary: NEXT_PUBLIC_API_URL
  if (env.NEXT_PUBLIC_API_URL) {
    const cleanUrl = removeTrailingSlash(env.NEXT_PUBLIC_API_URL);
    if (validateUrl(cleanUrl)) {
      return cleanUrl;
    }
    console.warn('Invalid NEXT_PUBLIC_API_URL format:', env.NEXT_PUBLIC_API_URL);
  }
  
  // Fallback: NEXT_PUBLIC_BACKEND_URL
  if (env.NEXT_PUBLIC_BACKEND_URL) {
    const cleanUrl = removeTrailingSlash(env.NEXT_PUBLIC_BACKEND_URL);
    if (validateUrl(cleanUrl)) {
      console.warn('Using fallback NEXT_PUBLIC_BACKEND_URL');
      return cleanUrl;
    }
    console.warn('Invalid NEXT_PUBLIC_BACKEND_URL format:', env.NEXT_PUBLIC_BACKEND_URL);
  }
  
  // Development fallback
  const fallbackUrl = 'http://localhost:4000';
  if (env.NODE_ENV === 'development') {
    console.warn('Using development fallback URL:', fallbackUrl);
    return fallbackUrl;
  }
  
  // Production error
  throw new Error('No valid API URL found in environment variables');
}

/**
 * Gets the complete API configuration
 */
export function getApiConfig(): ApiConfig {
  const baseUrl = getBaseApiUrl();
  
  return {
    baseUrl,
    timeout: 10000, // 10 seconds
    retries: 3
  };
}

/**
 * Constructs a complete API URL by combining base URL with endpoint
 */
export function buildApiUrl(endpoint: string): string {
  const { baseUrl } = getApiConfig();
  
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Gets just the base API URL (without trailing slash)
 */
export function getApiBaseUrl(): string {
  return getApiConfig().baseUrl;
}

// Log API configuration on module load (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  try {
    const config = getApiConfig();
    console.log('🔗 API Configuration:', {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
      environment: process.env.NODE_ENV,
      envVars: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL
      }
    });
  } catch (error) {
    console.error('❌ API Configuration Error:', error);
  }
}