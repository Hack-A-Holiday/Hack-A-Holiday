#!/bin/bash

# 🛫 Flight API Setup Script
# This script helps you set up API keys for real flight data

echo "🛫 Flight API Setup Script"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Current Status:"
echo "   - Frontend: ✅ Running on http://localhost:3000"
echo "   - Backend: ⚠️  Using mock data (no API keys)"
echo "   - APIs: ❌ Not configured"
echo ""

echo "🔑 To get real flight data, you need API keys:"
echo ""
echo "1. 🏆 AMADEUS API (Recommended - Free tier available)"
echo "   - Visit: https://developers.amadeus.com/"
echo "   - Sign up with email"
echo "   - Create new app"
echo "   - Copy API Key & Secret"
echo ""
echo "2. 🏆 RAPIDAPI/SKYSCANNER (Alternative)"
echo "   - Visit: https://rapidapi.com/skyscanner/api/skyscanner-flight-search"
echo "   - Subscribe to plan"
echo "   - Copy API Key"
echo ""

# Check if environment variables are set
if [ -z "$AMADEUS_API_KEY" ]; then
    echo "❌ AMADEUS_API_KEY not set"
else
    echo "✅ AMADEUS_API_KEY is set"
fi

if [ -z "$AMADEUS_API_SECRET" ]; then
    echo "❌ AMADEUS_API_SECRET not set"
else
    echo "✅ AMADEUS_API_SECRET is set"
fi

if [ -z "$RAPIDAPI_KEY" ]; then
    echo "❌ RAPIDAPI_KEY not set"
else
    echo "✅ RAPIDAPI_KEY is set"
fi

echo ""
echo "🚀 Quick Setup (Amadeus):"
echo "1. Get API key from https://developers.amadeus.com/"
echo "2. Run: export AMADEUS_API_KEY='your_key_here'"
echo "3. Run: export AMADEUS_API_SECRET='your_secret_here'"
echo "4. Run: npm run deploy --prefix infrastructure"
echo "5. Test at: http://localhost:3000/flight-search"
echo ""

echo "📊 API Comparison:"
echo "┌───────────────┬─────────────┬──────────────┬─────────────┐"
echo "│ API           │ Real-time   │ Cost         │ Coverage    │"
echo "├───────────────┼─────────────┼──────────────┼─────────────┤"
echo "│ Amadeus       │ ✅ Excellent│ Free tier    │ ✅ Global    │"
echo "│ RapidAPI      │ ⚠️  Good    │ Subscription │ ✅ Good      │"
echo "│ Mock Data     │ ❌ Static   │ Free         │ ❌ Limited   │"
echo "└───────────────┴─────────────┴──────────────┴─────────────┘"
echo ""

echo "💡 Pro Tips:"
echo "   - Start with Amadeus (free tier: 2000 requests/month)"
echo "   - Use test environment for development"
echo "   - Always have fallback to mock data"
echo "   - Implement caching to reduce API calls"
echo ""

echo "📚 Current Mock Data Features:"
echo "   - ✅ 60+ airports across 6 regions"
echo "   - ✅ Detailed passenger selection (adults/children/infants)"
echo "   - ✅ Baggage cost calculations"
echo "   - ✅ Advanced filtering and sorting"
echo "   - ✅ Real-time price updates"
echo "   - ✅ Professional UI/UX"
echo ""

echo "📖 For detailed setup instructions, see: API-SETUP-GUIDE.md"
echo ""
echo "🎯 Ready to get real data? Follow the steps above!"
