import { TripPreferences } from '../functions/plan-trip';

export interface TripCreateInput {
  userId: string;
  preferences: TripPreferences;
  status: 'planning' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}