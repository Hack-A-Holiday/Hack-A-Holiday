import React from 'react';
import { renderFormattedText, parseTextItinerary } from '../utils/textRendering';
import { FlightRecommendations } from './FlightRecommendations';
import { HotelRecommendations } from './HotelRecommendations';
import { DailyItinerary } from './DailyItinerary';

interface ItineraryContentProps {
  content: any;
  role: string;
  isDarkMode?: boolean;
}

export const ItineraryContent: React.FC<ItineraryContentProps> = ({ content, role, isDarkMode = false }) => {
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