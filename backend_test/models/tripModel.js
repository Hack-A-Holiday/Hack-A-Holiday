/**
 * Trip Model
 * Handles DynamoDB operations for user trips
 */

const ddbDocClient = require('../config/dynamo');
const { GetCommand, PutCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const TRIPS_TABLE = process.env.TRIPS_TABLE || 'TravelCompanion-Trips-dev';

/**
 * Create a new trip
 * @param {Object} trip - Trip data
 * @returns {Object} Created trip
 */
exports.createTrip = async (trip) => {
  const tripId = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const tripItem = {
    PK: `USER#${trip.userId}`,
    SK: `TRIP#${tripId}`,
    GSI1PK: `USER#${trip.userId}`,
    GSI1SK: `DATE#${trip.departureDate}#${tripId}`,
    id: tripId,
    userId: trip.userId,
    origin: trip.origin,
    destination: trip.destination,
    departureDate: trip.departureDate,
    returnDate: trip.returnDate || null,
    type: trip.type, // 'flight' | 'package' | 'hotel' | 'vacation'
    status: trip.status || 'planned', // 'planned' | 'booked' | 'completed' | 'cancelled'
    details: trip.details || {},
    createdAt: now,
    updatedAt: now,
    // TTL for auto-cleanup: 30 days after return date (or departure if no return)
    ttl: calculateTTL(trip.returnDate || trip.departureDate, 30)
  };

  const params = {
    TableName: TRIPS_TABLE,
    Item: tripItem,
  };

  await ddbDocClient.send(new PutCommand(params));
  console.log('✅ Trip created in DynamoDB:', tripId);
  return tripItem;
};

/**
 * Get all trips for a user
 * @param {string} userId - User ID
 * @param {boolean} includeExpired - Include trips past their date
 * @returns {Array} User trips
 */
exports.getTripsByUserId = async (userId, includeExpired = false) => {
  const params = {
    TableName: TRIPS_TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  let trips = data.Items || [];

  // Filter out expired trips if requested
  if (!includeExpired) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    trips = trips.filter(trip => {
      const tripDate = trip.returnDate || trip.departureDate;
      return tripDate >= todayStr;
    });
  }

  // Sort by departure date (newest first)
  trips.sort((a, b) => new Date(b.departureDate) - new Date(a.departureDate));

  console.log(`📋 Retrieved ${trips.length} trips for user ${userId}`);
  return trips;
};

/**
 * Get a single trip by ID
 * @param {string} userId - User ID
 * @param {string} tripId - Trip ID
 * @returns {Object|null} Trip or null
 */
exports.getTripById = async (userId, tripId) => {
  const params = {
    TableName: TRIPS_TABLE,
    Key: {
      PK: `USER#${userId}`,
      SK: `TRIP#${tripId}`,
    },
  };

  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item || null;
};

/**
 * Update trip status
 * @param {string} userId - User ID
 * @param {string} tripId - Trip ID
 * @param {string} status - New status
 * @returns {Object} Updated trip
 */
exports.updateTripStatus = async (userId, tripId, status) => {
  const trip = await this.getTripById(userId, tripId);
  
  if (!trip) {
    throw new Error('Trip not found');
  }

  trip.status = status;
  trip.updatedAt = new Date().toISOString();

  const params = {
    TableName: TRIPS_TABLE,
    Item: trip,
  };

  await ddbDocClient.send(new PutCommand(params));
  console.log(`✅ Trip ${tripId} status updated to: ${status}`);
  return trip;
};

/**
 * Cancel a trip with reason
 * @param {string} userId - User ID
 * @param {string} tripId - Trip ID
 * @param {string} reason - Cancellation reason
 * @returns {Object} Cancelled trip
 */
exports.cancelTrip = async (userId, tripId, reason) => {
  const trip = await this.getTripById(userId, tripId);
  
  if (!trip) {
    throw new Error('Trip not found');
  }

  trip.status = 'cancelled';
  trip.cancellationReason = reason;
  trip.cancelledAt = new Date().toISOString();
  trip.updatedAt = new Date().toISOString();

  const params = {
    TableName: TRIPS_TABLE,
    Item: trip,
  };

  await ddbDocClient.send(new PutCommand(params));
  console.log(`❌ Trip ${tripId} cancelled. Reason: ${reason}`);
  return trip;
};

/**
 * Delete a trip permanently
 * @param {string} userId - User ID
 * @param {string} tripId - Trip ID
 */
exports.deleteTrip = async (userId, tripId) => {
  const params = {
    TableName: TRIPS_TABLE,
    Key: {
      PK: `USER#${userId}`,
      SK: `TRIP#${tripId}`,
    },
  };

  await ddbDocClient.send(new DeleteCommand(params));
  console.log(`🗑️ Trip ${tripId} deleted permanently`);
};

/**
 * Get trip statistics for a user
 * @param {string} userId - User ID
 * @returns {Object} Statistics
 */
exports.getTripStats = async (userId) => {
  const trips = await this.getTripsByUserId(userId, true); // Include all trips

  // Count unique countries (based on destination)
  const destinations = new Set();
  let totalSpent = 0;
  let tripsPlanned = 0;
  let tripsCompleted = 0;

  trips.forEach(trip => {
    destinations.add(trip.destination);
    
    if (trip.details && trip.details.totalPrice) {
      totalSpent += trip.details.totalPrice;
    }

    if (trip.status === 'planned' || trip.status === 'booked') {
      tripsPlanned++;
    }
    
    if (trip.status === 'completed') {
      tripsCompleted++;
    }
  });

  return {
    tripsPlanned,
    tripsCompleted,
    totalTrips: trips.length,
    destinationsExplored: destinations.size,
    totalSpent: Math.round(totalSpent)
  };
};

/**
 * Cleanup expired trips (called by scheduled task)
 * Removes trips where returnDate (or departureDate) + 30 days < today
 * @returns {number} Number of trips deleted
 */
exports.cleanupExpiredTrips = async () => {
  console.log('🧹 Starting cleanup of expired trips...');
  
  // Scan all trips (in production, use a GSI with status or date)
  const params = {
    TableName: TRIPS_TABLE,
  };

  const data = await ddbDocClient.send(new ScanCommand(params));
  const trips = data.Items || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  let deletedCount = 0;

  for (const trip of trips) {
    const tripEndDate = trip.returnDate || trip.departureDate;
    
    // Delete if trip ended more than 30 days ago
    if (tripEndDate < cutoffDateStr) {
      await ddbDocClient.send(new DeleteCommand({
        TableName: TRIPS_TABLE,
        Key: {
          PK: trip.PK,
          SK: trip.SK,
        },
      }));
      deletedCount++;
      console.log(`🗑️ Deleted expired trip: ${trip.id} (ended on ${tripEndDate})`);
    }
  }

  console.log(`✅ Cleanup complete. Deleted ${deletedCount} expired trips.`);
  return deletedCount;
};

/**
 * Calculate TTL timestamp (Unix epoch seconds)
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {number} daysToAdd - Days to add after date
 * @returns {number} TTL timestamp in seconds
 */
function calculateTTL(dateStr, daysToAdd) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + daysToAdd);
  return Math.floor(date.getTime() / 1000);
}
