// contexts/TripContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of your itinerary data based on the JSON response
// You can make this as detailed as you need
interface Itinerary {
  destination: string;
  duration: number;
  estimatedCost: number;
  currency: string;
  dailyItinerary: any[]; // Define a stricter type for daily plans if you can
  // Add other properties from your JSON here...
}

// Define the type for our context value
interface TripContextType {
  tripData: Itinerary | null;
  setTripData: (data: Itinerary | null) => void;
}

// Create the context with a default value of undefined
const TripContext = createContext<TripContextType | undefined>(undefined);

// Define props for the provider
interface TripProviderProps {
  children: ReactNode;
}

export const TripProvider = ({ children }: TripProviderProps) => {
  const [tripData, setTripData] = useState<Itinerary | null>(null);

  return (
    <TripContext.Provider value={{ tripData, setTripData }}>
      {children}
    </TripContext.Provider>
  );
};

// Custom hook to use the context
export const useTrip = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};