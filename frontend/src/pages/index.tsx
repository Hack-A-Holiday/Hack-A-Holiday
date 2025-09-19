import { useState } from 'react';
import Head from 'next/head';

interface TripPreferences {
  destination: string;
  budget: number;
  duration: number;
  interests: string[];
  startDate: string;
  travelers: number;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: any;
  requestId: string;
  timestamp: string;
}

export default function Home() {
  const [preferences, setPreferences] = useState<TripPreferences>({
    destination: 'Paris, France',
    budget: 2000,
    duration: 5,
    interests: ['culture', 'food'],
    startDate: '2024-06-01',
    travelers: 2,
    travelStyle: 'mid-range',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableInterests = [
    'culture', 'history', 'museums', 'art', 'architecture',
    'food', 'nightlife', 'shopping', 'nature', 'hiking',
    'beaches', 'adventure', 'sports', 'photography',
    'music', 'festivals', 'local-experiences', 'wellness'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/plan-trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error?.message || 'Failed to create trip plan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <>
      <Head>
        <title>Autonomous Travel Companion</title>
        <meta name="description" content="AI-powered travel planning" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>
              🤖 Autonomous Travel Companion
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
              AI-powered trip planning with AWS Bedrock
            </p>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: '15px', 
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Destination
                  </label>
                  <input
                    type="text"
                    value={preferences.destination}
                    onChange={(e) => setPreferences(prev => ({ ...prev, destination: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    placeholder="e.g., Paris, France"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    value={preferences.budget}
                    onChange={(e) => setPreferences(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    min="100"
                    max="100000"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={preferences.duration}
                    onChange={(e) => setPreferences(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    min="1"
                    max="30"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Travelers
                  </label>
                  <input
                    type="number"
                    value={preferences.travelers}
                    onChange={(e) => setPreferences(prev => ({ ...prev, travelers: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    min="1"
                    max="20"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={preferences.startDate}
                    onChange={(e) => setPreferences(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Travel Style
                  </label>
                  <select
                    value={preferences.travelStyle}
                    onChange={(e) => setPreferences(prev => ({ ...prev, travelStyle: e.target.value as any }))}
                    style={{ 
                      width: '100%', 
                      padding: '12px 15px', 
                      border: '2px solid #e1e5e9', 
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="budget">Budget</option>
                    <option value="mid-range">Mid-range</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '15px', fontWeight: '600' }}>
                  Interests (select multiple)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {availableInterests.map((interest) => (
                    <label key={interest} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={preferences.interests.includes(interest)}
                        onChange={() => handleInterestToggle(interest)}
                      />
                      <span style={{ textTransform: 'capitalize' }}>
                        {interest.replace('-', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || preferences.interests.length === 0}
                style={{
                  width: '100%',
                  background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  fontSize: '18px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '🤖 Planning your trip...' : '✈️ Plan My Trip'}
              </button>
            </form>

            {error && (
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: '#f8d7da', 
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                color: '#721c24'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                background: '#d4edda', 
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                color: '#155724'
              }}>
                <h3 style={{ marginBottom: '15px' }}>🎉 Trip Plan Created Successfully!</h3>
                <p><strong>Trip ID:</strong> {result.data.tripId}</p>
                <p><strong>Destination:</strong> {result.data.itinerary.destination}</p>
                <p><strong>Status:</strong> {result.data.itinerary.status}</p>
                <p><strong>Message:</strong> {result.data.message}</p>
                {result.data.s3Url && (
                  <p>
                    <strong>Itinerary:</strong>{' '}
                    <a 
                      href={result.data.s3Url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#0066cc', textDecoration: 'underline' }}
                    >
                      View Details
                    </a>
                  </p>
                )}
              </div>
            )}

            <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '15px' }}>⚙️ Configuration</h3>
              <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not configured'}</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                To configure the API URL, create a <code>.env.local</code> file with:<br/>
                <code>NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev</code>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}