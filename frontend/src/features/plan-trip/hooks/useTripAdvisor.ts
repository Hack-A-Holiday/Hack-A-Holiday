import { useState } from 'react';
import { TripAdvisorLocation } from '../types';

export const useTripAdvisor = () => {
  const [showTripAdvisor, setShowTripAdvisor] = useState(false);
  const [selectedAttractions, setSelectedAttractions] = useState<TripAdvisorLocation[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<TripAdvisorLocation[]>([]);

  const handleAttractionSelect = (attraction: TripAdvisorLocation) => {
    setSelectedAttractions(prev => {
      const exists = prev.find(item => item.location_id === attraction.location_id);
      if (exists) {
        return prev.filter(item => item.location_id !== attraction.location_id);
      }
      return [...prev, attraction];
    });
  };

  const handleRestaurantSelect = (restaurant: TripAdvisorLocation) => {
    setSelectedRestaurants(prev => {
      const exists = prev.find(item => item.location_id === restaurant.location_id);
      if (exists) {
        return prev.filter(item => item.location_id !== restaurant.location_id);
      }
      return [...prev, restaurant];
    });
  };

  const resetSelections = () => {
    setSelectedAttractions([]);
    setSelectedRestaurants([]);
    setShowTripAdvisor(false);
  };

  return {
    showTripAdvisor,
    setShowTripAdvisor,
    selectedAttractions,
    selectedRestaurants,
    handleAttractionSelect,
    handleRestaurantSelect,
    resetSelections
  };
};
