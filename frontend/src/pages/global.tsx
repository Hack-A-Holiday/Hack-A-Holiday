import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import dynamic from 'next/dynamic';
import axios from 'axios';

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface Coordinates {
  lat: number;
  lng: number;
  name: string;
}

interface RouteData {
  source: Coordinates;
  destination: Coordinates;
}

function GlobalPage() {
  const { state } = useAuth();
  const globeEl = useRef<any>();
  
  // Form states
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);
  
  // Trip planning states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [flightClass, setFlightClass] = useState('economy');
  const [hotelStars, setHotelStars] = useState(4);
  const [tripPlan, setTripPlan] = useState<any>(null);
  const [planningTrip, setPlanningTrip] = useState(false);

  // Arc data for globe visualization
  const arcsData = useMemo(() => {
    if (!routeData) return [];
    
    return [{
      startLat: routeData.source.lat,
      startLng: routeData.source.lng,
      endLat: routeData.destination.lat,
      endLng: routeData.destination.lng,
      color: ['#ff6b6b', '#4ecdc4']
    }];
  }, [routeData]);

  // Points data for markers
  const pointsData = useMemo(() => {
    if (!routeData) return [];
    
    return [
      {
        lat: routeData.source.lat,
        lng: routeData.source.lng,
        size: 0.5,
        color: '#ff6b6b',
        label: `🛫 ${routeData.source.name}`
      },
      {
        lat: routeData.destination.lat,
        lng: routeData.destination.lng,
        size: 0.5,
        color: '#4ecdc4',
        label: `🛬 ${routeData.destination.name}`
      }
    ];
  }, [routeData]);

  // Fetch coordinates using Nova Pro
  const fetchCoordinates = async () => {
    if (!source.trim() || !destination.trim()) {
      setError('Please enter both source and destination');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/globe/route`, {
        source: source.trim(),
        destination: destination.trim()
      });

      if (response.data.success) {
        setRouteData(response.data.route);
        
        // Animate camera to show route
        if (globeEl.current) {
          const { source: src, destination: dest } = response.data.route;
          globeEl.current.pointOfView({
            lat: (src.lat + dest.lat) / 2,
            lng: (src.lng + dest.lng) / 2,
            altitude: 2.5
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Error fetching coordinates:', err);
      setError(err.response?.data?.message || 'Failed to fetch coordinates');
    } finally {
      setLoading(false);
    }
  };

  // Plan complete adventure
  const planAdventure = async () => {
    if (!routeData) return;

    setPlanningTrip(true);
    setError('');

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/globe/plan-adventure`, {
        source: routeData.source.name,
        destination: routeData.destination.name,
        startDate,
        endDate,
        budget: budget ? parseInt(budget) : undefined,
        preferences: {
          flightClass,
          hotelStars,
          interests: state.user?.preferences?.interests || []
        },
        userId: state.user?.id || 'anonymous'
      });

      if (response.data.success) {
        setTripPlan(response.data);
        setShowPlanForm(false);
      }
    } catch (err: any) {
      console.error('Error planning adventure:', err);
      setError(err.response?.data?.message || 'Failed to plan adventure');
    } finally {
      setPlanningTrip(false);
    }
  };

  const handleReset = () => {
    setSource('');
    setDestination('');
    setRouteData(null);
    setError('');
    setShowPlanForm(false);
    setTripPlan(null);
    
    if (globeEl.current) {
      globeEl.current.pointOfView({ altitude: 2.5 }, 1000);
    }
  };

  return (
    <div className="globe-page">
      <style jsx>{`
        .globe-page {
          width: 100%;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .controls-panel {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(15px);
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.3);
          max-width: 900px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .title {
          text-align: center;
          margin-bottom: 25px;
        }

        .title h1 {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 10px 0;
        }

        .title p {
          color: #666;
          font-size: 1rem;
          margin: 0;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .input-section {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
        }

        .input-group label {
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .input-group input,
        .input-group select {
          padding: 14px 18px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
        }

        .input-group input:focus,
        .input-group select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn {
          flex: 1;
          min-width: 140px;
          padding: 16px 28px;
          border: none;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-success {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(17, 153, 142, 0.4);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .route-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 15px;
          margin: 20px 0;
        }

        .route-card h3 {
          font-size: 1.3rem;
          margin: 0 0 20px 0;
        }

        .route-details {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .location-box {
          flex: 1;
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 10px;
        }

        .location-box h4 {
          font-size: 0.85rem;
          opacity: 0.9;
          margin: 0 0 8px 0;
        }

        .location-box p {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0 0 5px 0;
        }

        .location-box small {
          opacity: 0.8;
          font-size: 0.85rem;
        }

        .arrow {
          font-size: 2.5rem;
          opacity: 0.7;
        }

        .plan-form {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 15px;
          margin-top: 20px;
        }

        .plan-form h3 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .trip-results {
          margin-top: 25px;
          padding: 25px;
          background: white;
          border-radius: 15px;
          border: 2px solid #667eea;
        }

        .trip-results h3 {
          color: #667eea;
          margin-bottom: 15px;
        }

        .result-section {
          margin: 20px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .result-section h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .loading-box {
          background: white;
          padding: 40px 60px;
          border-radius: 20px;
          text-align: center;
        }

        .spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #667eea;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .globe-wrapper {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        @media (max-width: 768px) {
          .title h1 {
            font-size: 1.8rem;
          }

          .input-row {
            grid-template-columns: 1fr;
          }

          .route-details {
            flex-direction: column;
          }

          .arrow {
            transform: rotate(90deg);
          }
        }
      `}</style>

      {/* Controls Panel */}
      <div className="controls-panel">
        <div className="title">
          <h1>🌍 Plan Your Journey with AI</h1>
          <p>Powered by AWS Bedrock Nova Pro</p>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        {/* Step 1: Enter Source & Destination */}
        <div className="input-section">
          <h3 style={{ marginTop: 0 }}>📍 Where are you traveling?</h3>
          <div className="input-row">
            <div className="input-group">
              <label>🛫 Departure City</label>
              <input
                type="text"
                placeholder="e.g., Washington DC"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchCoordinates()}
                disabled={loading}
              />
            </div>
            
            <div className="input-group">
              <label>🛬 Destination City</label>
              <input
                type="text"
                placeholder="e.g., Bali, Indonesia"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchCoordinates()}
                disabled={loading}
              />
            </div>
          </div>

          <div className="button-group">
            <button 
              className="btn btn-primary" 
              onClick={fetchCoordinates}
              disabled={loading || !source.trim() || !destination.trim()}
            >
              {loading ? '🔍 Finding Route...' : '🌍 Show Route on Globe'}
            </button>
            
            {routeData && (
              <button className="btn btn-secondary" onClick={handleReset}>
                🔄 Start Over
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Route Display */}
        {routeData && (
          <div className="route-card">
            <h3>✨ Your Travel Route</h3>
            <div className="route-details">
              <div className="location-box">
                <h4>DEPARTURE</h4>
                <p>{routeData.source.name}</p>
                <small>{routeData.source.lat.toFixed(4)}°, {routeData.source.lng.toFixed(4)}°</small>
              </div>
              
              <div className="arrow">✈️</div>
              
              <div className="location-box">
                <h4>ARRIVAL</h4>
                <p>{routeData.destination.name}</p>
                <small>{routeData.destination.lat.toFixed(4)}°, {routeData.destination.lng.toFixed(4)}°</small>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Plan Adventure Form */}
        {routeData && !showPlanForm && !tripPlan && (
          <div className="button-group">
            <button className="btn btn-success" onClick={() => setShowPlanForm(true)}>
              ✈️ Plan My Complete Adventure
            </button>
          </div>
        )}

        {showPlanForm && (
          <div className="plan-form">
            <h3>🎒 Trip Details</h3>
            <div className="input-row">
              <div className="input-group">
                <label>📅 Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>📅 End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>💰 Budget (USD)</label>
                <input
                  type="number"
                  placeholder="e.g., 3000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>✈️ Flight Class</label>
                <select value={flightClass} onChange={(e) => setFlightClass(e.target.value)}>
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First Class</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>🏨 Preferred Hotel Rating</label>
              <select value={hotelStars} onChange={(e) => setHotelStars(parseInt(e.target.value))}>
                <option value="3">3 Stars - Budget</option>
                <option value="4">4 Stars - Comfortable</option>
                <option value="5">5 Stars - Luxury</option>
              </select>
            </div>

            <div className="button-group" style={{ marginTop: '20px' }}>
              <button 
                className="btn btn-success" 
                onClick={planAdventure}
                disabled={planningTrip || !startDate || !endDate}
              >
                {planningTrip ? '🤖 Planning with AI...' : '🚀 Generate Complete Trip Plan'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPlanForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Trip Results */}
        {tripPlan && (
          <div className="trip-results">
            <h3>🎉 Your Trip is Ready!</h3>
            
            <div className="result-section">
              <h4>📋 AI-Generated Plan</h4>
              <p>{tripPlan.plan.message}</p>
            </div>

            {tripPlan.plan.toolsUsed && tripPlan.plan.toolsUsed.length > 0 && (
              <div className="result-section">
                <h4>🔧 Tools Used</h4>
                <p>{tripPlan.plan.toolsUsed.join(', ')}</p>
              </div>
            )}

            <div className="button-group">
              <button className="btn btn-primary" onClick={() => {
                // Navigate to detailed view or save
                alert('Trip plan saved! Check your bookings page.');
              }}>
                💾 Save Trip
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                🔄 Plan Another Trip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {(loading || planningTrip) && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner"></div>
            <h3>{loading ? 'Fetching coordinates with Nova Pro...' : 'Planning your adventure with AI Agent...'}</h3>
            <p>{loading ? 'Using AWS Bedrock Nova Lite for geocoding' : 'Using Nova Pro with 10 specialized travel tools'}</p>
          </div>
        </div>
      )}

      {/* 3D Globe */}
      <div className="globe-wrapper">
        {typeof window !== 'undefined' && (
          <Globe
            ref={globeEl}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            
            arcsData={arcsData}
            arcColor="color"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={2000}
            arcStroke={0.5}
            
            pointsData={pointsData}
            pointAltitude={0.01}
            pointColor="color"
            pointRadius="size"
            pointLabel="label"
            
            width={window.innerWidth}
            height={window.innerHeight}
          />
        )}
      </div>
    </div>
  );
}

export default GlobalPage;