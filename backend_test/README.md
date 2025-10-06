# Hack-A-Holiday Backend (Express MVC)

## Features
- Express.js MVC structure (controllers, services, routes)
- User authentication (JWT, HttpOnly cookie)
- Trip planning, booking, user profile endpoints
- CORS and cookie support for frontend integration
- In-memory user store (replace with DB for production)

## Usage
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   npm run dev
   ```
3. API runs at `http://localhost:4000`

## Folder Structure
- `controllers/` — Route logic
- `services/` — Business/data logic
- `routes/` — Route definitions
- `models/` — (Add DB models here)
- `middleware/` — (Add custom middleware here)
- `config/` — (Add config files here)

## Environment
- Configure `.env` for secrets and CORS origin
