import axios from 'axios';
import { getApiConfig } from '../config/api';

// Get centralized API configuration
const apiConfig = getApiConfig();

const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add request interceptor for API calls
apiClient.interceptors.request.use(
  async (config) => {
    // You can add any request modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for API calls with consistent error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        url: originalRequest.url,
        status: error.response.status,
        data: error.response.data
      });
      
      // Handle specific error cases
      if (error.response.status === 404) {
        console.error('❌ API endpoint not found:', originalRequest.url);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', {
        url: originalRequest.url,
        timeout: originalRequest.timeout,
        error: error.request
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;