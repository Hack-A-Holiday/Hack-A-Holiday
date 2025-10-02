import { UserProfile } from '../types';

export async function getUserProfile(userId: string): Promise<UserProfile> {
  // Simulate fetching user profile from a database
  return {
    id: userId,
    email: `${userId}@example.com`,
    role: 'normal',
    preferences: {
      defaultBudget: 2000,
      favoriteDestinations: ['Paris, France'],
      interests: ['culture', 'food'],
      travelStyle: 'mid-range',
      dietaryRestrictions: [],
      accessibility: [],
      budget: 2000,
      duration: 7,
      startDate: new Date().toISOString(),
      travelers: 2,
    },
    tripHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEmailVerified: true,
  };
}