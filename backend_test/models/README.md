# Models

- `userModel.js`: DynamoDB logic for users (get by email, get by id, create user).
- Add more models for trips, bookings, etc. as needed.

**DynamoDB Table Setup:**
- Table name: `HackAHolidayUsers`
- Primary key: `id` (string, UUID)
- GSI: `email-index` (partition key: `email`)
