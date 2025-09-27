import { 
  validateTripPreferences, 
  validateBookingRequest,
  validateBudgetAllocation,
  validateDateRange,
  validateInterests,
  VALID_INTERESTS
} from '../validation';

describe('Validation Utils', () => {
  describe('validateTripPreferences', () => {
    const validPreferences = {
      destination: 'Paris, France',
      budget: 2000,
      duration: 5,
      interests: ['culture', 'food', 'museums'],
      startDate: '2024-06-01',
      travelers: 2,
      travelStyle: 'mid-range' as const,
      accommodationType: 'hotel' as const
    };

    it('should validate correct trip preferences', () => {
      const result = validateTripPreferences(validPreferences);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validPreferences);
      expect(result.errors).toBeUndefined();
    });

    it('should reject missing required fields', () => {
      const invalid = { ...validPreferences };
      delete (invalid as any).destination;
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Destination is required');
    });

    it('should reject budget too low', () => {
      const invalid = { ...validPreferences, budget: 50 };
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Budget must be at least $100');
    });

    it('should reject budget too high', () => {
      const invalid = { ...validPreferences, budget: 150000 };
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Budget must be less than $100,000');
    });

    it('should reject duration too short', () => {
      const invalid = { ...validPreferences, duration: 0 };
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trip must be at least 1 day');
    });

    it('should reject duration too long', () => {
      const invalid = { ...validPreferences, duration: 35 };
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trip cannot exceed 30 days');
    });

    it('should reject empty interests array', () => {
      const invalid = { ...validPreferences, interests: [] };
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select at least one interest');
    });

    it('should reject too many travelers', () => {
      const invalid = { ...validPreferences, travelers: 25 };
      
      const result = validateTripPreferences(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot exceed 20 travelers');
    });
  });

  describe('validateBookingRequest', () => {
    const validBooking = {
      itineraryId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      selectedOptions: {
        flightIds: ['123e4567-e89b-12d3-a456-426614174002'],
        hotelId: '123e4567-e89b-12d3-a456-426614174003',
        activityIds: ['123e4567-e89b-12d3-a456-426614174004']
      }
    };

    it('should validate correct booking request', () => {
      const result = validateBookingRequest(validBooking);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validBooking);
    });

    it('should reject invalid UUID format', () => {
      const invalid = { ...validBooking, itineraryId: 'invalid-uuid' };
      
      const result = validateBookingRequest(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid itinerary ID format');
    });

    it('should reject missing flight selection', () => {
      const invalid = { 
        ...validBooking, 
        selectedOptions: { 
          ...validBooking.selectedOptions, 
          flightIds: [] 
        } 
      };
      
      const result = validateBookingRequest(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one flight must be selected');
    });
  });

  describe('validateBudgetAllocation', () => {
    it('should validate budget within limits', () => {
      const result = validateBudgetAllocation(2000, 800, 600, 400);
      expect(result.isValid).toBe(true);
      expect(result.breakdown.total).toBe(1800);
      expect(result.breakdown.remaining).toBe(200);
    });

    it('should reject budget exceeded', () => {
      const result = validateBudgetAllocation(2000, 1000, 800, 600);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('exceeds budget');
    });

    it('should reject flight cost too high', () => {
      const result = validateBudgetAllocation(2000, 1200, 400, 200);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Flight cost');
      expect(result.message).toContain('exceeds 50% of budget');
    });

    it('should reject hotel cost too high', () => {
      const result = validateBudgetAllocation(2000, 600, 900, 200);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Hotel cost');
      expect(result.message).toContain('exceeds 40% of budget');
    });
  });

  describe('validateDateRange', () => {
    it('should validate future date range', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateString = futureDate.toISOString().split('T')[0];
      
      const result = validateDateRange(dateString, 5);
      expect(result.isValid).toBe(true);
      expect(result.endDate).toBeDefined();
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateString = pastDate.toISOString().split('T')[0];
      
      const result = validateDateRange(dateString, 5);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('cannot be in the past');
    });

    it('should reject dates too far in future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 3);
      const dateString = farFuture.toISOString().split('T')[0];
      
      const result = validateDateRange(dateString, 5);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('more than 2 years in the future');
    });
  });

  describe('validateInterests', () => {
    it('should validate all valid interests', () => {
      const interests = ['culture', 'food', 'museums'];
      const result = validateInterests(interests);
      
      expect(result.isValid).toBe(true);
      expect(result.validInterests).toEqual(interests);
      expect(result.invalidInterests).toEqual([]);
    });

    it('should identify invalid interests', () => {
      const interests = ['culture', 'invalid-interest', 'food'];
      const result = validateInterests(interests);
      
      expect(result.isValid).toBe(false);
      expect(result.validInterests).toEqual(['culture', 'food']);
      expect(result.invalidInterests).toEqual(['invalid-interest']);
    });

    it('should handle case insensitive interests', () => {
      const interests = ['CULTURE', 'Food', 'Museums'];
      const result = validateInterests(interests);
      
      expect(result.isValid).toBe(true);
      expect(result.validInterests).toEqual(['CULTURE', 'Food', 'Museums']);
    });
  });
});