"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
async function getUserProfile(userId) {
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
//# sourceMappingURL=user-service.js.map