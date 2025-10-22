/**
 * User Profile Model
 * Handles DynamoDB operations for user profiles and preferences
 */

const ddbDocClient = require('../config/dynamo');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TRIPS_TABLE = process.env.TRIPS_TABLE; // Reuse the same table with different SK

/**
 * Get user profile
 * @param {string} userEmail - User email
 * @returns {Object} User profile
 */
exports.getUserProfile = async (userEmail) => {
  const params = {
    TableName: TRIPS_TABLE,
    Key: {
      PK: `USER#${userEmail}`,
      SK: 'PROFILE',
    },
  };

  const data = await ddbDocClient.send(new GetCommand(params));
  
  if (data.Item) {
    console.log(`📋 Retrieved profile for user ${userEmail}`);
    return data.Item;
  } else {
    // Return default profile if none exists
    const defaultProfile = {
      PK: `USER#${userEmail}`,
      SK: 'PROFILE',
      email: userEmail,
      homeCity: '',
      travelPreferences: {
        budget: 2000,
        travelers: 2,
        travelStyle: 'mid-range',
        interests: [],
        accommodationType: 'hotel',
        activityLevel: 'moderate',
        flightPreferences: {
          preferDirect: false,
          timePreference: 'any',
          seatPreference: 'any',
          cabinClass: 'economy',
          maxLayovers: 2
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log(`📋 Created default profile for new user ${userEmail}`);
    return defaultProfile;
  }
};

/**
 * Update travel preferences
 * @param {string} userEmail - User email
 * @param {Object} preferences - Travel preferences
 */
exports.updateTravelPreferences = async (userEmail, preferences) => {
  // Get existing profile or create new one
  const existingProfile = await this.getUserProfile(userEmail);
  
  const updatedProfile = {
    ...existingProfile,
    travelPreferences: {
      ...existingProfile.travelPreferences,
      ...preferences,
      lastUpdated: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  const params = {
    TableName: TRIPS_TABLE,
    Item: updatedProfile,
  };

  await ddbDocClient.send(new PutCommand(params));
  console.log(`💾 Travel preferences updated for user ${userEmail}`);
};

/**
 * Update home city
 * @param {string} userEmail - User email
 * @param {string} homeCity - Home city
 */
exports.updateHomeCity = async (userEmail, homeCity) => {
  // Get existing profile or create new one
  const existingProfile = await this.getUserProfile(userEmail);
  
  const updatedProfile = {
    ...existingProfile,
    homeCity,
    updatedAt: new Date().toISOString()
  };

  const params = {
    TableName: TRIPS_TABLE,
    Item: updatedProfile,
  };

  await ddbDocClient.send(new PutCommand(params));
  console.log(`🏠 Home city updated for user ${userEmail}: ${homeCity}`);
};