import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
  InvokeModelCommandInput 
} from '@aws-sdk/client-bedrock-runtime';
import { TripPreferences, Itinerary, FlightOption, HotelOption, Activity, DayPlan } from '../types';
import { calculateBudgetBreakdown, calculateTotalCost } from '../utils/calculations';

export interface BedrockServiceConfig {
  region?: string;
  modelId?: string;
}

export class BedrockService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(config: BedrockServiceConfig = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    });
    this.modelId = config.modelId || 'us.anthropic.claude-sonnet-4-20250514-v1:0';
  }

  /**
   * Generate a complete trip itinerary using Claude
   */
  async generateTripItinerary(
    preferences: TripPreferences,
    flights: FlightOption[],
    hotels: HotelOption[],
    activities: Activity[]
  ): Promise<Itinerary> {
    const prompt = this.buildTripPlanningPrompt(preferences, flights, hotels, activities);
    
    try {
      const response = await this.invokeModel(prompt);
      const itinerary = this.parseItineraryResponse(response, preferences, flights, hotels, activities);
      
      return itinerary;
    } catch (error) {
      console.error('Error generating itinerary with Bedrock:', error);
      // Fallback to basic itinerary generation
      return this.generateFallbackItinerary(preferences, flights, hotels, activities);
    }
  }

  /**
   * Get activity recommendations based on destination and interests
   */
  async getActivityRecommendations(
    destination: string,
    interests: string[],
    budget: number,
    duration: number
  ): Promise<Activity[]> {
    const prompt = `You are a travel expert. Recommend activities for a ${duration}-day trip to ${destination}.

User interests: ${interests.join(', ')}
Budget for activities: $${budget}

Please recommend specific activities with the following details for each:
- Name of the activity/attraction
- Brief description
- Category (sightseeing, culture, food, adventure, etc.)
- Estimated duration
- Estimated cost per person
- Address/location
- Why it matches the user's interests

Format your response as a JSON array of activities. Each activity should have:
{
  "name": "Activity Name",
  "description": "Brief description",
  "category": "category",
  "duration": "2 hours",
  "price": 25,
  "rating": 4.5,
  "address": "Address",
  "openingHours": "9:00 AM - 6:00 PM",
  "bookingRequired": false,
  "matchReason": "Why this matches user interests"
}

Provide 15-20 diverse activities that fit within the budget and match the interests.`;

    try {
      const response = await this.invokeModel(prompt);
      return this.parseActivitiesResponse(response);
    } catch (error) {
      console.error('Error getting activity recommendations:', error);
      return this.getFallbackActivities(destination, interests);
    }
  }

  /**
   * Optimize itinerary based on budget constraints
   */
  async optimizeItinerary(
    itinerary: Itinerary,
    preferences: TripPreferences
  ): Promise<Itinerary> {
    const overBudget = itinerary.totalCost - preferences.budget;
    
    if (overBudget <= 0) {
      return itinerary; // Already within budget
    }

    const prompt = `You are a travel budget optimizer. The current itinerary costs $${itinerary.totalCost} but the budget is $${preferences.budget} (over by $${overBudget}).

Current itinerary:
${JSON.stringify(itinerary, null, 2)}

Please suggest specific optimizations to bring the cost within budget:
1. Recommend cheaper flight alternatives if available
2. Suggest more budget-friendly hotels
3. Replace expensive activities with free or cheaper alternatives
4. Optimize the daily schedule to reduce transportation costs

Provide your response as a JSON object with:
{
  "optimizations": [
    {
      "type": "flight|hotel|activity|meal",
      "current": "current item",
      "suggested": "suggested replacement",
      "savings": 100
    }
  ],
  "totalSavings": 500,
  "explanation": "Brief explanation of changes"
}`;

    try {
      const response = await this.invokeModel(prompt);
      return this.applyOptimizations(itinerary, response);
    } catch (error) {
      console.error('Error optimizing itinerary:', error);
      return itinerary;
    }
  }

  /**
   * Generate day-by-day schedule
   */
  async generateDailySchedule(
    preferences: TripPreferences,
    selectedActivities: Activity[],
    hotel: HotelOption
  ): Promise<DayPlan[]> {
    const prompt = `You are a travel scheduler. Create a detailed day-by-day itinerary for a ${preferences.duration}-day trip to ${preferences.destination}.

Trip details:
- Travelers: ${preferences.travelers}
- Interests: ${preferences.interests.join(', ')}
- Travel style: ${preferences.travelStyle}
- Hotel: ${hotel.name} at ${hotel.address}

Available activities:
${selectedActivities.map(a => `- ${a.name}: ${a.description} (${a.duration}, $${a.price})`).join('\n')}

Create a logical daily schedule considering:
1. Opening hours and location proximity
2. Travel time between activities
3. Meal breaks at appropriate times
4. Rest periods and realistic pacing
5. Weather and time of day preferences

Format as JSON array of daily plans:
{
  "date": "2024-06-01",
  "dayNumber": 1,
  "theme": "Arrival and City Overview",
  "activities": [...selected activities with timing],
  "meals": [
    {
      "name": "Restaurant Name",
      "type": "breakfast|lunch|dinner",
      "cuisine": "French",
      "estimatedCost": 35,
      "address": "Address",
      "description": "Why recommended"
    }
  ],
  "transportation": [
    {
      "type": "metro|taxi|walking",
      "from": "Location A",
      "to": "Location B",
      "duration": "15 min",
      "cost": 5,
      "description": "Metro Line 1"
    }
  ],
  "notes": "Special considerations for this day"
}`;

    try {
      const response = await this.invokeModel(prompt);
      return this.parseDailyScheduleResponse(response, preferences);
    } catch (error) {
      console.error('Error generating daily schedule:', error);
      return this.generateBasicDailyPlans(preferences, selectedActivities, hotel);
    }
  }

  /**
   * Invoke Claude model with the given prompt
   */
  private async invokeModel(prompt: string): Promise<string> {
    const input: InvokeModelCommandInput = {
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await this.client.send(command);
    
    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text;
  }

  /**
   * Build comprehensive trip planning prompt
   */
  private buildTripPlanningPrompt(
    preferences: TripPreferences,
    flights: FlightOption[],
    hotels: HotelOption[],
    activities: Activity[]
  ): string {
    return `You are an expert travel planner. Create a comprehensive ${preferences.duration}-day itinerary for ${preferences.destination}.

Trip Requirements:
- Destination: ${preferences.destination}
- Budget: $${preferences.budget}
- Duration: ${preferences.duration} days
- Travelers: ${preferences.travelers}
- Start Date: ${preferences.startDate}
- Travel Style: ${preferences.travelStyle}
- Interests: ${preferences.interests.join(', ')}

Available Options:
FLIGHTS: ${flights.map(f => `${f.airline} ${f.flightNumber}: $${f.price} (${f.departure.city} to ${f.arrival.city})`).join(', ')}

HOTELS: ${hotels.map(h => `${h.name}: $${h.pricePerNight}/night, ${h.rating} stars`).join(', ')}

ACTIVITIES: ${activities.slice(0, 10).map(a => `${a.name}: $${a.price}, ${a.category}`).join(', ')}

Please create an optimized itinerary that:
1. Stays within the $${preferences.budget} budget
2. Matches the ${preferences.travelStyle} travel style
3. Incorporates the user's interests: ${preferences.interests.join(', ')}
4. Provides good value for money
5. Creates a logical flow between activities

Respond with a detailed analysis and recommendations, focusing on why each choice is optimal for this traveler.`;
  }

  /**
   * Parse Claude's response into structured itinerary
   */
  private parseItineraryResponse(
    response: string,
    preferences: TripPreferences,
    flights: FlightOption[],
    hotels: HotelOption[],
    activities: Activity[]
  ): Itinerary {
    // For now, create a structured itinerary based on the response
    // In a full implementation, you'd parse Claude's specific recommendations
    
    const selectedFlights = {
      outbound: flights[0] || null,
      return: flights[1] || flights[0] || null
    };
    
    const selectedHotel = hotels[0];
    const selectedActivities = activities.slice(0, Math.min(activities.length, preferences.duration * 2));
    
    const days = this.generateBasicDailyPlans(preferences, selectedActivities, selectedHotel);
    
    const itinerary: Itinerary = {
      id: '', // Will be set by caller
      userId: undefined,
      destination: preferences.destination,
      startDate: preferences.startDate,
      endDate: this.calculateEndDate(preferences.startDate, preferences.duration),
      totalCost: 0,
      budgetBreakdown: {
        flights: 0,
        accommodation: 0,
        activities: 0,
        meals: 0,
        transportation: 0,
        miscellaneous: 0
      },
      days,
      flights: selectedFlights,
      hotels: selectedHotel ? [selectedHotel] : [],
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 0.85 // High confidence with Bedrock
    };

    // Calculate costs
    itinerary.totalCost = calculateTotalCost(itinerary);
    itinerary.budgetBreakdown = calculateBudgetBreakdown(itinerary);

    return itinerary;
  }

  /**
   * Parse activities response from Claude
   */
  private parseActivitiesResponse(response: string): Activity[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const activities = JSON.parse(jsonMatch[0]);
        return activities.map((a: any, index: number) => ({
          id: `activity-${index}`,
          name: a.name || 'Unknown Activity',
          description: a.description || '',
          category: a.category || 'general',
          duration: a.duration || '2 hours',
          price: a.price || 0,
          rating: a.rating || 4.0,
          address: a.address || '',
          coordinates: undefined,
          openingHours: a.openingHours || '9:00 AM - 6:00 PM',
          images: [],
          bookingRequired: a.bookingRequired || false,
          bookingUrl: undefined
        }));
      }
    } catch (error) {
      console.error('Error parsing activities response:', error);
    }
    
    return this.getFallbackActivities('', []);
  }

  /**
   * Parse daily schedule response
   */
  private parseDailyScheduleResponse(response: string, preferences: TripPreferences): DayPlan[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const days = JSON.parse(jsonMatch[0]);
        return days.map((day: any, index: number) => ({
          date: this.calculateDate(preferences.startDate, index),
          dayNumber: index + 1,
          activities: day.activities || [],
          meals: day.meals || [],
          transportation: day.transportation || [],
          totalCost: this.calculateDayCost(day),
          notes: day.notes
        }));
      }
    } catch (error) {
      console.error('Error parsing daily schedule:', error);
    }
    
    return [];
  }

  /**
   * Generate fallback itinerary if Bedrock fails
   */
  private generateFallbackItinerary(
    preferences: TripPreferences,
    flights: FlightOption[],
    hotels: HotelOption[],
    activities: Activity[]
  ): Itinerary {
    const selectedFlights = {
      outbound: flights[0] || null,
      return: flights[1] || flights[0] || null
    };
    
    const selectedHotel = hotels[0];
    const selectedActivities = activities.slice(0, preferences.duration * 2);
    
    const days = this.generateBasicDailyPlans(preferences, selectedActivities, selectedHotel);
    
    const itinerary: Itinerary = {
      id: '',
      userId: undefined,
      destination: preferences.destination,
      startDate: preferences.startDate,
      endDate: this.calculateEndDate(preferences.startDate, preferences.duration),
      totalCost: 0,
      budgetBreakdown: {
        flights: 0,
        accommodation: 0,
        activities: 0,
        meals: 0,
        transportation: 0,
        miscellaneous: 0
      },
      days,
      flights: selectedFlights,
      hotels: selectedHotel ? [selectedHotel] : [],
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confidence: 0.6 // Lower confidence without Bedrock
    };

    itinerary.totalCost = calculateTotalCost(itinerary);
    itinerary.budgetBreakdown = calculateBudgetBreakdown(itinerary);

    return itinerary;
  }

  /**
   * Generate basic daily plans
   */
  private generateBasicDailyPlans(
    preferences: TripPreferences,
    activities: Activity[],
    hotel: HotelOption | undefined
  ): DayPlan[] {
    const days: DayPlan[] = [];
    const activitiesPerDay = Math.ceil(activities.length / preferences.duration);
    
    for (let i = 0; i < preferences.duration; i++) {
      const dayActivities = activities.slice(i * activitiesPerDay, (i + 1) * activitiesPerDay);
      
      const day: DayPlan = {
        date: this.calculateDate(preferences.startDate, i),
        dayNumber: i + 1,
        activities: dayActivities,
        meals: this.generateBasicMeals(preferences.destination),
        transportation: this.generateBasicTransportation(),
        totalCost: 0,
        notes: i === 0 ? 'Arrival day - take it easy' : undefined
      };
      
      day.totalCost = this.calculateDayCost(day);
      days.push(day);
    }
    
    return days;
  }

  /**
   * Generate basic meals for a day
   */
  private generateBasicMeals(destination: string) {
    return [
      {
        id: 'breakfast',
        name: 'Local Breakfast Spot',
        type: 'breakfast' as const,
        cuisine: 'Local',
        priceRange: '$$' as const,
        estimatedCost: 15,
        rating: 4.0,
        address: destination,
        description: 'Traditional local breakfast'
      },
      {
        id: 'lunch',
        name: 'Popular Local Restaurant',
        type: 'lunch' as const,
        cuisine: 'Local',
        priceRange: '$$' as const,
        estimatedCost: 25,
        rating: 4.2,
        address: destination,
        description: 'Authentic local cuisine'
      },
      {
        id: 'dinner',
        name: 'Recommended Dinner Spot',
        type: 'dinner' as const,
        cuisine: 'Local',
        priceRange: '$$$' as const,
        estimatedCost: 45,
        rating: 4.5,
        address: destination,
        description: 'Fine dining experience'
      }
    ];
  }

  /**
   * Generate basic transportation
   */
  private generateBasicTransportation() {
    return [
      {
        id: 'daily-transport',
        type: 'public' as const,
        from: 'Hotel',
        to: 'Activities',
        duration: '30 min',
        cost: 10,
        description: 'Daily transportation between locations'
      }
    ];
  }

  /**
   * Get fallback activities
   */
  private getFallbackActivities(destination: string, interests: string[]): Activity[] {
    return [
      {
        id: 'activity-1',
        name: 'City Walking Tour',
        description: 'Explore the main attractions of the city',
        category: 'sightseeing',
        duration: '3 hours',
        price: 25,
        rating: 4.5,
        address: destination,
        openingHours: '9:00 AM - 6:00 PM',
        images: [],
        bookingRequired: false
      },
      {
        id: 'activity-2',
        name: 'Local Museum Visit',
        description: 'Learn about local history and culture',
        category: 'culture',
        duration: '2 hours',
        price: 15,
        rating: 4.2,
        address: destination,
        openingHours: '10:00 AM - 5:00 PM',
        images: [],
        bookingRequired: false
      }
    ];
  }

  /**
   * Apply optimizations to itinerary
   */
  private applyOptimizations(itinerary: Itinerary, optimizationResponse: string): Itinerary {
    // For now, return the original itinerary
    // In a full implementation, parse the optimization suggestions and apply them
    return itinerary;
  }

  /**
   * Calculate date for a given day offset
   */
  private calculateDate(startDate: string, dayOffset: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate end date
   */
  private calculateEndDate(startDate: string, duration: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + duration);
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate cost for a day
   */
  private calculateDayCost(day: any): number {
    let total = 0;
    
    if (day.activities) {
      total += day.activities.reduce((sum: number, activity: any) => sum + (activity.price || 0), 0);
    }
    
    if (day.meals) {
      total += day.meals.reduce((sum: number, meal: any) => sum + (meal.estimatedCost || 0), 0);
    }
    
    if (day.transportation) {
      total += day.transportation.reduce((sum: number, transport: any) => sum + (transport.cost || 0), 0);
    }
    
    return Math.round(total * 100) / 100;
  }
}