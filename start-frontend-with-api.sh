#!/bin/bash

echo "🚀 Starting frontend with RapidAPI key for real flight data..."

# Set the RapidAPI key environment variable
export NEXT_PUBLIC_RAPIDAPI_KEY=8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20

# Start the frontend
cd frontend
npm run dev
