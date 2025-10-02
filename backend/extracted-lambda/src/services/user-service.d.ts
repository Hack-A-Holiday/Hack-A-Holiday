export declare function getUserProfile(userId: string): Promise<{
    id: string;
    preferences: {
        budget: number;
        duration: number;
        startDate: string;
        travelers: number;
        travelStyle: string;
        interests: string[];
    };
}>;
//# sourceMappingURL=user-service.d.ts.map