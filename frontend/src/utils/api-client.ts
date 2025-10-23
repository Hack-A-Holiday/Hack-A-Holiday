import axios from 'axios';
import { getApiConfig } from '../config/api';

// Get centralized API configuration
const apiConfig = getApiConfig();

const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  console.log('Making request to:', config.url, {
    method: config.method,
    headers: config.headers,
    data: config.data
  });
  return config;
});

// Response interceptor with enhanced error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        url: originalRequest.url,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Handle specific error cases
      if (error.response.status === 404) {
        console.error('❌ Endpoint not found:', originalRequest.url);
      } else if (error.response.status >= 500) {
        console.error('❌ Server error:', error.response.status);
      }
    } else if (error.request) {
      console.error('Network Error:', {
        message: error.message,
        url: originalRequest.url,
        timeout: originalRequest.timeout
      });
    } else {
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export interface TripPreferences {
  destination: string;
  budget: number;
  duration: number;
  travelers: number;
  startDate: string;
  travelStyle: string;
  interests?: string[];
}

export interface PlanTripRequest {
  preferences: TripPreferences;
  userId?: string;
}

export const planTrip = async (data: PlanTripRequest): Promise<any> => {
  try {
    const response = await apiClient.post('/plan-trip', data, {
      headers: {
        'Content-Type': 'application/json'
      }
      // timeout is now handled by the centralized config
    });
    return response.data;
  } catch (error) {
    console.error('Failed to plan trip:', error);
    throw error;
  }
};

export default apiClient;