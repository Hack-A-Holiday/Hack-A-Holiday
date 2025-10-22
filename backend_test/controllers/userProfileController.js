/**
 * User Profile Controller
 * Handles user profile operations by email (for frontend compatibility)
 */

const ddbDocClient = require('../config/dynamo');
const { PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Get user profile by email
 */
exports.getProfileByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`📋 Getting profile for email: ${email}`);
    
    // Try to get profile from DynamoDB using GSI
    const params = {
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1pk': `EMAIL#${email}`,
        ':gsi1sk': 'USER',
      },
    };
    
    const data = await ddbDocClient.send(new QueryCommand(params));
    let profile = data.Items && data.Items[0];
    
    if (!profile) {
      // Create default profile and save to DynamoDB
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      profile = {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: `EMAIL#${email}`,
        GSI1SK: 'USER',
        userId,
        email,
        homeCity: '',
        travelPreferences: {
          budget: 2000,
          travelers: 2,
          travelStyle: 'mid-range',
          favoriteDestinations: [],
          avoidDestinations: [],
          preferredRegions: [],
          interests: [],
          accommodationType: 'hotel',
          roomPreference: 'double',
          flightPreferences: {
            preferDirect: false,
            timePreference: 'any',
            seatPreference: 'any',
            cabinClass: 'economy',
            maxLayovers: 2
          },
          dietaryRestrictions: [],
          cuisinePreferences: [],
          activityLevel: 'moderate',
          groupSize: 'couple',
          preferredDuration: { min: 3, max: 14 },
          preferredSeasons: [],
          avoidSeasons: [],
          numberOfKids: 0,
          ageRanges: [],
          accessibilityNeeds: [],
          language: 'en',
          currency: 'USD',
          travelExperience: 'intermediate',
          lastUpdated: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to DynamoDB
      const putParams = {
        TableName: USERS_TABLE,
        Item: profile,
      };
      await ddbDocClient.send(new PutCommand(putParams));
      console.log(`✅ Created new profile in DynamoDB for: ${email}`);
    }
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
};

/**
 * Update travel preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const { email } = req.params;
    const { preferences } = req.body;
    
    console.log(`💾 Updating preferences for email: ${email}`);
    
    // Get existing profile from DynamoDB
    const params = {
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1pk': `EMAIL#${email}`,
        ':gsi1sk': 'USER',
      },
    };
    
    const data = await ddbDocClient.send(new QueryCommand(params));
    let profile = data.Items && data.Items[0];
    
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Please create a profile first'
      });
    }
    
    // Update preferences
    profile.travelPreferences = { ...profile.travelPreferences, ...preferences };
    profile.updatedAt = new Date().toISOString();
    
    // Save to DynamoDB
    const putParams = {
      TableName: USERS_TABLE,
      Item: profile,
    };
    await ddbDocClient.send(new PutCommand(putParams));
    
    console.log('✅ Travel preferences updated successfully in DynamoDB');
    
    res.json({
      success: true,
      message: 'Travel preferences updated successfully',
      profile
    });
  } catch (error) {
    console.error('❌ Error updating travel preferences:', error);
    res.status(500).json({
      error: 'Failed to update travel preferences',
      message: error.message
    });
  }
};

/**
 * Update home city
 */
exports.updateHomeCity = async (req, res) => {
  try {
    const { email } = req.params;
    const { homeCity } = req.body;
    
    console.log(`🏠 Updating home city for email: ${email} to: ${homeCity}`);
    
    // Get existing profile from DynamoDB
    const params = {
      TableName: USERS_TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1pk': `EMAIL#${email}`,
        ':gsi1sk': 'USER',
      },
    };
    
    const data = await ddbDocClient.send(new QueryCommand(params));
    let profile = data.Items && data.Items[0];
    
    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Please create a profile first'
      });
    }
    
    // Update home city
    profile.homeCity = homeCity;
    profile.updatedAt = new Date().toISOString();
    
    // Save to DynamoDB
    const putParams = {
      TableName: USERS_TABLE,
      Item: profile,
    };
    await ddbDocClient.send(new PutCommand(putParams));
    
    console.log('✅ Home city updated successfully in DynamoDB');
    
    res.json({
      success: true,
      message: 'Home city updated successfully',
      profile
    });
  } catch (error) {
    console.error('❌ Error updating home city:', error);
    res.status(500).json({
      error: 'Failed to update home city',
      message: error.message
    });
  }
};