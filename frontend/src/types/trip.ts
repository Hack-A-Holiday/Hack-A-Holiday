export interface TripData {
  preferences: {
    destination: string;
    budget: number;
    duration: number;
    travelers: number;
    startDate: string;
    travelStyle: string;
    interests?: string[];
  };
}

// Re-export flight types for convenience
export * from './flight';