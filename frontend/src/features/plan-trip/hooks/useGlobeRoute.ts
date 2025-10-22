import { useState } from 'react';
import { Destination } from '@/data/destinations';

interface RouteData {
  source: {
    name: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  distance?: number;
}

export const useGlobeRoute = () => {
  const [sourceDestination, setSourceDestination] = useState<Destination | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Destination | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [clickStep, setClickStep] = useState<'source' | 'destination'>('source');
  const [typedSource, setTypedSource] = useState('');
  const [typedDestination, setTypedDestination] = useState('');

  const fetchRouteCoordinates = async (source: string, destination: string) => {
    if (!source.trim() || !destination.trim()) {
      return;
    }

    setLoadingRoute(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const response = await fetch(`${apiUrl}/globe/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: source.trim(), destination: destination.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setRouteData(data.route);
      } else {
        console.error('Failed to fetch route:', data);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleDestinationSelect = (
    destination: Destination,
    onDestinationChange: (dest: string, destData: Destination) => void
  ) => {
    if (clickStep === 'source') {
      // First click - set as source
      setSourceDestination(destination);
      setTypedSource(`${destination.name}, ${destination.country}`);
      setClickStep('destination');
    } else {
      // Second click - set as destination and fetch route
      setDestinationLocation(destination);
      setTypedDestination(`${destination.name}, ${destination.country}`);
      onDestinationChange(`${destination.name}, ${destination.country}`, destination);
      
      // Automatically fetch route with both locations
      const source = sourceDestination?.name || typedSource.trim();
      if (source) {
        fetchRouteCoordinates(source, destination.name);
      }
    }
  };

  const handleResetSelection = () => {
    setSourceDestination(null);
    setDestinationLocation(null);
    setRouteData(null);
    setClickStep('source');
    setTypedSource('');
    setTypedDestination('');
  };

  const swapSourceDestination = () => {
    const tempSource = sourceDestination;
    const tempTypedSource = typedSource;
    
    setSourceDestination(destinationLocation);
    setDestinationLocation(tempSource);
    setTypedSource(typedDestination);
    setTypedDestination(tempTypedSource);
    
    // Clear route to refresh
    setRouteData(null);
    
    // Re-fetch route with swapped locations if both are set
    if (destinationLocation && tempSource) {
      fetchRouteCoordinates(
        `${destinationLocation.name}, ${destinationLocation.country}`,
        `${tempSource.name}, ${tempSource.country}`
      );
    }
  };

  return {
    sourceDestination,
    destinationLocation,
    routeData,
    loadingRoute,
    clickStep,
    typedSource,
    typedDestination,
    setTypedSource,
    setTypedDestination,
    setSourceDestination,
    setDestinationLocation,
    setRouteData,
    setClickStep,
    fetchRouteCoordinates,
    handleDestinationSelect,
    handleResetSelection,
    swapSourceDestination
  };
};
