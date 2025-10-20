import { DailyPlan } from '../types';

/**
 * Parse AI response text to extract daily itinerary
 */
export const parseItineraryFromAI = (aiText: string, duration: number): DailyPlan[] => {
  const dailyPlans: DailyPlan[] = [];
  
  // Try to extract days using regex patterns
  const dayPatterns = [
    /#### Day (\d+): (.+?)[\n\r]([\s\S]*?)(?=#### Day \d+:|###|$)/gi,
    /Day (\d+): (.+?)[\n\r]([\s\S]*?)(?=Day \d+:|###|$)/gi,
  ];
  
  let matches: RegExpMatchArray[] | null = null;
  
  for (const p of dayPatterns) {
    const testMatches = Array.from(aiText.matchAll(p));
    if (testMatches.length > 0) {
      matches = testMatches;
      break;
    }
  }
  
  if (matches && matches.length > 0) {
    for (const match of matches) {
      const dayNum = parseInt(match[1]);
      const title = match[2].trim();
      const content = match[3].trim();
      
      // Parse activities from the day content
      const activities: string[] = [];
      
      // Split by lines and look for activity patterns
      const lines = content.split('\n');
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        // Match lines starting with ** (bold), - (bullet), or time patterns
        if (trimmed.startsWith('-') || 
            trimmed.startsWith('**') || 
            /^\*\*[A-Z]/.test(trimmed) ||
            /^[0-9]{1,2}:[0-9]{2}/.test(trimmed)) {
          // Clean up the line
          let activity = trimmed
            .replace(/^-\s*/, '')
            .replace(/^\*\*/, '')
            .replace(/\*\*:/, ':')
            .trim();
          if (activity) activities.push(activity);
        }
      });
      
      dailyPlans.push({
        day: dayNum,
        title: title,
        description: content,
        activities: activities.length > 0 ? activities : [content]
      });
    }
  }
  
  // If no structured days found, create a single day entry
  if (dailyPlans.length === 0) {
    dailyPlans.push({
      day: 1,
      title: 'Trip Overview',
      description: aiText,
      activities: [aiText]
    });
  }
  
  return dailyPlans;
};

/**
 * Build itinerary object from AI response
 */
export const buildItineraryObject = (
  data: any,
  preferences: any,
  dailyPlans: DailyPlan[]
) => {
  const aiResponse = Array.isArray(data.response) 
    ? data.response[0]?.content 
    : data.response;

  return {
    destination: preferences.destination,
    origin: preferences.origin,
    duration: preferences.duration,
    budget: preferences.budget,
    travelers: preferences.travelers,
    startDate: preferences.startDate,
    travelStyle: preferences.travelStyle,
    interests: preferences.interests,
    aiResponse: aiResponse,
    dailyPlans: dailyPlans,
    recommendations: [],
    realData: null,
    conversationId: data.conversationId || `trip_${Date.now()}`,
    totalBudget: `$${preferences.budget}`,
    overview: {
      destination: preferences.destination,
      duration: preferences.duration,
      travelStyle: preferences.travelStyle
    }
  };
};
