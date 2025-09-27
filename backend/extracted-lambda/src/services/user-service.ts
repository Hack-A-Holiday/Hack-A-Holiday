export async function getUserProfile(userId: string) {
  // Simulate fetching user profile from a database
  return {
    id: userId,
    preferences: {
      budget: 2000,
      duration: 7,
      startDate: new Date().toISOString(),
      travelers: 2,
      travelStyle: 'mid-range',
      interests: ['Culture', 'Food'],
    },
  };
}