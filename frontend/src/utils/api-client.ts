import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
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
      },
      timeout: 10000 // 10 second timeout
    });
    return response.data;
  } catch (error) {

    throw error;
  }
};

export default apiClient;