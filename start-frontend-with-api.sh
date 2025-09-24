#!/bin/bash

echo "🚀 Starting frontend with RapidAPI key for real flight data..."

# Set the RapidAPI key environment variable
export NEXT_PUBLIC_RAPIDAPI_KEY=dc260b79a1mshf60901d122bb384p183ba0jsn9093522cbb9b

# Start the frontend
cd frontend
npm run dev
