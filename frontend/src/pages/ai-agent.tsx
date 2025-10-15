import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import UserContextService from '../services/UserContextService';

interface Message {
  role: 'user' | 'ai' | 'system';
  content: string | Record<string, any>;
  timestamp: number;
  id: string;
  googleFlightsButton?: {
    text: string;
    url: string;
    type: string;
    searchParams?: {
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
    };
  };
}

interface LocalUserContext {
  sessionId: string;
  userId?: string;
  preferences?: Record<string, any>;
  currentTrip?: Record<string, any>;
  tripHistory?: Record<string, any>[];
  messageCount?: number;
}

// Parse multi-destination flight price comparison
const parseFlightPriceComparison = (text: string): { destinations: Array<{ name: string; price: string; badge?: string; currency?: string; }>; title: string; origin?: string; currency?: string; } | null => {
  if (!text.includes('Real-time flight price comparison') && !text.includes('CHEAPEST:') && !text.includes('MOST EXPENSIVE:')) {
    return null;
  }

  const destinations = [];
  const lines = text.split('\n');
  let origin = '';
  let title = 'Flight Prices';

  // Extract origin if available (e.g., "from Mumbai:")
  const originMatch = text.match(/from\s+([^:]+):/i);
  if (originMatch) {
    origin = originMatch[1].trim();
    title = `Flights from ${origin}`;
  }

  // Extract currency symbol if present
  let currencySymbol = '$';
  const currencyMatch = text.match(/([₹$€£¥])[\d,]+/);
  if (currencyMatch) {
    currencySymbol = currencyMatch[1];
  }

  for (const line of lines) {
    // Match patterns like "1. CHEAPEST: Thailand - ₹189" or "2. Bali - $293"
    // Now supports any currency symbol
    const match = line.match(/^\d+\.\s*(?:(CHEAPEST|MOST EXPENSIVE):\s*)?([^-]+)\s*-\s*([₹$€£¥])?[\s]*([\d,]+)/i);
    if (match) {
      const badge = match[1];
      const name = match[2].trim();
      const detectedCurrency = match[3] || currencySymbol;
      const price = match[4];
      destinations.push({ 
        name, 
        price, 
        badge,
        currency: detectedCurrency 
      });
    }
  }

  return destinations.length > 0 ? { destinations, title, origin, currency: currencySymbol } : null;
};

// Parse numbered flight options list
const parseFlightOptionsList = (text: string): Array<{ number: number; price: string; currency: string; duration: string; departure: string; arrival: string; stops: string; reason: string; airline: string; }> | null => {
  const flights = [];
  
  // Match patterns like:
  // Option 1:
  // - Airline: Etihad Airways (EY201)
  // - Price: 44966 INR (or USD, EUR, etc.)
  // - Departure: 2025-12-13 at 11:05
  // - Arrival: 18:35
  // - Duration: 12h 0m
  // - Stops: 1 stop via AUH
  // - Why Choose: Cheapest option
  const optionRegex = /Option\s+(\d+):?\s*\n\s*-\s*Airline:\s*([^\n]+)\n\s*-\s*Price:\s*([\d,]+(?:\.[\d]+)?)\s*([A-Z₹$€£¥]+)\s*\n\s*-\s*(?:Route:\s*[^\n]+\n\s*-\s*)?Departure:\s*([^\n]+?)\s+at\s+([^\n]+)\n\s*-\s*Arrival:\s*([^\n]+)\n\s*-\s*Duration:\s*([^\n]+)\n\s*-\s*Stops:\s*([^\n]+)\n\s*-\s*Why\s*(?:Choose|it'?s a good choice):\s*([^\n]+)/gi;
  
  let match;
  while ((match = optionRegex.exec(text)) !== null) {
    // Remove commas from price and round to integer
    const rawPrice = match[3].replace(/,/g, '');
    const roundedPrice = Math.round(parseFloat(rawPrice) || 0);
    
    flights.push({
      number: parseInt(match[1]),
      airline: match[2].trim(),
      price: roundedPrice.toString(),
      currency: match[4].trim(),
      departure: `${match[5].trim()} ${match[6].trim()}`,  // Combine date and time
      arrival: match[7].trim(),
      duration: match[8].trim(),
      stops: match[9].trim(),
      reason: match[10] ? match[10].trim() : ''
    });
  }

  return flights.length > 0 ? flights : null;
};

// Render text with markdown formatting (bold, italic, links) and Google Flights buttons
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
  const buttonMarkerWithCityPattern = /-\s*([^:]+):\s*\[GOOGLE_FLIGHTS_BUTTON\](https?:\/\/[^\]]+)\[\/GOOGLE_FLIGHTS_BUTTON\]/gi;
  let cityMarkerMatch;
  
  console.log('🔍 Looking for button markers in text...');
  console.log('📋 Text length:', text.length);
  console.log('📋 Text preview:', text.substring(0, 300));
  console.log('📋 Contains button marker:', text.includes('[GOOGLE_FLIGHTS_BUTTON]'));
  
  // First try to match with city labels (multi-destination format)
  while ((cityMarkerMatch = buttonMarkerWithCityPattern.exec(text)) !== null) {
    console.log(`✅ Found button marker for ${cityMarkerMatch[1]}: ${cityMarkerMatch[2]}`);
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
    
    console.log('🔍 Trying simple button pattern on text length:', text.length);
    
    while ((simpleMatch = simpleButtonPattern.exec(text)) !== null) {
      console.log('✅ Found simple button marker:', simpleMatch[1]);
      googleFlightsButtons.push({
        city: 'Search on Google Flights',
        url: simpleMatch[1]
      });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(simpleMatch[0], '').trim();
    }
    
    if (googleFlightsButtons.length === 0) {
      console.log('❌ Simple button pattern did not match');
      console.log('📋 Text sample around "GOOGLE":', text.substring(text.indexOf('GOOGLE') - 50, text.indexOf('GOOGLE') + 150));
    }
  }
  
  if (googleFlightsButtons.length > 0) {
    console.log(`✅ Total button markers found: ${googleFlightsButtons.length}`);
  }
  
  // If button marker NOT found, try other patterns as fallback
  if (googleFlightsButtons.length === 0) {
    console.log('🔍 No button marker found, trying text-based patterns...');

    // New: Pattern A - Markdown single link: "Search on Google Flights: [Click here](https://www.google.com/travel/flights...)"
    const markdownSinglePattern = /Search on Google Flights:\s*\[.*?\]\((https:\/\/www\.google\.com\/travel\/flights[^)]+)\)/i;
    const mdSingleMatch = text.match(markdownSinglePattern);
    if (mdSingleMatch) {
      console.log('✅ Found markdown-style Google Flights link:', mdSingleMatch[1]);
      googleFlightsButtons.push({ city: 'Search on Google Flights', url: mdSingleMatch[1] });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(mdSingleMatch[0], '').trim();
    }

    // New: Pattern B - Multiple markdown links under a list, e.g. "Search more options:\n- Barcelona: [Click here](https://...)"
    const markdownMultiPattern = /(?:Search more options:|Need more options\?)?\s*\n((?:\s*-\s*[^:]+:\s*\[.*?\]\(https:\/\/www\.google\.com\/travel\/flights[^)]+\)\n?)+)/i;
    const mdMultiMatch = text.match(markdownMultiPattern);
    if (mdMultiMatch && !mdSingleMatch) {
      console.log('✅ Found multiple markdown Google Flights links block');
      const cityMdPattern = /-\s*([^:]+):\s*\[.*?\]\((https:\/\/www\.google\.com\/travel\/flights[^)]+)\)/gi;
      let cityMd;
      while ((cityMd = cityMdPattern.exec(mdMultiMatch[1])) !== null) {
        console.log(`   - ${cityMd[1].trim()}: ${cityMd[2]}`);
        googleFlightsButtons.push({ city: cityMd[1].trim(), url: cityMd[2] });
      }
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(mdMultiMatch[0], '').trim();
    }

    // Pattern 1: Single link after "Need more options?" (legacy plain-URL format)
    const singleLinkPattern = /Need more options\?\s*Search on Google Flights:\s*(https:\/\/www\.google\.com\/travel\/flights[^\s]+)/i;
    const singleMatch = text.match(singleLinkPattern);

    if (singleMatch && googleFlightsButtons.length === 0) {
      console.log('✅ Found single Google Flights link:', singleMatch[1]);
      googleFlightsButtons.push({ 
        city: 'Search on Google Flights', 
        url: singleMatch[1] 
      });
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(singleLinkPattern, '').trim();
    }
  
  // Pattern 2: Multiple links with city names (more flexible)
  // Matches "Search more options:" OR just lines starting with "- City: URL"
  const multiLinkPattern = /(?:Search more options:|Need more options\?)?\s*\n((?:\s*-\s*[^:]+:\s*https:\/\/www\.google\.com\/travel\/flights[^\n]+\n?)+)/i;
  const multiMatch = text.match(multiLinkPattern);
  
  if (multiMatch && !singleMatch) {  // Don't double-process if single link already found
    console.log('✅ Found multiple Google Flights links:', multiMatch[0]);
    // Extract each city and URL
    const cityUrlPattern = /-\s*([^:]+):\s*(https:\/\/www\.google\.com\/travel\/flights[^\s\n]+)/gi;
    let cityMatch;
    
    while ((cityMatch = cityUrlPattern.exec(multiMatch[1])) !== null) {
      console.log(`   - ${cityMatch[1].trim()}: ${cityMatch[2]}`);
      googleFlightsButtons.push({
        city: cityMatch[1].trim(),
        url: cityMatch[2]
      });
    }
    
    textWithoutGoogleFlights = text.replace(multiMatch[0], '').trim();
  }
  
  console.log(`🔍 Google Flights buttons found: ${googleFlightsButtons.length}`, googleFlightsButtons);
  
  // Pattern 3: Fallback - catch ANY line with city and Google Flights URL
  if (googleFlightsButtons.length === 0) {
    console.log('🔍 No buttons found via patterns 1-2, trying fallback pattern...');
    const fallbackPattern = /-\s*([^:]+):\s*(https:\/\/www\.google\.com\/travel\/flights[^\s\n]+)/gi;
    let fallbackMatch;
    
    while ((fallbackMatch = fallbackPattern.exec(text)) !== null) {
      console.log(`   ✅ Fallback found: ${fallbackMatch[1].trim()}: ${fallbackMatch[2]}`);
      googleFlightsButtons.push({
        city: fallbackMatch[1].trim(),
        url: fallbackMatch[2]
      });
      
      // Remove this line from text
      const lineToRemove = fallbackMatch[0];
      textWithoutGoogleFlights = textWithoutGoogleFlights.replace(lineToRemove, '').trim();
    }
    
    console.log(`🔍 After fallback, total buttons: ${googleFlightsButtons.length}`);
    }
  } // Close the if (googleFlightsButtons.length === 0) block
  
  // Split by markdown links [text](url) and ** for bold
  const parts = textWithoutGoogleFlights.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, idx) => {
        // Markdown link
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          return (
            <a 
              key={idx} 
              href={linkMatch[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#667eea',
                textDecoration: 'underline',
                fontWeight: '600'
              }}
            >
              {linkMatch[1]}
            </a>
          );
        }
        
        // Bold text
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return <span key={idx}>{part}</span>;
      })}
      
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
  let dayMatch;
  
  while ((dayMatch = dayRegex.exec(text)) !== null) {
    const dayNum = parseInt(dayMatch[1]);
    const title = dayMatch[2].trim();
    const activitiesText = dayMatch[3];
    
    // Parse activities - look for Morning/Afternoon/Evening sections with ** markers
    const activities = [];
    const activityRegex = /(Morning|Afternoon|Evening):\*\*\s*([\s\S]*?)(?=(?:Morning|Afternoon|Evening):\*\*|Day\s+\d+|$)/gi;
    let actMatch;
    
    while ((actMatch = activityRegex.exec(activitiesText)) !== null) {
      const timeOfDay = actMatch[1];
      let activityText = actMatch[2].trim();
      
      // Clean up the text - remove extra newlines and format nicely
      activityText = activityText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join(' ')
        .replace(/\s+/g, ' ');
      
      if (activityText.length > 0) {
        activities.push({
          time: timeOfDay,
          activity: activityText,
          name: activityText.split('.')[0] || activityText.substring(0, 100)
        });
      }
    }
    
    if (activities.length > 0) {
      days.push({
        day: dayNum,
        title: title,
        activities: activities
      });
    }
  }
  
  return days.length > 0 ? days : null;
};

// Parse flight details from Best Deal section
const parseFlightDetails = (text: string, destination: string): { airline?: string; flightType?: string; duration?: string; } | null => {
  // Look for "Best Deal: {destination}" section
  const bestDealRegex = new RegExp(`Best Deal:\\s*${destination}[^.]*\\.(.*?)(?=\\n\\n|All prices|$)`, 'is');
  const match = text.match(bestDealRegex);
  
  if (!match) return null;
  
  const detailsText = match[1];
  const details: any = {};
  
  // Extract airline (e.g., "Thai Vietjet")
  const airlineMatch = detailsText.match(/([A-Za-z\s]+),\s*(?:Direct|[\d\s]+stop)/);
  if (airlineMatch) {
    details.airline = airlineMatch[1].trim();
  }
  
  // Extract flight type (Direct or stops)
  if (detailsText.includes('Direct')) {
    details.flightType = 'Direct';
  } else {
    const stopsMatch = detailsText.match(/([\d]+)\s*stop/);
    if (stopsMatch) {
      details.flightType = `${stopsMatch[1]} stop${parseInt(stopsMatch[1]) > 1 ? 's' : ''}`;
    }
  }
  
  // Extract duration (e.g., "4h 25m")
  const durationMatch = detailsText.match(/([\d]+h\s*[\d]+m)/);
  if (durationMatch) {
    details.duration = durationMatch[1];
  }
  
  return Object.keys(details).length > 0 ? details : null;
};

// Helper function to generate Google Flights URL
const generateGoogleFlightsUrl = (from: string, to: string, departDate?: string, returnDate?: string) => {
  // Default dates if not provided (30 days from now and 7 days later)
  const defaultDepartDate = departDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultReturnDate = returnDate || new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Build query string for Google Flights
  let query = '';
  if (returnDate || !departDate) {
    // Round trip
    query = `Flights from ${from} to ${to} on ${defaultDepartDate} return ${defaultReturnDate}`;
  } else {
    // One way
    query = `Flights from ${from} to ${to} on ${defaultDepartDate}`;
  }
  
  // Return Google Flights URL with pre-filled search using query parameter
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
};

// Flight Price Comparison Component with Full Details
const FlightPriceComparison: React.FC<{ data: ReturnType<typeof parseFlightPriceComparison>; fullText?: string; isDarkMode?: boolean }> = ({ data, fullText, isDarkMode = false }) => {
  if (!data) return null;
  
  // Create a descriptive title with all destinations
  const destinationNames = data.destinations.map(d => d.name).join(', ');
  const title = data.origin 
    ? `✈️ ${data.origin} → ${destinationNames}`
    : `✈️ Flights to ${destinationNames}`;
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        fontSize: '1.2rem', 
        fontWeight: '700', 
        marginBottom: '8px',
        color: isDarkMode ? '#e0e0e0' : '#333'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '0.9rem',
        color: isDarkMode ? '#aaa' : '#666',
        marginBottom: '15px'
      }}>
        Comparing prices across {data.destinations.length} destinations
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.destinations.map((dest, idx) => {
          // Try to extract flight details from the full text
          const details = fullText ? parseFlightDetails(fullText, dest.name) : null;
          
          return (
            <div 
              key={idx}
              style={{
                background: dest.badge === 'CHEAPEST' 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : dest.badge === 'MOST EXPENSIVE'
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : isDarkMode 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '15px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: details ? '12px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    background: 'rgba(255,255,255,0.2)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
                      {dest.name}
                    </div>
                    {details?.airline && (
                      <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '2px' }}>
                        ✈️ {details.airline}
                      </div>
                    )}
                    {dest.badge && (
                      <div style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        background: 'rgba(255,255,255,0.3)',
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        marginTop: '6px'
                      }}>
                        {dest.badge}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: '700',
                  textAlign: 'right',
                  flexShrink: 0
                }}>
                  {dest.currency || data.currency || '$'}{parseInt(dest.price.replace(/,/g, '')).toLocaleString()}
                </div>
              </div>
              
              {/* Flight Details Row */}
              {details && (details.duration || details.flightType) && (
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '0.9rem',
                  marginLeft: '52px',
                  opacity: 0.95,
                  flexWrap: 'wrap'
                }}>
                  {details.duration && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⏱️</span>
                      <span>{details.duration}</span>
                    </div>
                  )}
                  {details.flightType && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{details.flightType === 'Direct' ? '✈️' : '🛬'}</span>
                      <span>{details.flightType}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Google Flights Button */}
              {data.origin && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <a
                    href={generateGoogleFlightsUrl(data.origin, dest.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.25)',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.35)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                    <span>View on Google Flights</span>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Flight Options List Component
const FlightOptionsList: React.FC<{ flights: ReturnType<typeof parseFlightOptionsList>; isDarkMode?: boolean }> = ({ flights, isDarkMode = false }) => {
  if (!flights || flights.length === 0) return null;
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        fontSize: '1.2rem', 
        fontWeight: '700', 
        marginBottom: '15px',
        color: isDarkMode ? '#e0e0e0' : '#333'
      }}>
        ✈️ Available Flight Options
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {flights.map((flight, idx) => (
          <div 
            key={idx}
            style={{
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1rem'
                }}>
                  {flight.number}
                </div>
                <div style={{ fontWeight: '600', fontSize: '1rem', color: isDarkMode ? '#e0e0e0' : '#333' }}>
                  Option {flight.number}
                </div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: '700',
                fontSize: '1.1rem'
              }}>
                {flight.currency || '$'}{parseInt(flight.price).toLocaleString()}
              </div>
            </div>
            
            {flight.airline && (
              <div style={{ 
                fontSize: '0.9rem', 
                color: isDarkMode ? '#ccc' : '#555', 
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                ✈️ {flight.airline}
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '2px' }}>Departure</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isDarkMode ? '#e0e0e0' : '#333' }}>
                  🛫 {flight.departure || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '2px' }}>Arrival</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isDarkMode ? '#e0e0e0' : '#333' }}>
                  🛬 {flight.arrival || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '2px' }}>Duration</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isDarkMode ? '#e0e0e0' : '#333' }}>⏱️ {flight.duration}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '2px' }}>Stops</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: isDarkMode ? '#e0e0e0' : '#333' }}>🔄 {flight.stops}</div>
              </div>
            </div>
            
            {flight.reason && (
              <div style={{ 
                fontSize: '0.85rem', 
                color: isDarkMode ? '#aaa' : '#666',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0',
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(102,126,234,0.05)',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '10px'
              }}>
                <span style={{ fontWeight: '600' }}>💡 Why this flight:</span> {flight.reason}
              </div>
            )}
            
            {/* Google Flights Button - Opens general search for user to customize */}
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
              <a
                href={`https://www.google.com/travel/flights?curr=USD&hl=en&date=${flight.departure.split('T')[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(102,126,234,0.3)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(102,126,234,0.3)';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🔍</span>
                <span>Compare on Google Flights</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Message Component to reduce complexity
const MessageItem: React.FC<{ 
  msg: Message;
  isDarkMode?: boolean;
}> = ({ msg, isDarkMode = false }) => {
  const content = msg.content;
  const isItinerary = typeof content === 'object' && content !== null && 
    ((content as any).dailyItinerary || (content as any).dailyPlans || (content as any).aiResponse);
  
  // Parse flight data if text content
  let flightComparison = null;
  let flightOptions = null;
  let cleanedContent = content;
  
  if (typeof content === 'string') {
    flightComparison = parseFlightPriceComparison(content);
    flightOptions = parseFlightOptionsList(content);
    
    // If we found structured data, remove it from text to avoid duplication
    if (flightComparison || flightOptions) {
      cleanedContent = content;
      
      // Remove price comparison section
      if (flightComparison) {
        cleanedContent = cleanedContent
          .replace(/Real-time flight price comparison from [^:]+:[\s\S]*?(?=Best Deal:|Here are|$)/i, '')
          .replace(/Best Deal:[^\n]*\n(?:\s*-[^\n]*\n)*/gi, '');
      }
      
      // Remove flight options section
      if (flightOptions) {
        cleanedContent = cleanedContent
          .replace(/Here are the top \d+ best flight options[^\n]*:\n/i, '')
          .replace(/Here are the top flight options[^\n]*:\n/i, '')
          .replace(/Option\s+\d+:?\s*\n(?:\s*-[^\n]*\n)*/gi, '');
      }
      
      // Clean up extra newlines, standalone numbers, and trailing prices
      cleanedContent = cleanedContent
        .replace(/^\d+(\.\d+)?\s*$/gm, '') // Remove lines with ONLY numbers
        .replace(/\n\d+(\.\d+)?\s*$/gm, '') // Remove trailing numbers after newline
        .replace(/\n+\d+(\.\d+)?\n+/g, '\n\n') // Remove standalone numbers between newlines
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
        .replace(/(\d{5,})\s*$/gm, '') // Remove trailing large numbers (prices)
        .replace(/^\s*\d{5,}\s*$/gm, '') // Remove lines with only large numbers
        .trim();
    }
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '10px'
    }}>
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: getAvatarBackground(msg.role),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem',
        fontWeight: '600',
        flexShrink: 0
      }}>
        {getAvatarIcon(msg.role)}
      </div>

      {/* Message Bubble */}
      <div style={{
        background: getMessageBackground(msg.role, isDarkMode),
        color: msg.role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#333'),
        borderRadius: '20px',
        padding: isItinerary ? '24px' : '18px 24px',
        maxWidth: '90%',
        boxShadow: msg.role === 'user' 
          ? '0 4px 16px rgba(102,126,234,0.3)' 
          : (isDarkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)'),
        fontSize: '1rem',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        border: isDarkMode && msg.role === 'ai' ? '1px solid rgba(255,255,255,0.1)' : 'none'
      }}>
        {isItinerary && typeof content === 'object' && content !== null ? (
          <ItineraryContent content={content as any} role={msg.role} isDarkMode={isDarkMode} />
        ) : (
          <div>
            {/* Render flight price comparison if found */}
            {flightComparison && (
              <FlightPriceComparison 
                data={flightComparison} 
                fullText={typeof content === 'string' ? content : ''}
                isDarkMode={isDarkMode} 
              />
            )}
            
            {/* Render flight options list if found */}
            {flightOptions && (
              <FlightOptionsList flights={flightOptions} isDarkMode={isDarkMode} />
            )}
            
            {/* Render remaining text */}
            {cleanedContent && typeof cleanedContent === 'string' && cleanedContent.trim() && (
              <div style={{ marginTop: (flightComparison || flightOptions) ? '15px' : '0' }}>
                {renderFormattedText(cleanedContent)}
              </div>
            )}
            
            {/* Fallback for non-string content */}
            {typeof cleanedContent !== 'string' && !flightComparison && !flightOptions && (
              <div>
                {renderFormattedText((cleanedContent as any).message || JSON.stringify(cleanedContent, null, 2))}
              </div>
            )}
          </div>
        )}
        
        {/* Google Flights Button - Shows when no flight results found */}
        {msg.googleFlightsButton && (
          <div style={{ 
            marginTop: '20px', 
            display: 'flex', 
            justifyContent: 'center',
            paddingTop: '15px',
            borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0'
          }}>
            <a
              href={msg.googleFlightsButton.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 100%)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.4)',
                cursor: 'pointer',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(66, 133, 244, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>✈️</span>
              <span>{msg.googleFlightsButton.text}</span>
              <span style={{ fontSize: '1.1rem' }}>→</span>
            </a>
          </div>
        )}
        
        {/* Timestamp */}
        <div style={{ 
          fontSize: '0.75rem', 
          opacity: 0.7, 
          marginTop: '8px',
          textAlign: msg.role === 'user' ? 'right' : 'left'
        }}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Itinerary Content Component with Enhanced UI
const ItineraryContent: React.FC<{ content: any; role: string; isDarkMode?: boolean }> = ({ content, role, isDarkMode = false }) => {
  // Parse plain text itinerary if it exists
  const parsedItinerary = content.aiResponse ? parseTextItinerary(content.aiResponse) : null;
  
  return (
    <div style={{ width: '100%' }}>
      {/* AI Response Text (only if no structured daily plans AND couldn't parse) */}
      {content.aiResponse && !(content.dailyItinerary || content.dailyPlans) && !parsedItinerary && (
        <div style={{ 
          marginBottom: '20px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.8',
          fontSize: '1.05rem',
          color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#333')
        }}>
          {renderFormattedText(content.aiResponse)}
        </div>
      )}
    
    {/* Trip Header Card */}
    <div style={{ 
      background: role === 'user' ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      color: 'white'
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>🗺️</span>
        <span>{content.destination || 'Your Trip Plan'}</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '0.95rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '10px' }}>
          <div style={{ opacity: 0.9, fontSize: '0.85rem', marginBottom: '4px' }}>Duration</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>📅 {content.duration || 'N/A'} days</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '10px' }}>
          <div style={{ opacity: 0.9, fontSize: '0.85rem', marginBottom: '4px' }}>Travelers</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>👥 {content.travelers || 'N/A'}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '10px' }}>
          <div style={{ opacity: 0.9, fontSize: '0.85rem', marginBottom: '4px' }}>Budget</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>💰 ${content.totalBudget || content.budget || 'N/A'}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '10px' }}>
          <div style={{ opacity: 0.9, fontSize: '0.85rem', marginBottom: '4px' }}>Style</div>
          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>🎯 {content.travelStyle || 'N/A'}</div>
        </div>
      </div>
    </div>
    
    {/* Flight Information */}
    {content.flights && (
      <FlightRecommendations flights={content.flights} role={role} />
    )}
    
    {/* Hotel Recommendations */}
    {content.hotels && (
      <HotelRecommendations hotels={content.hotels} role={role} />
    )}
    
    {/* Daily Itinerary - use parsed if available */}
    {(content.dailyItinerary || content.dailyPlans || parsedItinerary) && (
      <DailyItinerary 
        dailyData={content.dailyItinerary || content.dailyPlans || parsedItinerary} 
        role={role}
        isDarkMode={isDarkMode}
      />
    )}

    {/* Personalized Recommendations */}
    {content.recommendations && Array.isArray(content.recommendations) && content.recommendations.length > 0 && (
      <PersonalizedRecommendations recommendations={content.recommendations} role={role} />
    )}

    {/* Travel Tips */}
    {content.tips && Array.isArray(content.tips) && (
      <TravelTips tips={content.tips} role={role} />
    )}
    
    {/* Budget Breakdown */}
    {content.budgetBreakdown && (
      <BudgetBreakdown breakdown={content.budgetBreakdown} role={role} />
    )}
  </div>
  );
};

// Flight Recommendations Component
const FlightRecommendations: React.FC<{ flights: any[]; role: string }> = ({ flights, role }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>✈️</span>
      <span>Recommended Flights</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {flights.slice(0, 3).map((flight: any, idx: number) => (
        <div key={`flight_${idx}`} style={{
          background: role === 'user' ? 'rgba(255,255,255,0.1)' : 'white',
          border: role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: '600', fontSize: '1.1rem', color: role === 'user' ? 'white' : '#333' }}>
                {flight.airline || 'Airline'} {flight.flightNumber && `- ${flight.flightNumber}`}
              </div>
              {flight.stops === 0 && (
                <span style={{ 
                  background: '#10b981', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  Direct
                </span>
              )}
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: '600',
              fontSize: '1.1rem'
            }}>
              {flight.currency || '$'}{flight.price || 'N/A'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.95rem', color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#666', marginBottom: '10px' }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>From</div>
              <div>{flight.origin || flight.departure || 'N/A'}</div>
              {flight.departureTime && (
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {new Date(flight.departureTime).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: role === 'user' ? 'white' : '#667eea' }}>
              <span style={{ fontSize: '1.5rem' }}>→</span>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>To</div>
              <div>{flight.destination || flight.arrival || 'N/A'}</div>
              {flight.arrivalTime && (
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {new Date(flight.arrivalTime).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: role === 'user' ? 'rgba(255,255,255,0.8)' : '#888' }}>
            {flight.duration && (
              <div>⏱️ {flight.duration}</div>
            )}
            {flight.stops !== undefined && (
              <div>🛬 {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
            )}
            {flight.cabinClass && (
              <div>💺 {flight.cabinClass}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Hotel Recommendations Component
const HotelRecommendations: React.FC<{ hotels: any[]; role: string }> = ({ hotels, role }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>🏨</span>
      <span>Recommended Hotels</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
      {hotels.slice(0, 3).map((hotel: any, idx: number) => (
        <div key={`hotel_${idx}`} style={{
          background: role === 'user' ? 'rgba(255,255,255,0.1)' : 'white',
          border: role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '8px', color: role === 'user' ? 'white' : '#333' }}>
            {hotel.name || 'Hotel'}
          </div>
          <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: role === 'user' ? 'rgba(255,255,255,0.8)' : '#666' }}>
            <div style={{ marginBottom: '4px' }}>⭐ {hotel.rating || 'N/A'} ({hotel.reviews || 0} reviews)</div>
            <div style={{ marginBottom: '4px' }}>📍 {hotel.location || 'N/A'}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: role === 'user' ? 'rgba(255,255,255,0.7)' : '#888' }}>
              {hotel.amenities?.slice(0, 2).join(', ') || 'Amenities available'}
            </div>
            <div style={{ 
              fontWeight: '700',
              fontSize: '1.2rem',
              color: role === 'user' ? 'white' : '#667eea'
            }}>
              ${hotel.price || 'N/A'}
              <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>/night</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Personalized Recommendations Component
const PersonalizedRecommendations: React.FC<{ recommendations: any; role: string }> = ({ recommendations, role }) => {
  // If recommendations is an array of flights, render as flight recommendations
  if (Array.isArray(recommendations) && recommendations.length > 0 && recommendations[0].airline) {
    return <FlightRecommendations flights={recommendations} role={role} />;
  }

  // If recommendations is an array of hotels, render as hotel recommendations  
  if (Array.isArray(recommendations) && recommendations.length > 0 && recommendations[0].name && recommendations[0].rating) {
    return <HotelRecommendations hotels={recommendations} role={role} />;
  }

  // Otherwise render as personalized recommendations (original format)
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🎯</span>
        <span>Personalized for You</span>
      </div>
      <div style={{ 
        background: role === 'user' ? 'rgba(255,255,255,0.1)' : '#f8f9fa',
        borderRadius: '12px',
        padding: '16px'
      }}>
        {recommendations.basedOnHistory && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: '600', marginBottom: '6px', color: role === 'user' ? 'white' : '#495057' }}>
              📚 Based on Your History:
            </div>
            <ul style={{ paddingLeft: '20px', fontSize: '0.95rem', color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#666' }}>
              {recommendations.basedOnHistory.slice(0, 3).map((item: string, i: number) => (
                <li key={`history_${i}`} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {recommendations.basedOnPreferences && (
          <div>
            <div style={{ fontWeight: '600', marginBottom: '6px', color: role === 'user' ? 'white' : '#495057' }}>
              ❤️ Based on Your Preferences:
            </div>
            <ul style={{ paddingLeft: '20px', fontSize: '0.95rem', color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#666' }}>
              {recommendations.basedOnPreferences.slice(0, 3).map((item: string, i: number) => (
                <li key={`pref_${i}`} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Budget Breakdown Component
const BudgetBreakdown: React.FC<{ breakdown: any; role: string }> = ({ breakdown, role }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>💳</span>
      <span>Budget Breakdown</span>
    </div>
    <div style={{ 
      background: role === 'user' ? 'rgba(255,255,255,0.1)' : 'white',
      border: role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e0e0e0',
      borderRadius: '12px',
      padding: '16px'
    }}>
      {Object.entries(breakdown).map(([category, amount]: [string, any]) => (
        <div key={category} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '10px 0',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            fontWeight: '500',
            textTransform: 'capitalize',
            color: role === 'user' ? 'white' : '#333'
          }}>
            {category}
          </div>
          <div style={{ 
            fontWeight: '600',
            fontSize: '1.1rem',
            color: role === 'user' ? 'white' : '#667eea'
          }}>
            ${amount}
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
      {dailyData.map((day: any, idx: number) => {
        const dayKey = day.id || `day_${day.day || idx + 1}_${Date.now()}`;
        return (
          <div key={dayKey} style={{ 
            background: role === 'user' ? 'rgba(255,255,255,0.1)' : (isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'white'),
            border: role === 'user' ? '1px solid rgba(255,255,255,0.2)' : (isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e0e0e0'),
            borderRadius: '12px',
            padding: '16px',
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '2px solid rgba(102, 126, 234, 0.3)'
            }}>
              <div>
                <div style={{ 
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  color: role === 'user' ? 'white' : '#667eea',
                  marginBottom: '4px'
                }}>
                  Day {day.day || idx + 1}
                </div>
                <div style={{ 
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#333'
                }}>
                  {day.title || day.theme || 'Exploring'}
                </div>
              </div>
              {day.date && (
                <div style={{ 
                  fontSize: '0.9rem',
                  color: role === 'user' ? 'rgba(255,255,255,0.8)' : '#888',
                  background: role === 'user' ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
                  padding: '6px 12px',
                  borderRadius: '8px'
                }}>
                  📅 {day.date}
                </div>
              )}
            </div>
            
            {/* Activities */}
            {day.activities && Array.isArray(day.activities) && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  marginBottom: '8px',
                  color: role === 'user' ? 'white' : '#495057'
                }}>
                  🎯 Activities:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {day.activities.slice(0, 5).map((activity: any, actIdx: number) => (
                    <div key={`act_${actIdx}`} style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      background: role === 'user' ? 'rgba(0,0,0,0.1)' : (isDarkMode ? 'rgba(50, 50, 50, 0.6)' : '#f8f9fa'),
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      {activity.time && (
                        <div style={{ 
                          fontWeight: '600',
                          color: role === 'user' ? 'white' : '#667eea',
                          minWidth: '60px'
                        }}>
                          {activity.time}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: '400',
                          color: role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#333'),
                          marginBottom: '2px',
                          lineHeight: '1.6'
                        }}>
                          {renderFormattedText(activity.activity || activity.name || activity)}
                        </div>
                        {activity.location && (
                          <div style={{ 
                            fontSize: '0.85rem',
                            color: role === 'user' ? 'rgba(255,255,255,0.7)' : '#666'
                          }}>
                            📍 {activity.location}
                          </div>
                        )}
                        {activity.cost > 0 && (
                          <div style={{ 
                            fontSize: '0.85rem',
                            color: role === 'user' ? 'rgba(255,255,255,0.7)' : '#888',
                            marginTop: '4px'
                          }}>
                            💵 ${activity.cost}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Meals */}
            {day.meals && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  marginBottom: '8px',
                  color: role === 'user' ? 'white' : '#495057'
                }}>
                  🍽️ Meals:
                </div>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '8px',
                  fontSize: '0.85rem'
                }}>
                  {day.meals.breakfast && (
                    <div style={{ 
                      padding: '8px',
                      background: role === 'user' ? 'rgba(0,0,0,0.1)' : '#fff3cd',
                      borderRadius: '6px',
                      color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#856404'
                    }}>
                      <strong>🌅 Breakfast:</strong><br/>{day.meals.breakfast}
                    </div>
                  )}
                  {day.meals.lunch && (
                    <div style={{ 
                      padding: '8px',
                      background: role === 'user' ? 'rgba(0,0,0,0.1)' : '#d1ecf1',
                      borderRadius: '6px',
                      color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#0c5460'
                    }}>
                      <strong>☀️ Lunch:</strong><br/>{day.meals.lunch}
                    </div>
                  )}
                  {day.meals.dinner && (
                    <div style={{ 
                      padding: '8px',
                      background: role === 'user' ? 'rgba(0,0,0,0.1)' : '#d4edda',
                      borderRadius: '6px',
                      color: role === 'user' ? 'rgba(255,255,255,0.9)' : '#155724'
                    }}>
                      <strong>🌙 Dinner:</strong><br/>{day.meals.dinner}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Accommodation */}
            {day.accommodation && (
              <div style={{
                padding: '10px',
                background: role === 'user' ? 'rgba(102, 126, 234, 0.2)' : '#e7f3ff',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: role === 'user' ? 'white' : '#004085'
              }}>
                <strong>🏨 Accommodation:</strong> {day.accommodation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// Travel Tips Component with Enhanced UI
const TravelTips: React.FC<{ tips: string[]; role: string }> = ({ tips, role }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', color: role === 'user' ? 'white' : '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>💡</span>
      <span>Travel Tips</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {tips.map((tip: string, i: number) => {
        const tipKey = `tip_${i}_${tip.substring(0, 10).replace(/\s/g, '_')}`;
        return (
          <div key={tipKey} style={{
            display: 'flex',
            gap: '12px',
            padding: '14px',
            background: role === 'user' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
            borderRadius: '10px',
            fontSize: '0.95rem',
            color: role === 'user' ? 'white' : '#2d3436',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '1.2rem' }}>✨</div>
            <div style={{ flex: 1, fontWeight: '500' }}>{tip}</div>
          </div>
        );
      })}
    </div>
  </div>
);

// Helper functions to reduce cognitive complexity
const getAvatarBackground = (role: string): string => {
  if (role === 'user') return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  if (role === 'system') return '#ff6b6b';
  return '#4ecdc4';
};

const getAvatarIcon = (role: string): string => {
  if (role === 'user') return '👤';
  if (role === 'system') return '⚠️';
  return '🤖';
};

const getMessageBackground = (role: string, isDarkMode: boolean = false): string => {
  if (role === 'user') return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  if (role === 'system') return isDarkMode ? '#2d1f1f' : '#ffe3e3';
  return isDarkMode ? '#0f3460' : '#f8f9fa';
};

const renderActivities = (activities: any, role: string) => {
  if (!activities) return null;
  
  return (
    <div style={{ marginTop: '4px', fontSize: '0.85rem', opacity: 0.9 }}>
      {Array.isArray(activities) 
        ? activities.slice(0, 3).map((act: any, i: number) => {
            const actKey = `act_${i}_${(act.activity || act.name || act).toString().substring(0, 10).replace(/\s/g, '_')}`;
            return (
              <div key={actKey}>• {act.activity || act.name || act}</div>
            );
          })
        : Object.entries(activities).map(([time, acts]) => {
            const timeKey = `time_${time.replace(/\s/g, '_')}`;
            return (
              <div key={timeKey}>
                <strong>{time}:</strong> {Array.isArray(acts) 
                  ? acts.map((a: any) => a.name || a.activity || a).join(', ') 
                  : String(acts)
                }
              </div>
            );
          })
      }
    </div>
  );
};

const AiAgentPage: React.FC = () => {
  const { state } = useAuth();
  const contextService = UserContextService.getInstance();
  const [userContext, setUserContext] = useState<LocalUserContext>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get itinerary from query if present
  let itineraryMsg: Message | null = null;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const itineraryStr = params.get('itinerary');
    if (itineraryStr) {
      try {
        const itineraryObj = JSON.parse(itineraryStr);
        itineraryMsg = { 
          role: 'ai', 
          content: itineraryObj, 
          timestamp: Date.now(),
          id: `msg_${Date.now()}_itinerary`
        };
      } catch {}
    }
  }

  const [messages, setMessages] = useState<Message[]>([
    itineraryMsg || { 
      role: 'ai', 
      content: `Welcome to your AI Travel Agent! 🌍✈️\n\nI'm your personal travel assistant powered by AI. I can help you with:\n\n✈️ Flight Recommendations - Find the best flights based on your preferences\n🏨 Hotel Suggestions - Discover perfect accommodations for your stay\n🗺️ Personalized Itineraries - Custom day-by-day travel plans\n🎯 Smart Recommendations - Based on your search history and preferences\n💰 Budget Planning - Detailed cost breakdowns and money-saving tips\n🌎 Destination Guides - Explore new places tailored to your interests\n💡 Travel Tips - Expert advice for your journey\n\nTry asking me:\n• "Find me flights to Paris"\n• "Recommend hotels in Tokyo under $200/night"\n• "Plan a 5-day trip to Bali"\n• "What are popular destinations for adventure travel?"\n\nHow can I help you plan your perfect trip today?`,
      timestamp: Date.now(),
      id: `msg_${Date.now()}_welcome`
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiModel, setAiModel] = useState<'bedrock' | 'sagemaker'>('bedrock');
  const [isDarkMode, setIsDarkMode] = useState(true); // Dark mode by default for travel agent feel

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user context from profile
  useEffect(() => {
    if (state?.user) {
      const updatedContext = contextService.getOrCreateContext(
        userContext.sessionId, 
        state.user.email
      );
      
      // Update context with user preferences
      if (state.user.preferences) {
        contextService.updatePreferencesFromProfile(userContext.sessionId, state.user.preferences);
      }
      
      setUserContext(updatedContext);
    }
  }, [state?.user, userContext.sessionId, contextService]);

  // Save conversation to localStorage for persistence
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(`ai_chat_${userContext.sessionId}`, JSON.stringify({
        messages,
        userContext,
        timestamp: Date.now()
      }));
    }
  }, [messages, userContext]);

  const createMessage = (role: 'user' | 'ai' | 'system', content: string | Record<string, any>): Message => ({
    role,
    content,
    timestamp: Date.now(),
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  });

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = createMessage('user', input);
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    
    // Detect query intent
    const inputLower = input.toLowerCase();
    const isFlightQuery = inputLower.includes('flight') || inputLower.includes('fly') || inputLower.includes('airline');
    const isHotelQuery = inputLower.includes('hotel') || inputLower.includes('accommodation') || inputLower.includes('stay');
    
    // Extract topics and update context
    const topics = contextService.extractTopics(input);
    contextService.addConversationEntry(userContext.sessionId, messages.length + 1, topics);
    
    try {
      // Get enhanced context for AI
      const enhancedContext = contextService.getOrCreateContext(userContext.sessionId, state?.user?.email);
      const personalizedPrompt = contextService.getPersonalizedPrompt(userContext.sessionId);
      
      const requestPayload = {
        messages: [...messages, userMessage],
        userContext: {
          ...enhancedContext,
          personalizedPrompt,
          searchIntent: {
            isFlightQuery,
            isHotelQuery,
            rawQuery: input
          }
        },
        aiModel,
        userId: state?.user?.email || 'anonymous'
      };

      // Use the integrated AI endpoint
      const response = await axios.post('/api/ai/chat', {
        message: input,
        messages: messages.map(msg => ({
          role: msg.role === 'ai' ? 'assistant' : 'user',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })),
        conversationId: sessionStorage.getItem('ai_conversation_id') || userContext.sessionId,
        preferences: userContext.preferences,
        userContext
      }, {
        withCredentials: true // Send cookies with request
      });
      
      // Store conversation ID for context
      if (response.data.data?.conversationId) {
        sessionStorage.setItem('ai_conversation_id', response.data.data.conversationId);
      }
      
      // Extract AI content from response
      let aiContent = response.data.data?.response || response.data.content || response.data;
      
      // If real data was fetched (flights/hotels), use it
      if (response.data.data?.realData) {
        const realData = response.data.data.realData;
        if (realData.type === 'flight' && realData.results?.length > 0) {
          aiContent = {
            message: aiContent,
            flights: realData.results.map(flight => ({
              airline: flight.airline || 'Airline',
              departure: flight.origin || 'Origin',
              arrival: flight.destination || 'Destination',
              departureTime: flight.departureTime || 'TBD',
              arrivalTime: flight.arrivalTime || 'TBD',
              duration: flight.duration || 'N/A',
              price: flight.price || 0,
              currency: flight.currency || 'USD',
              stops: flight.stops || 'Direct'
            }))
          };
        } else if (realData.type === 'hotel' && realData.results?.length > 0) {
          aiContent = {
            message: aiContent,
            hotels: realData.results.map(hotel => ({
              name: hotel.name || 'Hotel',
              rating: hotel.rating || '4.0',
              reviews: hotel.reviews || 100,
              location: hotel.location || 'Downtown',
              amenities: hotel.amenities || ['WiFi', 'Pool'],
              price: hotel.price || 100,
              currency: hotel.currency || 'USD'
            }))
          };
        }
      }
      
      // If response is still plain text, wrap it in an object
      if (typeof aiContent === 'string') {
        aiContent = {
          message: aiContent
        };
      }

      // Add mock data as fallback only if real data wasn't fetched
      if (!response.data.data?.realData) {
        if (isFlightQuery && typeof aiContent === 'object' && !aiContent.flights) {
          aiContent.flights = [
            {
              airline: 'Sample Airline',
              departure: 'Origin',
              arrival: 'Destination',
              departureTime: 'TBD',
              arrivalTime: 'TBD',
              duration: 'N/A',
              price: 0,
              note: 'Enable flight API for real data'
            }
          ];
        }
        if (isHotelQuery && typeof aiContent === 'object' && !aiContent.hotels) {
          aiContent.hotels = [
            {
              name: 'Sample Hotel',
              rating: '4.0',
              reviews: 0,
              location: 'Downtown',
              amenities: ['WiFi'],
              price: 0,
              note: 'Enable hotel API for real data'
            }
          ];
        }
      }

      // Remove old mock data section below
      if (false && typeof aiContent === 'string' && (isFlightQuery || isHotelQuery)) {
        aiContent = {
          message: aiContent,
          ...(isFlightQuery && {
            flights: [
              {
                airline: 'Delta Airlines',
                departure: 'JFK',
                arrival: 'LAX',
                departureTime: '10:00 AM',
                arrivalTime: '1:00 PM',
                duration: '6h 00m',
                price: 320
              },
              {
                airline: 'United Airlines',
                departure: 'JFK',
                arrival: 'LAX',
                departureTime: '2:00 PM',
                arrivalTime: '5:00 PM',
                duration: '6h 00m',
                price: 295
              }
            ]
          }),
          ...(isHotelQuery && {
            hotels: [
              {
                name: 'Grand Plaza Hotel',
                rating: '4.5',
                reviews: 1250,
                location: 'Downtown',
                amenities: ['WiFi', 'Pool', 'Gym', 'Spa'],
                price: 150
              },
              {
                name: 'Boutique Suites',
                rating: '4.2',
                reviews: 890,
                location: 'City Center',
                amenities: ['WiFi', 'Breakfast', 'Parking'],
                price: 120
              }
            ]
          })
        };
      }
      
      const aiMessage = createMessage('ai', aiContent);
      
      // Add Google Flights button if provided by backend
      if (response.data.data?.googleFlightsButton) {
        aiMessage.googleFlightsButton = response.data.data.googleFlightsButton;
        console.log('🔘 Google Flights button added to message:', response.data.data.googleFlightsButton);
      }
      
      setMessages((prev) => [...prev, aiMessage]);

      // Update context with learned preferences from backend
      if (response.data.data?.learnedContext) {
        const learnedContext = response.data.data.learnedContext;
        console.log('📚 Learned preferences from AI:', learnedContext.preferences);
        
        // Update frontend user context with learned preferences
        setUserContext(prev => ({
          ...prev,
          preferences: {
            ...prev.preferences,
            ...learnedContext.preferences
          }
        }));
        
        // Also update the context service
        contextService.updateContext(userContext.sessionId, {
          ...enhancedContext,
          preferences: {
            ...enhancedContext.preferences,
            ...learnedContext.preferences
          }
        });
      } else {
        // Update context with successful interaction
        contextService.updateContext(userContext.sessionId, {
          ...enhancedContext
        });
      }
      
    } catch (error) {
      console.error('Error communicating with AI:', error);
      const errorMessage = createMessage('system', 'Sorry, something went wrong. Please try again.');
      setMessages((prev) => [...prev, errorMessage]);
    }
    setInput('');
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const welcomeMessage = createMessage('ai', 'Chat cleared! 🧹\n\nHow can I help you with your travel plans?');
    setMessages([welcomeMessage]);
    setUserContext(prev => ({
      ...prev,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }));
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <Head>
        <title>AI Travel Agent - Hack-A-Holiday</title>
        <meta name="description" content="AI-powered travel assistant for personalized trip planning" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.1); }
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
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .message-enter {
            animation: fadeIn 0.4s ease-out;
          }
          .quick-action-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
        `}</style>
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Navbar />
        
        <main style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          height: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '60px'
        }}>
          {/* Chat Container - Full Screen */}
          <div style={{ 
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            margin: '0 auto', 
            background: isDarkMode ? '#0f172a' : 'rgba(255,255,255,0.98)', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Chat Header */}
            <div style={{ 
              background: isDarkMode 
                ? 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '28px 48px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '1.8rem', 
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '2rem' }}>🤖</span>
                  <span>AI Travel Agent</span>
                </h1>
                <p style={{ 
                  margin: '5px 0 0 0', 
                  opacity: 0.9,
                  fontSize: '0.9rem'
                }}>
                  Your intelligent travel planning assistant • AI-Powered
                </p>
                {/* User Preferences Indicator */}
                {(userContext.preferences?.budget || userContext.preferences?.interests?.length > 0) && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    <span style={{ opacity: 0.9 }}>💡 I remember:</span>
                    {userContext.preferences.budget && (
                      <span style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '4px 12px', 
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}>
                        💰 ${userContext.preferences.budget} budget
                      </span>
                    )}
                    {userContext.preferences.interests && userContext.preferences.interests.length > 0 && (
                      <span style={{ 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '4px 12px', 
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}>
                        ❤️ {userContext.preferences.interests.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={clearChat}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                >
                  🧹 Clear Chat
                </button>
            </div>
          </div>

            {/* Messages Container */}
            <div style={{ 
              flex: 1,
              width: '100%',
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '40px 48px',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              background: isDarkMode 
                ? 'linear-gradient(to bottom, #0f172a 0%, #1e293b 100%)' 
                : 'linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)',
              minHeight: 0
            }}>
              {messages.map((msg) => (
                <MessageItem key={msg.id} msg={msg} isDarkMode={isDarkMode} />
              ))}
              
              {loading && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '15px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#4ecdc4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem'
                  }}>
                    🤖
                  </div>
                  <div style={{
                    background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : '#f8f9fa',
                    borderRadius: '18px',
                    padding: '15px 20px',
                    fontSize: '1rem',
                    color: isDarkMode ? '#e0e0e0' : '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}>
                    {/* Animated dots */}
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

            {/* Input Area - Enhanced Modern Design */}
            <div style={{ 
              width: '100%',
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '28px 48px 36px 48px',
              borderTop: 'none',
              background: isDarkMode 
                ? 'linear-gradient(to top, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(to top, #ffffff 0%, #f8fafc 100%)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
            }}>
              {/* Quick Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {['Find flights ✈️', 'Hotel recommendations 🏨', 'Popular destinations 🌎', 'Travel tips 💡'].map((action) => (
                  <button
                    key={action}
                    onClick={() => setInput(action)}
                    style={{
                      padding: '10px 20px',
                      background: isDarkMode 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                    {action}
                  </button>
                ))}
              </div>
              
              {/* Input Box with Icon */}
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                alignItems: 'flex-end',
                position: 'relative'
              }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.2rem',
                    pointerEvents: 'none',
                    opacity: input ? 0 : 0.5,
                    transition: 'opacity 0.3s'
                  }}>
                    💬
                  </div>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me about flights, hotels, destinations, or any travel questions..."
                    disabled={loading}
                    style={{
                      width: '100%',
                      minHeight: '64px',
                      maxHeight: '140px',
                      padding: '20px 24px 20px 56px',
                      border: isDarkMode ? '2px solid #3b82f6' : '2px solid #667eea',
                      borderRadius: '32px',
                      fontSize: '1.05rem',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      background: loading 
                        ? (isDarkMode ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9')
                        : (isDarkMode ? '#1e293b' : 'white'),
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      transition: 'all 0.3s ease',
                      boxShadow: isDarkMode 
                        ? '0 4px 16px rgba(59, 130, 246, 0.2), inset 0 2px 4px rgba(0,0,0,0.2)' 
                        : '0 4px 16px rgba(102, 126, 234, 0.15), inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : '#e1e5e9';
                      e.target.style.boxShadow = isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)';
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    background: loading || !input.trim() 
                      ? (isDarkMode ? 'rgba(71, 85, 105, 0.5)' : '#cbd5e1')
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '18px 36px',
                    borderRadius: '32px',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    minWidth: '120px',
                    transition: 'all 0.3s ease',
                    boxShadow: loading || !input.trim() ? 'none' : '0 6px 20px rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && input.trim()) {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = loading || !input.trim() ? 'none' : '0 6px 20px rgba(59, 130, 246, 0.4)';
                  }}
                >
                  {loading ? (
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
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <span>📤</span>
                    </>
                  )}
                </button>
              </div>
              
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#666', 
                marginTop: '8px',
                textAlign: 'center'
              }}>
                💡 Tip: Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `
      }} />
    </ProtectedRoute>
  );
};

export default AiAgentPage;