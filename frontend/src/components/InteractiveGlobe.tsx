import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { popularDestinations, Destination } from '../data/destinations';
import { airportDestinations, AirportDestination } from '../data/airport-destinations';
import { 
  FaUmbrellaBeach, 
  FaCity, 
  FaTree, 
  FaLandmark, 
  FaMountain, 
  FaTheaterMasks, 
  FaMapMarkerAlt,
  FaGlobeAmericas,
  FaBullseye,
  FaMousePointer,
  FaSearchPlus,
  FaPlaneDeparture,
  FaPlaneArrival
} from 'react-icons/fa';

interface Coordinates {
  lat: number;
  lng: number;
  name: string;
}

interface RouteData {
  source: Coordinates;
  destination: Coordinates;
}

interface GlobeProps {
  onDestinationSelect: (destination: Destination) => void;
  selectedDestination?: Destination;
  searchQuery?: string;
  routeData?: RouteData | null;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'beach': return '#20B2AA'; // Light Sea Green
    case 'city': return '#4169E1';  // Royal Blue
    case 'nature': return '#32CD32'; // Lime Green
    case 'historical': return '#FFD700'; // Gold
    case 'adventure': return '#FF69B4'; // Hot Pink
    case 'cultural': return '#9370DB'; // Medium Purple
    default: return '#FFFFFF'; // White
  }
};

const getCategoryIcon = (category: string) => {
  const iconStyle = { fontSize: '24px' };
  switch (category) {
    case 'beach': return <FaUmbrellaBeach style={{ ...iconStyle, color: '#20B2AA' }} />;
    case 'city': return <FaCity style={{ ...iconStyle, color: '#4169E1' }} />;
    case 'nature': return <FaTree style={{ ...iconStyle, color: '#32CD32' }} />;
    case 'historical': return <FaLandmark style={{ ...iconStyle, color: '#FFD700' }} />;
    case 'adventure': return <FaMountain style={{ ...iconStyle, color: '#FF69B4' }} />;
    case 'cultural': return <FaTheaterMasks style={{ ...iconStyle, color: '#9370DB' }} />;
    default: return <FaMapMarkerAlt style={{ ...iconStyle, color: '#FFFFFF' }} />;
  }
};

export default function InteractiveGlobe({
  onDestinationSelect,
  selectedDestination,
  searchQuery = '',
  routeData = null
}: Readonly<GlobeProps>) {
  const globeRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Ensure we only render on client side (avoid SSR issues)
  useEffect(() => {
    setIsClient(true);
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Update dimensions on mount and resize
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        console.log(`📐 Globe container dimensions: ${width}x${height}`);
        setDimensions({ width, height });
      }
    };
    
    // Small delay to ensure container is fully rendered
    setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Merge destinations and airports for comprehensive display
  const allLocations = useMemo(() => {
    // Convert airport destinations to match Destination interface
    const airportsAsDestinations: Destination[] = airportDestinations.map(airport => ({
      id: airport.id,
      name: `${airport.city} (${airport.code})`,
      country: airport.country,
      continent: airport.continent,
      latitude: airport.latitude,
      longitude: airport.longitude,
      description: airport.name,
      category: 'city' as const,
      popularity: airport.popularity,
      bestMonths: [],
      averageCost: ''
    }));
    
    // Combine and deduplicate by ID
    const combined = [...popularDestinations, ...airportsAsDestinations];
    const uniqueMap = new Map(combined.map(loc => [loc.id, loc]));
    return Array.from(uniqueMap.values());
  }, []);

  const filteredDestinations = useMemo(() => {
    if (!searchQuery) return allLocations;
    return allLocations.filter(dest => 
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allLocations]);

  // Arc data for route visualization
  const arcsData = useMemo(() => {
    if (!routeData) return [];
    
    return [{
      startLat: routeData.source.lat,
      startLng: routeData.source.lng,
      endLat: routeData.destination.lat,
      endLng: routeData.destination.lng,
      color: ['#ff6b6b', '#4ecdc4'] // Red to teal gradient
    }];
  }, [routeData]);

  // Convert destinations to points with proper lat/lng
  // Differentiate between airports (showing code) and regular destinations
  const globeData = filteredDestinations.map(dest => {
    const isAirport = dest.name.includes('(') && dest.name.includes(')');
    return {
      lat: dest.latitude,
      lng: dest.longitude,
      name: dest.name,
      country: dest.country,
      description: dest.description,
      size: isAirport ? 0.4 : 0.5, // Slightly smaller for airports
      color: isAirport ? '#FFD700' : getCategoryColor(dest.category), // Gold for airports
      destId: dest.id // Store the destination ID to find the full object later
    };
  });

  // Route points (source and destination markers)
  const routePoints = useMemo(() => {
    if (!routeData) return [];
    
    return [
      {
        lat: routeData.source.lat,
        lng: routeData.source.lng,
        size: 0.7,
        color: '#ff6b6b',
        name: `✈ ${routeData.source.name}`, // Using simple icon for text string
        destId: 'route-source'
      },
      {
        lat: routeData.destination.lat,
        lng: routeData.destination.lng,
        size: 0.7,
        color: '#4ecdc4',
        name: `✈ ${routeData.destination.name}`, // Using simple icon for text string
        destId: 'route-dest'
      }
    ];
  }, [routeData]);

  // Combine regular destinations with route points
  // If routeData exists, ONLY show route points (source + destination)
  // Otherwise show all destination markers
  const allPoints = useMemo(() => {
    if (routeData) {
      // Only show source and destination when route is active
      return routePoints;
    }
    // Show all destinations when no route
    return globeData;
  }, [globeData, routePoints, routeData]);

  const handlePointClick = useCallback((point: any) => {
    // Find the full destination object using the ID
    const fullDestination = filteredDestinations.find(dest => dest.id === point.destId);
    if (fullDestination) {
      onDestinationSelect(fullDestination);
    }
    
    // Auto-rotate to show the selected point
    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: point.lat,
        lng: point.lng,
        altitude: 2
      }, 1000);
    }
  }, [onDestinationSelect, filteredDestinations]);

  // Loading fallback
  if (!isClient) {
    return (
      <div style={{
        width: '100%',
        height: isMobile ? '400px' : '600px',
        background: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            marginBottom: '16px', 
            fontSize: '48px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <FaGlobeAmericas style={{ color: '#4285f4' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            Loading Interactive Globe...
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Preparing your 3D travel experience
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : '900px',
        height: isMobile ? '400px' : '600px',
        background: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
        borderRadius: isMobile ? '12px' : '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
      }}
    >
      {/* Globe badge */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '12px' : '20px',
        right: isMobile ? '12px' : '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: isMobile ? '6px 12px' : '10px 16px',
        borderRadius: '20px',
        fontSize: isMobile ? '12px' : '14px',
        fontWeight: 'bold',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <FaGlobeAmericas />
        {!isMobile && <span>Interactive Globe</span>}
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: 'white',
        fontSize: '14px',
        opacity: 0.9,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
        padding: '12px 16px',
        borderRadius: '12px',
        backdropFilter: 'blur(15px)',
        zIndex: 10,
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <FaBullseye style={{ color: '#fbbf24' }} />
          <span>Click destinations</span>
          <span style={{ opacity: 0.6 }}>•</span>
          <FaMousePointer style={{ color: '#3b82f6' }} />
          <span>Drag to rotate</span>
          <span style={{ opacity: 0.6 }}>•</span>
          <FaSearchPlus style={{ color: '#10b981' }} />
          <span>Scroll to zoom</span>
        </div>
      </div>

      {/* Selected destination info */}
      {selectedDestination && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '16px',
          fontSize: '16px',
          maxWidth: '300px',
          zIndex: 10,
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(15px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {getCategoryIcon(selectedDestination.category)}
            <span>{selectedDestination.name}</span>
          </div>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.8,
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <FaMapMarkerAlt style={{ color: '#fbbf24' }} />
            <span>{selectedDestination.country}</span>
          </div>
          <div style={{ 
            fontSize: '13px', 
            opacity: 0.7,
            fontStyle: 'italic'
          }}>
            {selectedDestination.description}
          </div>
        </div>
      )}

      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Points data (includes destinations + route points)
        pointsData={allPoints}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={(point: any) => point.size}
        pointRadius={0.4} // Slightly larger markers
        pointResolution={12} // Higher resolution
        
        // Point interactions
        onPointClick={handlePointClick}
        pointLabel={(point: any) => `
          <div style="
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            max-width: 250px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(15px);
          ">
            <div style="font-weight: bold; margin-bottom: 6px; font-size: 16px;">
              ${point.name}
            </div>
            <div style="opacity: 0.8; font-size: 13px; margin-bottom: 4px;">
              ▸ ${point.country || ''}
            </div>
            <div style="opacity: 0.7; font-size: 12px; font-style: italic;">
              ${point.description || ''}
            </div>
          </div>
        `}
        
        // Arcs data (for route visualization)
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcAltitudeAutoScale={0.3}
        
        // Globe controls
        enablePointerInteraction={true}
        animateIn={true}
        
        // Atmosphere
        atmosphereColor="#87CEEB"
        atmosphereAltitude={0.2} // More prominent atmosphere
      />
    </div>
  );
}
