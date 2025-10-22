#!/bin/bash

# ============================================
# HACK-A-HOLIDAY - ENVIRONMENT SETUP SCRIPT
# ============================================

echo "🚀 Setting up environment files for Hack-A-Holiday..."

# Create backend .env file
echo "📝 Creating backend .env file..."
cp backend_test/env-config.txt backend_test/.env
echo "✅ Backend .env file created at backend_test/.env"

# Create frontend .env.local file
echo "📝 Creating frontend .env.local file..."
cp frontend/env-config.txt frontend/.env.local
echo "✅ Frontend .env.local file created at frontend/.env.local"

# Create root .env file (if needed)
echo "📝 Creating root .env file..."
cp backend_test/env-config.txt .env
echo "✅ Root .env file created at .env"

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Files created:"
echo "   - backend_test/.env"
echo "   - frontend/.env.local" 
echo "   - .env"
echo ""
echo "⚠️  IMPORTANT: Update AWS credentials in the .env files:"
echo "   - AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID_HERE"
echo "   - AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY_HERE"
echo ""
echo "🔧 All API keys are already configured:"
echo "   ✅ RapidAPI Key: 24f23bfac5mshfe0b77ad3d50a04p1ab5acjsnf565c088c8b4"
echo "   ✅ Booking.com API: booking-com18.p.rapidapi.com"
echo "   ✅ TripAdvisor API: tripadvisor-api.p.rapidapi.com"
echo "   ⚠️  Kiwi.com API: Rate limited (429 errors)"
echo ""
echo "🚀 Ready to start the application!"
