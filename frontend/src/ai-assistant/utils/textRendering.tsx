import React from 'react';

// Utility function to render formatted text (bold support)
// Helper to render inline bold within text
export const renderInlineBold = (text: string) => {
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
export const renderMarkdownText = (text: string) => {
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

export const renderFormattedText = (text: string | any) => {
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
          gap: '8px',
          borderTop: '1px solid rgba(99, 102, 241, 0.15)',
          paddingTop: '16px'
        }}>
          <div style={{ 
            fontSize: '0.85rem', 
            fontWeight: '500', 
            color: '#64748b',
            marginBottom: '6px',
            opacity: 0.9
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
                padding: '12px 20px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.95rem',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              ✈️ View on Google Flights
            </a>
          ))}
        </div>
      )}
    </>
  );
};

// Parse plain text itinerary into structured format
export const parseTextItinerary = (text: string): any[] | null => {
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