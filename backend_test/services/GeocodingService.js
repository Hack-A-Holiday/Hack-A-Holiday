// services/GeocodingService.js
// Service to get latitude/longitude coordinates using AWS Bedrock Nova Pro

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

class GeocodingService {
  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    // Use Nova Pro if Nova Lite access not enabled
    this.model = process.env.FAST_MODEL || 'us.amazon.nova-pro-v1:0';
    
    console.log('🌍 Geocoding Service initialized with Nova Pro');
  }

  /**
   * Get coordinates for a location using Bedrock Nova
   * @param {string} location - City name, address, or location description
   * @returns {Promise<{latitude: number, longitude: number, displayName: string}>}
   */
  async getCoordinates(location) {
    try {
      console.log(`🔍 Getting coordinates for: ${location}`);

      const prompt = `You are a geocoding assistant. Given a location name, return ONLY a JSON object with latitude, longitude, and display name.

Location: ${location}

Return ONLY this JSON format, nothing else:
{
  "latitude": <number>,
  "longitude": <number>,
  "displayName": "<city, country>"
}

Example for "Paris":
{
  "latitude": 48.8566,
  "longitude": 2.3522,
  "displayName": "Paris, France"
}

Now return the JSON for: ${location}`;

      const response = await this.bedrockClient.send(new ConverseCommand({
        modelId: this.model,
        messages: [{
          role: 'user',
          content: [{ text: prompt }]
        }],
        inferenceConfig: {
          maxTokens: 200,
          temperature: 0.1, // Low temperature for consistent results
          topP: 0.9
        }
      }));

      let responseText = '';
      if (response.output.message.content) {
        for (const content of response.output.message.content) {
          if (content.text) {
            responseText += content.text;
          }
        }
      }

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const coords = JSON.parse(jsonMatch[0]);
        console.log(`✅ Found coordinates:`, coords);
        return coords;
      }

      throw new Error('Could not parse coordinates from response');

    } catch (error) {
      console.error('❌ Geocoding error:', error);
      
      // Fallback to known major cities
      return this.getFallbackCoordinates(location);
    }
  }

  /**
   * Get coordinates for multiple locations at once
   * @param {string[]} locations - Array of location names
   * @returns {Promise<Array>}
   */
  async getBatchCoordinates(locations) {
    try {
      console.log(`🔍 Getting coordinates for ${locations.length} locations`);

      const promises = locations.map(location => this.getCoordinates(location));
      const results = await Promise.all(promises);

      return results;
    } catch (error) {
      console.error('❌ Batch geocoding error:', error);
      throw error;
    }
  }

  /**
   * Get route coordinates (source and destination) for globe visualization
   * @param {string} source - Starting location
   * @param {string} destination - Ending location
   * @returns {Promise<{source: {lat, lng, name}, destination: {lat, lng, name}}>}
   */
  async getRouteCoordinates(source, destination) {
    try {
      console.log(`🗺️ Getting route: ${source} → ${destination}`);

      const [sourceCoords, destCoords] = await Promise.all([
        this.getCoordinates(source),
        this.getCoordinates(destination)
      ]);

      return {
        source: {
          lat: sourceCoords.latitude,
          lng: sourceCoords.longitude,
          name: sourceCoords.displayName
        },
        destination: {
          lat: destCoords.latitude,
          lng: destCoords.longitude,
          name: destCoords.displayName
        }
      };

    } catch (error) {
      console.error('❌ Route coordinates error:', error);
      throw error;
    }
  }

  /**
   * Fallback coordinates for major cities when AI fails
   */
  getFallbackCoordinates(location) {
    const knownLocations = {
      'washington dc': { latitude: 38.9072, longitude: -77.0369, displayName: 'Washington DC, USA' },
      'new york': { latitude: 40.7128, longitude: -74.0060, displayName: 'New York, USA' },
      'los angeles': { latitude: 34.0522, longitude: -118.2437, displayName: 'Los Angeles, USA' },
      'london': { latitude: 51.5074, longitude: -0.1278, displayName: 'London, UK' },
      'paris': { latitude: 48.8566, longitude: 2.3522, displayName: 'Paris, France' },
      'tokyo': { latitude: 35.6762, longitude: 139.6503, displayName: 'Tokyo, Japan' },
      'dubai': { latitude: 25.2048, longitude: 55.2708, displayName: 'Dubai, UAE' },
      'singapore': { latitude: 1.3521, longitude: 103.8198, displayName: 'Singapore' },
      'sydney': { latitude: -33.8688, longitude: 151.2093, displayName: 'Sydney, Australia' },
      'mumbai': { latitude: 19.0760, longitude: 72.8777, displayName: 'Mumbai, India' },
      'bali': { latitude: -8.3405, longitude: 115.0920, displayName: 'Bali, Indonesia' },
      'bangkok': { latitude: 13.7563, longitude: 100.5018, displayName: 'Bangkok, Thailand' },
      'rome': { latitude: 41.9028, longitude: 12.4964, displayName: 'Rome, Italy' },
      'barcelona': { latitude: 41.3874, longitude: 2.1686, displayName: 'Barcelona, Spain' },
      'amsterdam': { latitude: 52.3676, longitude: 4.9041, displayName: 'Amsterdam, Netherlands' }
    };

    const locationLower = location.toLowerCase();
    
    // Try exact match
    if (knownLocations[locationLower]) {
      console.log(`📍 Using fallback coordinates for ${location}`);
      return knownLocations[locationLower];
    }

    // Try partial match
    for (const [key, value] of Object.entries(knownLocations)) {
      if (locationLower.includes(key) || key.includes(locationLower)) {
        console.log(`📍 Using fallback coordinates for ${location} (matched: ${key})`);
        return value;
      }
    }

    // Default to New York if nothing matches
    console.log(`⚠️ No match found for ${location}, defaulting to New York`);
    return knownLocations['new york'];
  }
}

module.exports = new GeocodingService();
