import React from 'react';
import { renderFormattedText } from '../utils/textRendering';

interface DailyItineraryProps {
  dailyData: any[];
  role: string;
  isDarkMode?: boolean;
}

export const DailyItinerary: React.FC<DailyItineraryProps> = ({ dailyData, role, isDarkMode = false }) => (
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