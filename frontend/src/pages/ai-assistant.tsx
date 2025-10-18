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
        Based on your trip duration, here are the best round-trip flight options:
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
            
            {/* Round Trip Indicator */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
              borderRadius: '8px',
              border: isDarkMode ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              <span style={{ fontSize: '16px' }}>🔄</span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: isDarkMode ? '#22c55e' : '#16a34a'
              }}>
                Round Trip Flight
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Route:</strong> {flight.origin} ↔ {flight.destination}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Total Duration:</strong> {flight.duration}
              </div>
              <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                <strong>Outbound:</strong> {new Date(flight.departureTime).toLocaleDateString()} at {new Date(flight.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
                     <div style={{ fontSize: '14px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#666') }}>
                       <strong>Return:</strong> {(() => {
                         // Use the actual return date from backend if available, otherwise calculate from departure + duration
                         if (retDate) {
                           const returnDate = new Date(retDate);
                           return returnDate.toLocaleDateString() + ' at ' + returnDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                         } else {
                           // Fallback: calculate return date based on departure date + trip duration
                           const departureDate = new Date(flight.departureTime);
                           const returnDate = new Date(departureDate);
                           // Calculate return date based on trip duration (default 5 days)
                           const tripDuration = 5; // This should come from the trip data
                           returnDate.setDate(departureDate.getDate() + tripDuration);
                           return returnDate.toLocaleDateString() + ' at ' + returnDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                         }
                       })()}
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
              ✈️ Book Round Trip - {flight.airline} {flight.flightNumber}
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

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>AI Travel Assistant - HackTravel</title>
        <meta name="description" content="Get personalized travel recommendations powered by AI" />
      </Head>

  <div style={{ minHeight: '100vh', background: isDarkMode ? 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Navbar />

        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '20px' : '40px 20px',
          color: isDarkMode ? '#e0e0e0' : undefined
        }}>
          <div style={{
            background: isDarkMode ? '#252d3d' : 'white',
            borderRadius: '15px',
            overflow: 'hidden',
            boxShadow: isDarkMode ? '0 20px 40px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.1)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            height: isMobile ? 'calc(100vh - 100px)' : '75vh',
            display: 'flex',
            flexDirection: 'column',
            color: isDarkMode ? '#e0e0e0' : undefined,
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: isMobile ? '20px' : '28px 48px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: isMobile ? '1.5rem' : '1.8rem', 
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: isMobile ? '1.8rem' : '2rem' }}>🤖</span>
                <span>AI Travel Assistant</span>
              </h1>
              <p style={{ 
                margin: '5px 0 0 0', 
                opacity: 0.9, 
                fontSize: '0.9rem' 
              }}>
                Your intelligent travel planning assistant • AI-Powered
              </p>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: isDarkMode ? '#252d3d' : '#fafafa',
              color: isDarkMode ? '#e0e0e0' : undefined
            }}>
              {messages.map(renderMessage)}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px', animation: 'fadeIn 0.3s ease-in' }}>
                  <div style={{
                    padding: '18px 24px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #f0f2f5 0%, #e8eaf0 100%)',
                    color: '#667eea',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    Planning your adventure...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts (show when no messages except welcome) */}
            {messages.length <= 1 && (
              <div style={{
                padding: '16px 20px',
                background: isDarkMode ? '#252d3d' : 'white',
                borderTop: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0',
                color: isDarkMode ? '#e0e0e0' : '#666'
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  💡 Try asking:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '24px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        color: 'white',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
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
              padding: '20px',
              background: isDarkMode ? '#232526' : 'white',
              borderTop: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about your travel plans..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '25px',
                    border: isDarkMode ? '2px solid #444' : '2px solid #e0e0e0',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: isLoading ? (isDarkMode ? '#333' : '#f5f5f5') : (isDarkMode ? '#232526' : 'white'),
                    color: isDarkMode ? '#e0e0e0' : undefined
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#667eea' : '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#444' : '#e0e0e0'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  style={{
                    padding: '14px 28px',
                    background: inputMessage.trim() && !isLoading
                      ? (isDarkMode ? 'linear-gradient(135deg, #232526 0%, #414345 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
                      : (isDarkMode ? '#444' : '#ccc'),
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    boxShadow: inputMessage.trim() && !isLoading ? (isDarkMode ? '0 4px 12px rgba(30,30,30,0.5)' : '0 4px 12px rgba(102, 126, 234, 0.3)') : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '120px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (inputMessage.trim() && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = isDarkMode ? '0 6px 16px rgba(30,30,30,0.7)' : '0 6px 16px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = inputMessage.trim() && !isLoading ? (isDarkMode ? '0 4px 12px rgba(30,30,30,0.5)' : '0 4px 12px rgba(102, 126, 234, 0.3)') : 'none';
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'white',
                              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Send 📤
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
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
              transform: translateY(-10px);
              opacity: 1;
            }
          }

          .typing-indicator {
            display: flex;
            gap: 4px;
            align-items: center;
          }

          .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #667eea;
            animation: typing 1.4s infinite;
          }

          .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
