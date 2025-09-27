import Joi from 'joi';
import { TripPreferences, BookingRequest } from '../types';

// Validation schemas
export const tripPreferencesSchema = Joi.object<TripPreferences>({
  destination: Joi.string().min(2).max(100).required()
    .messages({
      'string.empty': 'Destination is required',
      'string.min': 'Destination must be at least 2 characters',
      'string.max': 'Destination must be less than 100 characters'
    }),
  
  budget: Joi.number().min(100).max(100000).required()
    .messages({
      'number.base': 'Budget must be a number',
      'number.min': 'Budget must be at least $100',
      'number.max': 'Budget must be less than $100,000'
    }),
  
  duration: Joi.number().integer().min(1).max(30).required()
    .messages({
      'number.base': 'Duration must be a number',
      'number.integer': 'Duration must be a whole number of days',
      'number.min': 'Trip must be at least 1 day',
      'number.max': 'Trip cannot exceed 30 days'
    }),
  
  interests: Joi.array().items(Joi.string().min(1).max(50)).min(1).max(10).required()
    .messages({
      'array.min': 'Please select at least one interest',
      'array.max': 'Please select no more than 10 interests'
    }),
  
  startDate: Joi.string().isoDate().required()
    .custom((value, helpers) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        return helpers.error('date.past');
      }
      
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      
      if (date > maxDate) {
        return helpers.error('date.future');
      }
      
      return value;
    })
    .messages({
      'string.isoDate': 'Start date must be a valid date',
      'date.past': 'Start date cannot be in the past',
      'date.future': 'Start date cannot be more than 2 years in the future'
    }),
  
  travelers: Joi.number().integer().min(1).max(20).required()
    .messages({
      'number.base': 'Number of travelers must be a number',
      'number.integer': 'Number of travelers must be a whole number',
      'number.min': 'Must have at least 1 traveler',
      'number.max': 'Cannot exceed 20 travelers'
    }),
  
  travelStyle: Joi.string().valid('budget', 'mid-range', 'luxury').optional(),
  accommodationType: Joi.string().valid('hotel', 'hostel', 'apartment', 'any').optional()
});

export const bookingRequestSchema = Joi.object<BookingRequest>({
  itineraryId: Joi.string().uuid().required()
    .messages({
      'string.empty': 'Itinerary ID is required',
      'string.uuid': 'Invalid itinerary ID format'
    }),
  
  userId: Joi.string().uuid().optional(),
  
  selectedOptions: Joi.object({
    flightIds: Joi.array().items(Joi.string().uuid()).min(1).max(2).required()
      .messages({
        'array.min': 'At least one flight must be selected',
        'array.max': 'Cannot select more than 2 flights (outbound and return)'
      }),
    
    hotelId: Joi.string().uuid().required()
      .messages({
        'string.empty': 'Hotel selection is required'
      }),
    
    activityIds: Joi.array().items(Joi.string().uuid()).max(20).optional()
      .messages({
        'array.max': 'Cannot select more than 20 activities'
      })
  }).required()
});

// Validation functions
export function validateTripPreferences(data: any): { 
  isValid: boolean; 
  data?: TripPreferences; 
  errors?: string[] 
} {
  const { error, value } = tripPreferencesSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return { isValid: false, errors };
  }
  
  return { isValid: true, data: value };
}

export function validateBookingRequest(data: any): { 
  isValid: boolean; 
  data?: BookingRequest; 
  errors?: string[] 
} {
  const { error, value } = bookingRequestSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return { isValid: false, errors };
  }
  
  return { isValid: true, data: value };
}

// Budget validation utilities
export function validateBudgetAllocation(
  totalBudget: number,
  flightCost: number,
  hotelCost: number,
  activityCost: number
): { isValid: boolean; message?: string; breakdown: any } {
  const breakdown = {
    flights: flightCost,
    hotels: hotelCost,
    activities: activityCost,
    total: flightCost + hotelCost + activityCost,
    remaining: totalBudget - (flightCost + hotelCost + activityCost)
  };
  
  if (breakdown.total > totalBudget) {
    return {
      isValid: false,
      message: `Total cost ($${breakdown.total}) exceeds budget ($${totalBudget})`,
      breakdown
    };
  }
  
  // Check if flight cost is too high (should be max 50% of budget)
  if (flightCost > totalBudget * 0.5) {
    return {
      isValid: false,
      message: `Flight cost ($${flightCost}) exceeds 50% of budget ($${totalBudget * 0.5})`,
      breakdown
    };
  }
  
  // Check if hotel cost is too high (should be max 40% of budget)
  if (hotelCost > totalBudget * 0.4) {
    return {
      isValid: false,
      message: `Hotel cost ($${hotelCost}) exceeds 40% of budget ($${totalBudget * 0.4})`,
      breakdown
    };
  }
  
  return { isValid: true, breakdown };
}

// Date validation utilities
export function validateDateRange(startDate: string, duration: number): {
  isValid: boolean;
  endDate?: string;
  message?: string;
} {
  try {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (start < today) {
      return {
        isValid: false,
        message: 'Start date cannot be in the past'
      };
    }
    
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    
    if (end > maxDate) {
      return {
        isValid: false,
        message: 'Trip end date cannot be more than 2 years in the future'
      };
    }
    
    return {
      isValid: true,
      endDate: end.toISOString().split('T')[0]
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Invalid date format'
    };
  }
}

// Interest validation
export const VALID_INTERESTS = [
  'culture', 'history', 'museums', 'art', 'architecture',
  'food', 'nightlife', 'shopping', 'nature', 'hiking',
  'beaches', 'adventure', 'sports', 'photography',
  'music', 'festivals', 'local-experiences', 'wellness',
  'family-friendly', 'budget-friendly', 'luxury'
];

export function validateInterests(interests: string[]): {
  isValid: boolean;
  validInterests?: string[];
  invalidInterests?: string[];
} {
  const validInterests = interests.filter(interest => 
    VALID_INTERESTS.includes(interest.toLowerCase())
  );
  
  const invalidInterests = interests.filter(interest => 
    !VALID_INTERESTS.includes(interest.toLowerCase())
  );
  
  return {
    isValid: invalidInterests.length === 0,
    validInterests,
    invalidInterests
  };
}