/**
 * Enhanced Flight Search Lambda Function
 * 
 * Provides advanced flight search capabilities with filtering, sorting,
 * and intelligent recommendations. Follows enterprise-grade patterns.
 * 
 * @author Travel Companion Team
 * @version 1.0.0
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FlightService } from '../services/flight-service';
import { 
  FlightSearchRequest, 
  FlightSearchResponse, 
  FlightSearchFilters,
  FlightSearchPreferences,
  ERROR_CODES 
} from '../types';
import { createErrorResponse, createResponse, handleCorsPreflightRequest } from '../utils/lambda-utils';

/**
 * Enhanced Flight Search Handler
 * 
 * Handles advanced flight search requests with comprehensive filtering,
 * sorting, and recommendation capabilities.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Enhanced Flight Search Request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight
    const corsResponse = handleCorsPreflightRequest(event);
    if (corsResponse) {
      return corsResponse;
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(
        405,
        'Method not allowed. Use POST for flight search.',
        event.requestContext.requestId
      );
    }

    // Parse and validate request body
    if (!event.body) {
      return createErrorResponse(
        400,
        'Request body is required',
        event.requestContext.requestId
      );
    }

    let searchRequest: FlightSearchRequest;
    try {
      searchRequest = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(
        400,
        'Invalid JSON in request body',
        event.requestContext.requestId
      );
    }

    // Validate required fields
    const validationError = validateFlightSearchRequest(searchRequest);
    if (validationError) {
      return createErrorResponse(
        400,
        validationError,
        event.requestContext.requestId
      );
    }

    // Initialize flight service
    const flightService = new FlightService({
      amadeuApiKey: process.env.AMADEUS_API_KEY,
      amadeuApiSecret: process.env.AMADEUS_API_SECRET,
      rapidApiKey: process.env.RAPIDAPI_KEY
    });

    // Perform enhanced flight search
    const searchResponse = await flightService.searchFlightsEnhanced(searchRequest);

    // Log search metrics for analytics
    console.log('Flight Search Metrics:', {
      searchId: searchResponse.searchId,
      totalResults: searchResponse.totalResults,
      searchTime: searchResponse.searchTime,
      fallbackUsed: searchResponse.fallbackUsed,
      requestId: event.requestContext.requestId
    });

    // Return successful response
    return createResponse(200, searchResponse, event.requestContext.requestId);

  } catch (error) {
    console.error('Enhanced Flight Search Error:', error);
    
    return createErrorResponse(
      500,
      'Internal server error during flight search',
      event.requestContext.requestId
    );
  }
};

/**
 * Validate flight search request
 */
function validateFlightSearchRequest(request: FlightSearchRequest): string | null {
  // Required fields
  if (!request.origin || typeof request.origin !== 'string') {
    return 'Origin airport code is required';
  }

  if (!request.destination || typeof request.destination !== 'string') {
    return 'Destination airport code is required';
  }

  if (!request.departureDate || typeof request.departureDate !== 'string') {
    return 'Departure date is required';
  }

  if (!request.passengers || typeof request.passengers !== 'object') {
    return 'Passenger information is required';
  }

  if (!request.passengers.adults || request.passengers.adults < 1) {
    return 'At least one adult passenger is required';
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(request.departureDate)) {
    return 'Departure date must be in YYYY-MM-DD format';
  }

  if (request.returnDate && !dateRegex.test(request.returnDate)) {
    return 'Return date must be in YYYY-MM-DD format';
  }

  // Validate date logic
  const departureDate = new Date(request.departureDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (departureDate < today) {
    return 'Departure date cannot be in the past';
  }

  if (request.returnDate) {
    const returnDate = new Date(request.returnDate);
    if (returnDate <= departureDate) {
      return 'Return date must be after departure date';
    }
  }

  // Validate passenger counts
  if (request.passengers.adults > 9) {
    return 'Maximum 9 adult passengers allowed';
  }

  if (request.passengers.children && request.passengers.children > 9) {
    return 'Maximum 9 child passengers allowed';
  }

  if (request.passengers.infants && request.passengers.infants > request.passengers.adults) {
    return 'Number of infants cannot exceed number of adults';
  }

  // Validate airport codes (basic format check)
  const airportCodeRegex = /^[A-Z]{3}$/;
  if (!airportCodeRegex.test(request.origin)) {
    return 'Origin must be a valid 3-letter airport code';
  }

  if (!airportCodeRegex.test(request.destination)) {
    return 'Destination must be a valid 3-letter airport code';
  }

  // Validate filters if provided
  if (request.filters) {
    const filterError = validateFilters(request.filters);
    if (filterError) {
      return filterError;
    }
  }

  // Validate preferences if provided
  if (request.preferences) {
    const preferenceError = validatePreferences(request.preferences);
    if (preferenceError) {
      return preferenceError;
    }
  }

  return null;
}

/**
 * Validate search filters
 */
function validateFilters(filters: FlightSearchFilters): string | null {
  if (filters.maxPrice !== undefined && filters.maxPrice < 0) {
    return 'Maximum price must be positive';
  }

  if (filters.minPrice !== undefined && filters.minPrice < 0) {
    return 'Minimum price must be positive';
  }

  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && 
      filters.minPrice > filters.maxPrice) {
    return 'Minimum price cannot be greater than maximum price';
  }

  if (filters.maxStops !== undefined && (filters.maxStops < 0 || filters.maxStops > 3)) {
    return 'Maximum stops must be between 0 and 3';
  }

  if (filters.maxDuration !== undefined && filters.maxDuration < 30) {
    return 'Maximum duration must be at least 30 minutes';
  }

  if (filters.minDuration !== undefined && filters.minDuration < 30) {
    return 'Minimum duration must be at least 30 minutes';
  }

  if (filters.departureTimeRange) {
    const timeError = validateTimeRange(filters.departureTimeRange, 'departure time range');
    if (timeError) return timeError;
  }

  if (filters.arrivalTimeRange) {
    const timeError = validateTimeRange(filters.arrivalTimeRange, 'arrival time range');
    if (timeError) return timeError;
  }

  return null;
}

/**
 * Validate search preferences
 */
function validatePreferences(preferences: FlightSearchPreferences): string | null {
  const validTravelStyles = ['budget', 'mid-range', 'luxury'];
  if (!validTravelStyles.includes(preferences.userTravelStyle)) {
    return 'Travel style must be one of: budget, mid-range, luxury';
  }

  const validFlexibility = ['strict', 'moderate', 'flexible'];
  if (!validFlexibility.includes(preferences.flexibility)) {
    return 'Flexibility must be one of: strict, moderate, flexible';
  }

  if (preferences.preferredDepartureTime) {
    const validTimes = ['morning', 'afternoon', 'evening', 'any'];
    if (!validTimes.includes(preferences.preferredDepartureTime)) {
      return 'Preferred departure time must be one of: morning, afternoon, evening, any';
    }
  }

  return null;
}

/**
 * Validate time range
 */
function validateTimeRange(timeRange: { earliest: string; latest: string }, fieldName: string): string | null {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(timeRange.earliest)) {
    return `${fieldName} earliest time must be in HH:MM format`;
  }

  if (!timeRegex.test(timeRange.latest)) {
    return `${fieldName} latest time must be in HH:MM format`;
  }

  const earliestMinutes = parseTimeToMinutes(timeRange.earliest);
  const latestMinutes = parseTimeToMinutes(timeRange.latest);

  if (earliestMinutes >= latestMinutes) {
    return `${fieldName} earliest time must be before latest time`;
  }

  return null;
}

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}
