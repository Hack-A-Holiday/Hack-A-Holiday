import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
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

// Add response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx

    } else if (error.request) {
      // The request was made but no response was received

    } else {
      // Something happened in setting up the request that triggered an Error

    }

    return Promise.reject(error);
  }
);