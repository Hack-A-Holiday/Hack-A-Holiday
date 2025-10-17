import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../components/layout/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Swal from 'sweetalert2';

// Utility function to render formatted text (bold support)
// Helper to render inline bold within text
const renderInlineBold = (text: string) => {
  if (!text || typeof text !== 'string') return text;
  
  // Handle multiple markdown patterns
  const patterns = [
    // Bold text: **text**
    { regex: /(\*\*)(.*?)\1/g, replacement: (match: string, p1: string, p2: string) => `<strong>${p2}</strong>` },
    // Italic text: *text*
    { regex: /(\*)([^*]+)\1/g, replacement: (match: string, p1: string, p2: string) => `<em>${p2}</em>` },
    // Bold text: __text__
    { regex: /(__)(.*?)\1/g, replacement: (match: string, p1: string, p2: string) => `<strong>${p2}</strong>` },
    // Italic text: _text_
    { regex: /(_)([^_]+)\1/g, replacement: (match: string, p1: string, p2: string) => `<em>${p2}</em>` }
  ];
  
  let processedText = text;
  
  // Apply all patterns
  patterns.forEach(pattern => {
    processedText = processedText.replace(pattern.regex, pattern.replacement);
  });
  
  // Split by HTML tags and render
  const parts = processedText.split(/(<strong>.*?<\/strong>|<em>.*?<\/em>)/g);
  
  return parts.map((part, idx) => {
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      return <strong key={idx} style={{ fontWeight: 'bold' }}>{part.replace(/<\/?strong>/g, '')}</strong>;
    } else if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return <em key={idx} style={{ fontStyle: 'italic' }}>{part.replace(/<\/?em>/g, '')}</em>;
    }
    return <span key={idx}>{part}</span>;
  });
};

// Helper to render markdown headers and formatting
const renderMarkdownText = (text: string) => {
  if (!text || typeof text !== 'string') return text;
  
  // Split by lines to handle headers
  const lines = text.split('\n');
  
  return lines.map((line, lineIdx) => {
    // Handle headers
    if (line.startsWith('### ')) {
      return (
        <div key={lineIdx} style={{ 
          fontSize: '1.3rem', 
          fontWeight: 'bold', 
          margin: '16px 0 8px 0',
          color: '#2563eb',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '4px'
        }}>
          {renderInlineBold(line.replace('### ', ''))}
        </div>
      );
    } else if (line.startsWith('#### ')) {
      return (
        <div key={lineIdx} style={{ 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          margin: '12px 0 6px 0',
          color: '#374151'
        }}>
          {renderInlineBold(line.replace('#### ', ''))}
        </div>
      );
    } else if (line.startsWith('## ')) {
      return (
        <div key={lineIdx} style={{ 
          fontSize: '1.4rem', 
          fontWeight: 'bold', 
          margin: '20px 0 10px 0',
          color: '#1d4ed8',
          borderBottom: '3px solid #d1d5db',
          paddingBottom: '6px'
        }}>
          {renderInlineBold(line.replace('## ', ''))}
        </div>
      );
    } else if (line.startsWith('# ')) {
      return (
        <div key={lineIdx} style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          margin: '24px 0 12px 0',
          color: '#1e40af'
        }}>
          {renderInlineBold(line.replace('# ', ''))}
        </div>
      );
    } else if (line.startsWith('- ')) {
      return (
        <div key={lineIdx} style={{ 
          margin: '4px 0',
          paddingLeft: '16px',
          position: 'relative'
        }}>
          <span style={{ position: 'absolute', left: '0', color: '#6b7280' }}>•</span>
          <span style={{ marginLeft: '8px' }}>{renderInlineBold(line.replace('- ', ''))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      return <div key={lineIdx} style={{ height: '8px' }} />;
    } else {
      return (
        <div key={lineIdx} style={{ margin: '4px 0', lineHeight: '1.6' }}>
          {renderInlineBold(line)}
        </div>
      );
    }
  });
};

const renderFormattedText = (text: string | any) => {
  if (typeof text !== 'string') return text;
  
  // First, detect and extract Google Flights links for button rendering
  // Patterns to match:
  // 0. [GOOGLE_FLIGHTS_BUTTON]url[/GOOGLE_FLIGHTS_BUTTON] - New button marker
  // 1. "Need more options? Search on Google Flights: https://..."
  // 2. "Search more options:\n- Barcelona: https://...\n- Madrid: https://..."
  const googleFlightsButtons: Array<{city: string; url: string}> = [];
  let textWithoutGoogleFlights = text;
  
  // Pattern 0: Button marker from backend (HIGHEST PRIORITY)
  // Match: - Barcelona: [GOOGLE_FLIGHTS_BUTTON]https://....[/GOOGLE_FLIGHTS_BUTTON]
  const buttonMarkerWithCityPattern = /-\s*([^:]+):\s*\[GOOGLE_FLIGHTS_BUTTON\](https?:\/\/[^^\]]+)\[\/GOOGLE_FLIGHTS_BUTTON\]/gi;
  let cityMarkerMatch;
  
  // First try to match with city labels (multi-destination format)
  while ((cityMarkerMatch = buttonMarkerWithCityPattern.exec(text)) !== null) {
    googleFlightsButtons.push({
      city: cityMarkerMatch[1].trim(),
      url: cityMarkerMatch[2]
    });
    textWithoutGoogleFlights = textWithoutGoogleFlights.replace(cityMarkerMatch[0], '').trim();
  }
  
  // If no city-labeled buttons found, try simple format (single destination)
  if (googleFlightsButtons.length === 0) {
    // More permissive pattern - allow any characters in URL including +, =, etc.
    const simpleButtonPattern = /\[GOOGLE_FLIGHTS_BUTTON\](https?:\/\/[^\]]+)\[\/GOOGLE_FLIGHTS_BUTTON\]/gi;
    let simpleMatch;
    while ((simpleMatch = simpleButtonPattern.exec(text)) !== null) {
      googleFlightsButtons.push({
        city: 'Search on Google Flights',
        url: simpleMatch[1]
      });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(simpleMatch[0], '').trim();
    }
  }

  // If button marker NOT found, try other patterns as fallback
  if (googleFlightsButtons.length === 0) {
    // New: Pattern A - Markdown single link: "Search on Google Flights: [Click here](https://www.google.com/travel/flights...)"
    const markdownSinglePattern = /Search on Google Flights:\s*\[.*?\]\((https:\/\/www\.google\.com\/travel\/flights[^)]+)\)/i;
    const mdSingleMatch = text.match(markdownSinglePattern);
    if (mdSingleMatch) {
      googleFlightsButtons.push({ city: 'Search on Google Flights', url: mdSingleMatch[1] });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(mdSingleMatch[0], '').trim();
    }

    // New: Pattern B - Multiple markdown links under a list
    const markdownMultiPattern = /(?:Search more options:|Need more options\?)?\s*\n((?:\s*-\s*[^:]+:\s*\[.*?\]\(https:\/\/www\.google\.com\/travel\/flights[^)]+\)\n?)+)/i;
    const mdMultiMatch = text.match(markdownMultiPattern);
    if (mdMultiMatch && !mdSingleMatch) {
      const cityMdPattern = /-\s*([^:]+):\s*\[.*?\]\((https:\/\/www\.google\.com\/travel\/flights[^)]+)\)/gi;
      let cityMd;
      while ((cityMd = cityMdPattern.exec(mdMultiMatch[1])) !== null) {
        googleFlightsButtons.push({ city: cityMd[1].trim(), url: cityMd[2] });
      }
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(mdMultiMatch[0], '').trim();
    }

    // Pattern 1: Single link after "Need more options?"
    const singleLinkPattern = /Need more options\?\s*Search on Google Flights:\s*(https:\/\/www\.google\.com\/travel\/flights[^\s]+)/i;
    const singleMatch = text.match(singleLinkPattern);
    if (singleMatch && googleFlightsButtons.length === 0) {
      googleFlightsButtons.push({ city: 'Search on Google Flights', url: singleMatch[1] });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(singleLinkPattern, '').trim();
    }

    // Pattern 2: Multiple links with city names (flexible list format)
    const multiLinkPattern = /(?:Search more options:|Need more options\?)?\s*\n((?:\s*-\s*[^:]+:\s*https:\/\/www\.google\.com\/travel\/flights[^\n]+\n?)+)/i;
    const multiMatch = text.match(multiLinkPattern);
    if (multiMatch && !singleMatch) {
      const cityUrlPattern = /-\s*([^:]+):\s*(https:\/\/www\.google\.com\/travel\/flights[^\s\n]+)/gi;
      let cityMatch;
      while ((cityMatch = cityUrlPattern.exec(multiMatch[1])) !== null) {
        googleFlightsButtons.push({ city: cityMatch[1].trim(), url: cityMatch[2] });
      }
      textWithoutGoogleFlights = text.replace(multiMatch[0], '').trim();
    }
  }

  // Pattern 3: Fallback - catch ANY line with city and Google Flights URL
  if (googleFlightsButtons.length === 0) {
    const fallbackPattern = /-\s*([^:]+):\s*(https:\/\/www\.google\.com\/travel\/flights[^\s\n]+)/gi;
    let fallbackMatch;
    while ((fallbackMatch = fallbackPattern.exec(text)) !== null) {
      googleFlightsButtons.push({ city: fallbackMatch[1].trim(), url: fallbackMatch[2] });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(fallbackMatch[0], '').trim();
    }
  }

  // Use the new markdown renderer for the main text
  return (
    <>
      {renderMarkdownText(textWithoutGoogleFlights)}
      
      {/* Render Google Flights buttons */}
      {googleFlightsButtons.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px',
          borderTop: '2px solid rgba(102, 126, 234, 0.2)',
          paddingTop: '16px'
        }}>
          <div style={{ 
            fontSize: '0.9rem', 
            fontWeight: '600', 
            color: '#667eea',
            marginBottom: '4px'
          }}>
            🔍 Search More Options
          </div>
          {googleFlightsButtons.map((btn, idx) => (
            <a
              key={idx}
              href={btn.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #4285f4 0%, #357ae8 100%)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 4px 16px rgba(66, 133, 244, 0.35)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(66, 133, 244, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(66, 133, 244, 0.35)';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16V8C21 7.45 20.55 7 20 7H13L11 5H4C3.45 5 3 5.45 3 6V18C3 18.55 3.45 19 4 19H20C20.55 19 21 18.55 21 18V16ZM8 13L10.5 15.5L14.5 10L18.5 15H5.5L8 13Z" fill="white"/>
              </svg>
              ✈️ View {btn.city} on Google Flights
            </a>
          ))}
        </div>
      )}
    </>
  );
};

// Parse plain text itinerary into structured format
const parseTextItinerary = (text: string): any[] | null => {
  if (!text) return null;
  
  const dayRegex = /Day\s+(\d+)\s*\n\s*([^\n]+)\s*\n\s*🎯\s*Activities:\s*([\s\S]*?)(?=Day\s+\d+|$)/gi;
  const days = [];
  let match;
  
  while ((match = dayRegex.exec(text)) !== null) {
    const dayNumber = parseInt(match[1]);
    const dayTitle = match[2].trim();
    const activitiesText = match[3].trim();
    
    // Parse activities (split by newlines and clean up)
    const activities = activitiesText
      .split('\n')
      .map(activity => activity.trim())
      .filter(activity => activity.length > 0)
      .map(activity => ({
        name: activity.replace(/^[•\-\*]\s*/, ''), // Remove bullet points
        description: activity
      }));
    
    days.push({
      day: dayNumber,
      title: dayTitle,
      activities: activities
    });
  }
  
  return days.length > 0 ? days : null;
};

// Itinerary Content Component with Enhanced UI
const ItineraryContent: React.FC<{ content: any; role: string; isDarkMode?: boolean }> = ({ content, role, isDarkMode = false }) => {
  // Parse plain text itinerary if it exists
  const parsedItinerary = content.aiResponse ? parseTextItinerary(content.aiResponse) : null;
  
  return (
    <div style={{ width: '100%' }}>
      {/* AI Response Text - always show if available, but use formatted text */}
      {content.aiResponse && (
        <div style={{ 
          marginBottom: '20px',
          whiteSpace: 'pre-wrap',
          fontSize: '16px',
          lineHeight: '1.6',
          color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#333')
        }}>
          {renderFormattedText(content.aiResponse)}
        </div>
      )}
      
      {/* Flight Recommendations */}
      {content.flights && (
        <FlightRecommendations flights={content.flights} role={role} isDarkMode={isDarkMode} />
      )}
      
      {/* Hotel Recommendations */}
      {content.hotels && (
        <HotelRecommendations hotels={content.hotels} role={role} isDarkMode={isDarkMode} />
      )}
      
      
      {/* Daily Itinerary - use parsed if available */}
      {(content.dailyItinerary || content.dailyPlans || parsedItinerary) && (
        <DailyItinerary 
          dailyData={content.dailyItinerary || content.dailyPlans || parsedItinerary} 
          role={role}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};


// Hotel Recommendations Component
const HotelRecommendations: React.FC<{ hotels: any; role: string; isDarkMode?: boolean }> = ({ hotels, role, isDarkMode = false }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>🏨</span>
      <span>Hotel Recommendations</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {hotels.slice(0, 3).map((hotel: any, idx: number) => (
        <div key={idx} style={{
          padding: '12px',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderRadius: '8px',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {hotel.name}
          </div>
          <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
            {hotel.rating && `⭐ ${hotel.rating} • `}{hotel.price && `$${hotel.price}/night • `}{hotel.location}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Flight Recommendations Component
const FlightRecommendations: React.FC<{ flights: any[]; role: string; isDarkMode?: boolean; googleFlightsUrl?: string; origin?: string; destination?: string; depDate?: string; retDate?: string }> = ({ flights, role, isDarkMode = false, googleFlightsUrl, origin, destination, depDate, retDate }) => {
  const router = useRouter();
  
  const handleExploreMore = () => {
    // Redirect to flight search page with the dates
    const searchParams = new URLSearchParams();
    if (origin) searchParams.set('origin', origin);
    if (destination) searchParams.set('destination', destination);
    if (depDate) searchParams.set('departureDate', depDate);
    if (retDate) searchParams.set('returnDate', retDate);
    
    router.push(`/flight-search?${searchParams.toString()}`);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>✈️</span>
        <span>Flight Recommendations</span>
      </div>
      
      <div style={{ marginBottom: '16px', fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
        Based on your preferences, here are the best flight options:
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {flights.slice(0, 3).map((flight: any, idx: number) => (
          <div key={idx} style={{
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            borderRadius: '12px',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
            padding: '16px',
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50')
              }}>
                {idx + 1}. {flight.airline} ({flight.flightNumber})
              </h3>
              <div style={{ 
                fontWeight: '700', 
                fontSize: '1.2rem', 
                color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50') 
              }}>
                ${flight.price}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Route:</strong> {flight.origin} → {flight.destination}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Duration:</strong> {flight.duration}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Departure:</strong> {new Date(flight.departureTime).toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Arrival:</strong> {new Date(flight.arrivalTime).toLocaleString()}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Stops:</strong> {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
              </div>
            </div>
            
            <a
              href={googleFlightsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#1d4ed8',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
            >
              ✈️ Book {flight.airline} {flight.flightNumber}
            </a>
          </div>
        ))}
      </div>
      
      <button
        onClick={handleExploreMore}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#059669',
          color: 'white',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#047857';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#059669';
        }}
      >
        🔍 Explore More Options
      </button>
    </div>
  );
};

// Attractions Recommendations Component
const AttractionsRecommendations: React.FC<{ attractions: any[]; role: string; isDarkMode?: boolean; tripAdvisorUrl?: string; destination?: string }> = ({ attractions, role, isDarkMode = false, tripAdvisorUrl, destination }) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🏛️</span>
        <span>Nearby Attractions</span>
      </div>
      
      <div style={{ marginBottom: '16px', fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
        Discover the best attractions in {destination}:
      </div>
      
      {tripAdvisorUrl && (
        <div style={{ marginBottom: '16px' }}>
          <a
            href={tripAdvisorUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#00a680',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#008f6b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00a680';
            }}
          >
            🔍 Explore More on TripAdvisor
          </a>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {attractions.slice(0, 3).map((attraction: any, idx: number) => (
          <div key={idx} style={{
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
            borderRadius: '12px',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
            overflow: 'hidden',
            boxShadow: isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = isDarkMode ? '0 8px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
          }}
          >
            {/* Attraction Image Placeholder */}
            <div style={{
              height: '200px',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#ccc'
            }}>
              {attraction.photo_url ? (
                <img 
                  src={attraction.photo_url} 
                  alt={attraction.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                '🏛️'
              )}
            </div>
            
            {/* Attraction Content */}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.1rem', 
                  fontWeight: '600', 
                  color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'),
                  lineHeight: '1.3'
                }}>
                  {attraction.name}
                </h3>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '1rem', 
                    color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50') 
                  }}>
                    {attraction.category}
                  </div>
                </div>
              </div>
              
              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <span style={{ color: '#ffc107', fontSize: '14px' }}>⭐</span>
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '500', 
                  color: role === 'user' ? 'rgba(255,255,255,0.9)' : (isDarkMode ? 'rgba(255,255,255,0.8)' : '#666') 
                }}>
                  {attraction.rating}/5
                </span>
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: role === 'user' ? 'rgba(255,255,255,0.6)' : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#999') 
                }}>
                  ({attraction.review_count || 'N/A'} reviews)
                </span>
              </div>
              
              {/* Address */}
              <div style={{ 
                fontSize: '0.9rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'),
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📍 {attraction.address || 'Address not specified'}
              </div>
              
              {/* Description */}
              {attraction.description && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'),
                  lineHeight: '1.4',
                  marginBottom: '12px'
                }}>
                  {attraction.description.length > 100 ? `${attraction.description.substring(0, 100)}...` : attraction.description}
                </div>
              )}
              
              {/* View on TripAdvisor Button */}
              {attraction.web_url && (
                <a
                  href={attraction.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#00a680',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#008f6b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#00a680';
                  }}
                >
                  View on TripAdvisor
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hotel Cards Component (similar to search pages)
const HotelCards: React.FC<{ hotels: any[]; role: string; isDarkMode?: boolean; bookingUrl?: string }> = ({ hotels, role, isDarkMode = false, bookingUrl }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>🏨</span>
      <span>Hotel Recommendations</span>
    </div>
    
    {bookingUrl && (
      <div style={{ marginBottom: '16px' }}>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#1d4ed8',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8';
          }}
        >
          🏨 Search More Hotels on Booking.com
        </a>
      </div>
    )}
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
      {hotels.slice(0, 3).map((hotel: any, idx: number) => (
        <div key={idx} style={{
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
          overflow: 'hidden',
          boxShadow: isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDarkMode ? '0 8px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
        }}
        >
          {/* Hotel Image Placeholder */}
          <div style={{
            height: '200px',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#ccc'
          }}>
            🏨
          </div>
          
          {/* Hotel Content */}
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'),
                lineHeight: '1.3'
              }}>
                {hotel.name}
              </h3>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '1.2rem', 
                  color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50') 
                }}>
                  ${hotel.price}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: role === 'user' ? 'rgba(255,255,255,0.7)' : (isDarkMode ? 'rgba(255,255,255,0.6)' : '#888') 
                }}>
                  per night
                </div>
              </div>
            </div>
            
            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <span style={{ color: '#ffc107', fontSize: '14px' }}>⭐</span>
              <span style={{ 
                fontSize: '0.9rem', 
                fontWeight: '500', 
                color: role === 'user' ? 'rgba(255,255,255,0.9)' : (isDarkMode ? 'rgba(255,255,255,0.8)' : '#666') 
              }}>
                {hotel.rating}/5
              </span>
              <span style={{ 
                fontSize: '0.8rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.6)' : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#999') 
              }}>
                ({hotel.review_count || 'N/A'} reviews)
              </span>
            </div>
            
            {/* Location */}
            <div style={{ 
              fontSize: '0.9rem', 
              color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'),
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              📍 {hotel.location || hotel.address || 'Location not specified'}
            </div>
            
            {/* Amenities */}
            {hotel.amenities && hotel.amenities.length > 0 && (
              <div style={{ 
                fontSize: '0.8rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.7)' : (isDarkMode ? 'rgba(255,255,255,0.6)' : '#888'),
                marginBottom: '12px'
              }}>
                {hotel.amenities.slice(0, 3).join(' • ')}
                {hotel.amenities.length > 3 && ` +${hotel.amenities.length - 3} more`}
              </div>
            )}
            
            {/* Description */}
            {hotel.description && (
              <div style={{ 
                fontSize: '0.85rem', 
                color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'),
                lineHeight: '1.4',
                marginBottom: '12px'
              }}>
                {hotel.description.length > 100 ? `${hotel.description.substring(0, 100)}...` : hotel.description}
              </div>
            )}
            
            {/* Book Now Button */}
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1e40af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
            >
              View on Booking.com
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Daily Itinerary Component with Enhanced UI
const DailyItinerary: React.FC<{ dailyData: any[]; role: string; isDarkMode?: boolean }> = ({ dailyData, role, isDarkMode = false }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50'), display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>📋</span>
      <span>Daily Itinerary</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {dailyData.map((day: any, idx: number) => (
        <div key={idx} style={{
          padding: '16px',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '12px',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '8px', color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#2c3e50') }}>
            Day {day.day}: {renderFormattedText(day.title)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {day.activities.map((activity: any, actIdx: number) => (
              <div key={actIdx} style={{
                padding: '8px 12px',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderRadius: '6px',
                fontSize: '14px',
                color: role === 'user' ? 'rgba(255,255,255,0.9)' : (isDarkMode ? 'rgba(255,255,255,0.8)' : '#555')
              }}>
                • {renderFormattedText(activity.name || activity)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | Record<string, any>;
  timestamp: number;
  type?: 'text' | 'recommendation' | 'link' | 'itinerary' | 'hotel_cards' | 'flight_recommendations' | 'attractions_recommendations';
  data?: any;
}

interface Recommendation {
  type: 'destination' | 'flight' | 'hotel';
  title: string;
  description: string;
  link?: string;
  price?: string;
  rating?: number;
  image?: string;
}

export default function AIAssistant() {
  const { isDarkMode } = useDarkMode();
  const { state } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    // Debug auth state
    console.log('AI Assistant - Auth State:', {
      hasUser: !!state.user,
      hasToken: !!state.token,
      userName: state.user?.name,
      userEmail: state.user?.email
    });

    // Check screen size
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    // Initialize conversation only if user is present
    if (state.user) {
      initializeConversation();
    }

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [state.user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = () => {
    // Check for messages or itinerary data from URL query parameters
    let initialMessages: ChatMessage[] = [];
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const messagesStr = params.get('messages');
      const itineraryStr = params.get('itinerary');
      const convId = params.get('conversationId');
      
      if (convId) {
        setConversationId(convId);
      }
      
      if (messagesStr) {
        // Multi-message response from trip planning
        console.log('Found messages in URL:', messagesStr);
        try {
          const messages = JSON.parse(messagesStr);
          console.log('Parsed messages:', messages);
          console.log('Number of messages:', messages.length);
          initialMessages = messages.map((msg: any, index: number) => ({
            id: msg.id || `msg_${Date.now()}_${index}`,
            role: msg.role || 'assistant',
            content: msg.content,
            timestamp: msg.timestamp || Date.now(),
            type: msg.type || 'text',
            data: msg.data
          }));
          console.log('Mapped initial messages:', initialMessages);
        } catch (e) {
          console.error('Error parsing messages:', e);
        }
      } else if (itineraryStr) {
        // Single itinerary response (backward compatibility)
        try {
          const itineraryObj = JSON.parse(itineraryStr);
          // Convert itinerary object to formatted text for display in chat
          let itineraryText = `🎉 Here's your personalized travel itinerary!\n\n`;
          
          if (itineraryObj.aiResponse) {
            itineraryText += itineraryObj.aiResponse;
          } else {
            // Fallback: create a basic itinerary from the object
            itineraryText += `**Trip Details:**\n`;
            if (itineraryObj.destination) {
              itineraryText += `📍 Destination: ${itineraryObj.destination}\n`;
            }
            if (itineraryObj.duration) {
              itineraryText += `⏱️ Duration: ${itineraryObj.duration} days\n`;
            }
            if (itineraryObj.budget) {
              itineraryText += `💰 Budget: $${itineraryObj.budget}\n`;
            }
            itineraryText += `\nI've prepared a detailed itinerary for your trip. Feel free to ask me any questions about your travel plans!`;
          }
          
          initialMessages = [{ 
            role: 'assistant', 
            content: itineraryText, 
            timestamp: Date.now(),
            id: `msg_${Date.now()}_itinerary`,
            type: 'text'
          }];
        } catch (e) {
          console.error('Error parsing itinerary:', e);
        }
      }
    }

    // If no conversation ID set, create a new one
    if (!conversationId) {
      const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(convId);
    }

    // Set initial messages
    console.log('Setting initial messages. Count:', initialMessages.length);
    if (initialMessages.length > 0) {
      // We have messages from trip planning - use them directly
      console.log('Setting messages from trip planning:', initialMessages);
      setMessages(initialMessages);
    } else {
      // No initial messages - show welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `👋 Hello ${state.user?.name || 'there'}! I'm your AI Travel Assistant.

I can help you with:
✈️ **Flight Search** - Real-time flight availability and pricing from our API
🏨 **Hotel Search** - Live hotel recommendations with real-time data
🌍 **Destination Ideas** - Personalized travel recommendations based on your preferences
🎯 **Trip Planning** - Complete itinerary creation with context-aware AI
💰 **Budget Optimization** - Get the most value for your money
🧠 **Smart Context** - I remember our conversation and your preferences

Just tell me what you're looking for, and I'll search real-time data and use AI to plan your perfect trip!`,
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build messages array with conversation history for context
      const messagesForAPI = [
        ...messages
          .filter(m => m.role !== 'system') // Exclude system messages
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
        { role: 'user', content: inputMessage }
      ];

      // Call Integrated AI Travel Agent via /api/ai/chat
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      console.log('Calling API:', `${apiUrl}/api/ai/chat`);
      console.log('Token:', state.token ? 'Present' : 'Missing');
      
      const response = await fetch(`${apiUrl}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include', // Send cookies with request
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          messages: messagesForAPI, // Send full conversation history
          conversationId: conversationId,
          preferences: state.user?.preferences || {},
          userContext: {
            userId: state.user?.id || 'anonymous',
            email: state.user?.email,
            name: state.user?.name,
            sessionId: conversationId
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      console.log('Backend response:', data); // Debug log

      // Handle multi-message response (trip planning) or single message
      if (data.success && data.data?.response && Array.isArray(data.data.response)) {
        // Multiple messages (trip planning)
        const aiMessages: ChatMessage[] = data.data.response.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          role: msg.role || 'assistant',
          content: msg.content || '',
          timestamp: msg.timestamp || Date.now(),
          type: msg.type || 'text',
          data: msg.data
        }));
        
        // Update conversation ID if returned from backend
        if (data.data?.conversationId && data.data.conversationId !== conversationId) {
          setConversationId(data.data.conversationId);
        }
        
        setMessages(prev => [...prev, ...aiMessages]);
      } else {
        // Single message (regular chat)
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.success ? (data.data?.response || data.message) : (data.message || 'I apologize, but I encountered an error.'),
          timestamp: Date.now(),
          type: data.data?.recommendations?.length > 0 ? 'recommendation' : 'text',
          data: {
            recommendations: data.data?.recommendations || [],
            realData: data.data?.realData,
            intent: data.data?.intent,
            conversationId: data.data?.conversationId,
            sessionId: data.data?.conversationId
          }
        };

        // Update conversation ID if returned from backend
        if (data.data?.conversationId && data.data.conversationId !== conversationId) {
          setConversationId(data.data.conversationId);
        }

        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      console.error('API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.error('Token available:', !!state.token);
      console.error('User:', state.user);
      
      // Show actual error instead of fallback for debugging
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Connection Error: Unable to reach the AI Travel Agent.\n\nPlease check:\n• Backend server is running (port 4000)\n• Network connection is active\n• You are logged in\n\nAPI endpoint: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/ai/chat\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry refreshing the page and logging in again.`,
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackResponse = (userInput: string): ChatMessage => {
    const input = userInput.toLowerCase();

    // Detect intent
    if (input.includes('flight') || input.includes('fly')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I can help you find flights! 🛫

Based on your preferences, here are some options:`,
        timestamp: Date.now(),
        type: 'recommendation',
        data: {
          recommendations: [
            {
              type: 'flight',
              title: 'Economy Flight to Paris',
              description: 'Direct flight with great timing',
              price: '$450',
              link: 'https://www.skyscanner.com',
              rating: 4.5
            },
            {
              type: 'flight',
              title: 'Business Class to Tokyo',
              description: 'Comfortable with lounge access',
              price: '$2,100',
              link: 'https://www.skyscanner.com',
              rating: 4.8
            }
          ]
        }
      };
    }

    if (input.includes('hotel') || input.includes('accommodation')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Here are some hotel recommendations for you! 🏨`,
        timestamp: Date.now(),
        type: 'recommendation',
        data: {
          recommendations: [
            {
              type: 'hotel',
              title: 'Luxury Resort & Spa',
              description: 'Beachfront property with amazing views',
              price: '$180/night',
              link: 'https://www.booking.com',
              rating: 4.7
            },
            {
              type: 'hotel',
              title: 'Downtown Business Hotel',
              description: 'Modern amenities in city center',
              price: '$120/night',
              link: 'https://www.booking.com',
              rating: 4.3
            }
          ]
        }
      };
    }

    if (input.includes('destination') || input.includes('where') || input.includes('recommend')) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Based on your preferences, I recommend these destinations! 🌍`,
        timestamp: Date.now(),
        type: 'recommendation',
        data: {
          recommendations: [
            {
              type: 'destination',
              title: 'Bali, Indonesia',
              description: 'Tropical paradise with beautiful beaches and rich culture',
              link: 'https://www.lonelyplanet.com/indonesia/bali',
              rating: 4.8
            },
            {
              type: 'destination',
              title: 'Paris, France',
              description: 'City of lights with iconic landmarks and cuisine',
              link: 'https://www.lonelyplanet.com/france/paris',
              rating: 4.9
            },
            {
              type: 'destination',
              title: 'Tokyo, Japan',
              description: 'Blend of traditional and modern culture',
              link: 'https://www.lonelyplanet.com/japan/tokyo',
              rating: 4.7
            }
          ]
        }
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I understand you're interested in travel! I can help you with:

🎯 **Destination Recommendations** - Tell me your interests
✈️ **Flight Bookings** - Share your travel dates
🏨 **Hotel Suggestions** - Let me know your preferences
💰 **Budget Planning** - I'll find the best deals

What would you like to explore?`,
      timestamp: Date.now(),
      type: 'text'
    };
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '16px',
          animation: 'fadeIn 0.3s ease-in'
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? '85%' : '70%',
            padding: '12px 16px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : (isDarkMode ? 'rgba(30, 30, 30, 0.8)' : '#f0f2f5'),
            color: isUser ? 'white' : (isDarkMode ? '#e0e0e0' : '#333'),
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
            wordBreak: 'break-word',
            border: isDarkMode && !isUser ? '1px solid rgba(255,255,255,0.1)' : 'none'
          }}
        >
          {message.type === 'recommendation' && message.data?.recommendations ? (
            <div>
              <div style={{ marginBottom: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {renderFormattedText(message.content)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {message.data.recommendations.map((rec: Recommendation, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: isDarkMode ? 'rgba(50, 50, 50, 0.6)' : 'white',
                      padding: '16px',
                      borderRadius: '12px',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
                      color: isDarkMode ? '#e0e0e0' : '#333'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: isDarkMode ? '#8b9cff' : '#667eea' }}>
                        {rec.type === 'flight' && '✈️ '}
                        {rec.type === 'hotel' && '🏨 '}
                        {rec.type === 'destination' && '🌍 '}
                        {rec.title}
                      </h4>
                      {rec.rating && (
                        <span style={{ fontSize: '0.85rem', color: '#ffc107' }}>
                          ⭐ {rec.rating}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '0.9rem', color: isDarkMode ? '#ccc' : '#666' }}>
                      {rec.description}
                    </p>
                    {rec.price && (
                      <p style={{ margin: '8px 0', fontSize: '1rem', fontWeight: 'bold', color: isDarkMode ? '#66ff99' : '#28a745' }}>
                        {rec.price}
                      </p>
                    )}
                    {rec.link && (
                      <a
                        href={rec.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: '8px',
                          padding: '8px 16px',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : message.type === 'hotel_cards' && message.data?.hotels ? (
            <HotelCards 
              hotels={message.data.hotels} 
              role={message.role} 
              isDarkMode={isDarkMode} 
              bookingUrl={message.data.bookingUrl}
            />
          ) : message.type === 'flight_recommendations' && message.data?.flights ? (
            <FlightRecommendations 
              flights={message.data.flights} 
              role={message.role} 
              isDarkMode={isDarkMode} 
              googleFlightsUrl={message.data.googleFlightsUrl}
              origin={message.data.origin}
              destination={message.data.destination}
              depDate={message.data.depDate}
              retDate={message.data.retDate}
            />
          ) : message.type === 'attractions_recommendations' && message.data?.attractions ? (
            <AttractionsRecommendations 
              attractions={message.data.attractions} 
              role={message.role} 
              isDarkMode={isDarkMode} 
              tripAdvisorUrl={message.data.tripAdvisorUrl}
              destination={message.data.destination}
            />
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{renderFormattedText(message.content)}</div>
          )}
          <div
            style={{
              fontSize: '0.7rem',
              opacity: 0.7,
              marginTop: '8px',
              textAlign: 'right'
            }}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    );
  };

  const suggestedPrompts = [
    "🌴 Suggest beach destinations for my budget",
    "✈️ Find cheap flights to Europe",
    "🏨 Recommend luxury hotels in Bali",
    "🎯 Plan a 7-day trip to Japan"
  ];

  const handlePromptClick = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleStartChat = () => {
    setShowChat(true);
    // Initialize conversation when starting chat
    if (state.user) {
      initializeConversation();
    }
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>AI Travel Assistant - HackTravel</title>
        <meta name="description" content="Get personalized travel recommendations powered by AI" />
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        position: 'relative'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0
        }}>
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '200px',
            height: '200px',
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite reverse'
          }} />
        </div>

        <Navbar />

        {!showChat ? (
          /* Welcome Screen */
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 80px)',
            padding: isMobile ? '20px 16px' : '40px 24px'
          }}>
            <div style={{
              textAlign: 'center',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {/* AI Icon */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '32px',
                boxShadow: '0 25px 50px rgba(102, 126, 234, 0.4)',
                marginBottom: '40px',
                animation: 'pulse 3s ease-in-out infinite alternate'
              }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H14L20 9H21ZM17.5 12C17.78 12 18 12.22 18 12.5V18.5C18 18.78 17.78 19 17.5 19H14.5C14.22 19 14 18.78 14 18.5V12.5C14 12.22 14.22 12 14.5 12H17.5ZM16 10.5C16.83 10.5 17.5 11.17 17.5 12H14.5C14.5 11.17 15.17 10.5 16 10.5Z"/>
                </svg>
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: isMobile ? '3rem' : '4.5rem',
                fontWeight: '900',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0 0 24px 0',
                letterSpacing: '-0.02em',
                lineHeight: '1.1'
              }}>
                AI Travel Assistant
              </h1>

              {/* Description */}
              <p style={{
                fontSize: isMobile ? '1.2rem' : '1.5rem',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                margin: '0 auto 48px auto',
                maxWidth: '700px',
                lineHeight: '1.6',
                fontWeight: '400'
              }}>
                Your intelligent travel companion powered by advanced AI. 
                Plan trips, discover destinations, and get personalized recommendations.
              </p>

              {/* Start Chat Button */}
              <button
                onClick={handleStartChat}
                style={{
                  padding: isMobile ? '18px 40px' : '24px 48px',
                  fontSize: isMobile ? '1.1rem' : '1.3rem',
                  fontWeight: '700',
                  color: 'white',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: '200% 200%',
                  backgroundPosition: '100% 100%',
                  border: 'none',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  transition: 'background-position 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, transform 0.3s ease',
                  boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transform: 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #5b68e6 30%, #8b5cf6 70%, #9333ea 100%)';
                  e.currentTarget.style.backgroundSize = '200% 200%';
                  e.currentTarget.style.backgroundPosition = '0% 0%';
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(139, 92, 246, 0.6)';
                  e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  e.currentTarget.style.backgroundSize = '200% 200%';
                  e.currentTarget.style.backgroundPosition = '100% 100%';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.4)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Start Chat
              </button>

              {/* Features */}
              <div style={{
                marginTop: '80px',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '32px',
                maxWidth: '900px',
                margin: '80px auto 0'
              }}>
                {[
                  { icon: '✈️', title: 'Flight Planning', desc: 'Find best flights and routes' },
                  { icon: '🏨', title: 'Hotel Booking', desc: 'Discover perfect accommodations' },
                  { icon: '🗺️', title: 'Itinerary Creation', desc: 'Plan detailed travel schedules' }
                ].map((feature, idx) => (
                  <div key={idx} style={{
                    textAlign: 'center',
                    padding: '24px',
                    background: isDarkMode 
                      ? 'rgba(30, 41, 59, 0.4)' 
                      : 'rgba(255, 255, 255, 0.6)',
                    borderRadius: '20px',
                    border: isDarkMode 
                      ? '1px solid rgba(148, 163, 184, 0.1)' 
                      : '1px solid rgba(226, 232, 240, 0.6)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isDarkMode 
                      ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                      : '0 8px 32px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                      {feature.icon}
                    </div>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      margin: '0 0 8px 0'
                    }}>
                      {feature.title}
                    </h3>
                    <p style={{
                      fontSize: '0.95rem',
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - 80px)',
            maxWidth: '1400px',
            margin: '0 auto',
            padding: isMobile ? '20px 16px' : '40px 24px'
          }}>

          {/* Chat Container */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: '24px',
            border: isDarkMode 
              ? '1px solid rgba(148, 163, 184, 0.1)' 
              : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: isDarkMode 
              ? '0 25px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(148, 163, 184, 0.1)'
              : '0 25px 50px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            minHeight: '600px'
          }}>
            {/* Chat Header */}
            <div style={{
              padding: isMobile ? '24px' : '32px 40px',
              borderBottom: isDarkMode 
                ? '1px solid rgba(148, 163, 184, 0.1)' 
                : '1px solid rgba(226, 232, 240, 0.8)',
              background: isDarkMode 
                ? 'rgba(15, 23, 42, 0.5)' 
                : 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <button
                  onClick={() => setShowChat(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: isDarkMode 
                      ? '1px solid rgba(148, 163, 184, 0.2)' 
                      : '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '12px',
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode 
                      ? 'rgba(30, 41, 59, 0.5)' 
                      : 'rgba(241, 245, 249, 0.8)';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = isDarkMode 
                      ? 'rgba(148, 163, 184, 0.2)' 
                      : 'rgba(226, 232, 240, 0.8)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back
                </button>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span style={{
                    fontSize: isMobile ? '1.1rem' : '1.3rem',
                    fontWeight: '700',
                    color: isDarkMode ? '#f1f5f9' : '#0f172a'
                  }}>
                    AI Assistant Online
                  </span>
                </div>
                
                <div style={{
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"/>
                  </svg>
                  Powered by Nova AI
                </div>
              </div>
              <p style={{
                margin: 0,
                fontSize: '0.95rem',
                color: isDarkMode ? '#94a3b8' : '#64748b',
                lineHeight: '1.5'
              }}>
                Ask me anything about travel planning, destinations, flights, or accommodations
              </p>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobile ? '20px' : '32px 40px',
              background: isDarkMode 
                ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.3) 0%, rgba(30, 41, 59, 0.3) 100%)' 
                : 'linear-gradient(to bottom, rgba(248, 250, 252, 0.5) 0%, rgba(241, 245, 249, 0.5) 100%)',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {messages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  opacity: 0.7
                }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    margin: '0 auto 24px',
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isDarkMode ? '2px solid rgba(99, 102, 241, 0.2)' : '2px solid rgba(99, 102, 241, 0.1)'
                  }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill={isDarkMode ? '#6366f1' : '#8b5cf6'}>
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H14L20 9H21Z"/>
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b',
                    margin: '0 0 12px 0'
                  }}>
                    Welcome to AI Travel Assistant
                  </h3>
                  <p style={{
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    margin: 0,
                    fontSize: '1rem',
                    lineHeight: '1.5'
                  }}>
                    Start a conversation to get personalized travel recommendations, 
                    plan itineraries, or ask about destinations worldwide.
                  </p>
                </div>
              )}

              {messages.map(renderMessage)}
              
              {isLoading && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-start', 
                  animation: 'fadeInUp 0.5s ease-out' 
                }}>
                  <div style={{
                    background: isDarkMode 
                      ? 'rgba(30, 41, 59, 0.8)' 
                      : 'rgba(255, 255, 255, 0.9)',
                    border: isDarkMode 
                      ? '1px solid rgba(148, 163, 184, 0.1)' 
                      : '1px solid rgba(226, 232, 240, 0.6)',
                    borderRadius: '24px',
                    padding: '20px 28px',
                    boxShadow: isDarkMode 
                      ? '0 10px 30px rgba(0, 0, 0, 0.3)'
                      : '0 10px 30px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    maxWidth: '320px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '6px', 
                      alignItems: 'center' 
                    }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            animation: `bounce 1.6s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <span style={{
                      color: isDarkMode ? '#e2e8f0' : '#1e293b',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts (show when no messages) */}
            {messages.length === 0 && (
              <div style={{
                padding: isMobile ? '20px 24px' : '24px 40px',
                borderTop: isDarkMode 
                  ? '1px solid rgba(148, 163, 184, 0.1)' 
                  : '1px solid rgba(226, 232, 240, 0.8)',
                background: isDarkMode 
                  ? 'rgba(15, 23, 42, 0.5)' 
                  : 'rgba(248, 250, 252, 0.8)',
                backdropFilter: 'blur(10px)'
              }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#f1f5f9' : '#334155',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Popular Questions
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      style={{
                        padding: '16px 20px',
                        background: isDarkMode 
                          ? 'rgba(30, 41, 59, 0.6)' 
                          : 'rgba(255, 255, 255, 0.7)',
                        border: isDarkMode 
                          ? '1px solid rgba(148, 163, 184, 0.1)' 
                          : '1px solid rgba(226, 232, 240, 0.6)',
                        borderRadius: '16px',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        color: isDarkMode ? '#e2e8f0' : '#334155',
                        fontWeight: '500',
                        textAlign: 'left',
                        backdropFilter: 'blur(10px)',
                        boxShadow: isDarkMode 
                          ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                          : '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = isDarkMode 
                          ? '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.3)'
                          : '0 8px 25px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)';
                        e.currentTarget.style.borderColor = '#6366f1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isDarkMode 
                          ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                          : '0 4px 12px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.borderColor = isDarkMode 
                          ? 'rgba(148, 163, 184, 0.1)' 
                          : 'rgba(226, 232, 240, 0.6)';
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div style={{
              padding: isMobile ? '20px 24px' : '24px 40px',
              borderTop: isDarkMode 
                ? '1px solid rgba(148, 163, 184, 0.1)' 
                : '1px solid rgba(226, 232, 240, 0.8)',
              background: isDarkMode 
                ? 'rgba(15, 23, 42, 0.7)' 
                : 'rgba(248, 250, 252, 0.9)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'flex-end',
                maxWidth: '1000px',
                margin: '0 auto'
              }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask me about destinations, flights, hotels, or anything travel-related..."
                    disabled={isLoading}
                    rows={1}
                    style={{
                      width: '100%',
                      padding: '18px 24px',
                      paddingRight: '60px',
                      borderRadius: '24px',
                      fontSize: '1rem',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      background: isDarkMode 
                        ? 'rgba(30, 41, 59, 0.8)' 
                        : 'rgba(255, 255, 255, 0.9)',
                      color: isDarkMode ? '#f1f5f9' : '#0f172a',
                      border: isDarkMode 
                        ? '2px solid rgba(148, 163, 184, 0.2)' 
                        : '2px solid rgba(226, 232, 240, 0.8)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isDarkMode 
                        ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                        : '0 4px 20px rgba(0, 0, 0, 0.08)',
                      minHeight: '56px',
                      maxHeight: '120px'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.boxShadow = isDarkMode 
                        ? '0 8px 30px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(99, 102, 241, 0.1)'
                        : '0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode 
                        ? 'rgba(148, 163, 184, 0.2)' 
                        : 'rgba(226, 232, 240, 0.8)';
                      e.currentTarget.style.boxShadow = isDarkMode 
                        ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                        : '0 4px 20px rgba(0, 0, 0, 0.08)';
                    }}
                  />
                  
                  {/* Character counter */}
                  {inputMessage.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '24px',
                      fontSize: '0.75rem',
                      color: isDarkMode ? '#64748b' : '#94a3b8',
                      background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backdropFilter: 'blur(5px)'
                    }}>
                      {inputMessage.length}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '18px',
                    border: 'none',
                    background: inputMessage.trim() && !isLoading
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      : (isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(148, 163, 184, 0.5)'),
                    color: 'white',
                    cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: inputMessage.trim() && !isLoading 
                      ? '0 8px 25px rgba(99, 102, 241, 0.4)'
                      : 'none',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (inputMessage.trim() && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 12px 35px rgba(99, 102, 241, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = inputMessage.trim() && !isLoading 
                      ? '0 8px 25px rgba(99, 102, 241, 0.4)'
                      : 'none';
                  }}
                >
                  {isLoading ? (
                    <div style={{ 
                      display: 'flex', 
                      gap: '3px', 
                      alignItems: 'center' 
                    }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: 'currentColor',
                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m22 2-7 20-4-9-9-4Z"/>
                      <path d="M22 2 11 13"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bounce {
            0%, 80%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            40% {
              transform: translateY(-8px);
              opacity: 1;
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            33% {
              transform: translateY(-30px) rotate(2deg);
            }
            66% {
              transform: translateY(-20px) rotate(-2deg);
            }
          }

          /* Smooth scrollbar styling */
          div::-webkit-scrollbar {
            width: 8px;
          }

          div::-webkit-scrollbar-track {
            background: transparent;
          }

          div::-webkit-scrollbar-thumb {
            background: ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.4)'};
            border-radius: 20px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(148, 163, 184, 0.6)'};
          }

          /* Auto-resize textarea */
          textarea {
            resize: none;
            overflow: hidden;
          }

          /* Glass morphism effect */
          .glass {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }

          /* Smooth transitions for all elements */
          * {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
