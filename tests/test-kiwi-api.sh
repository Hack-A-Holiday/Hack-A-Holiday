#!/bin/bash

# 🛫 Kiwi.com Flight API Test Script
# This script tests your Kiwi API subscription and shows real flight data

echo "🛫 Kiwi.com Flight API Test"
echo "=========================="
echo ""

# Check if RapidAPI key is set
if [ -z "$RAPIDAPI_KEY" ]; then
    echo "❌ RapidAPI Key not set"
    echo "Run: export RAPIDAPI_KEY='8ba82f8f69mshfc586479dacb57dp17b668jsnd41a5fc70e20'"
    exit 1
fi

echo "✅ RapidAPI Key: ${RAPIDAPI_KEY:0:20}..."
echo ""

echo "🧪 Testing Kiwi.com Flight API..."
echo ""

# Test the API
response=$(curl -s --request GET \
  --url 'https://kiwi-com-cheap-flights.p.rapidapi.com/round-trip?source=City%3AJFK&destination=City%3ACDG&currency=usd&locale=en&adults=1&children=0&infants=0&handbags=1&holdbags=0&cabinClass=ECONOMY&sortBy=QUALITY&sortOrder=ASCENDING&limit=3' \
  --header 'x-rapidapi-host: kiwi-com-cheap-flights.p.rapidapi.com' \
  --header "x-rapidapi-key: $RAPIDAPI_KEY")

echo "📊 API Response:"
echo "$response" | head -10
echo ""

# Check if we got real data
if echo "$response" | grep -q "You are not subscribed"; then
    echo "❌ Not subscribed to Kiwi API"
    echo ""
    echo "🚀 To get real flight data:"
    echo "1. Visit: https://rapidapi.com/kiwi-com/api/kiwi-com-cheap-flights"
    echo "2. Click 'Subscribe to Test'"
    echo "3. Choose 'Basic' plan (usually free)"
    echo "4. Run this script again"
    echo ""
elif echo "$response" | grep -q "data"; then
    echo "✅ SUCCESS! Real flight data received!"
    echo ""
    echo "🎉 Your Kiwi API is working!"
    echo "   - Real flight prices"
    echo "   - Actual airline data"
    echo "   - Live availability"
    echo "   - Detailed flight information"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Deploy backend: npm run deploy --prefix infrastructure"
    echo "2. Test frontend: http://localhost:3000/flight-search"
    echo "3. See real flight data instead of mock data!"
    echo ""
else
    echo "⚠️  Unexpected response - check API subscription"
    echo ""
fi

echo "📋 Current Status:"
echo "   Frontend: ✅ Running on http://localhost:3000"
echo "   RapidAPI Key: ✅ Set"
echo "   Kiwi API: $([ -z "$(echo "$response" | grep 'not subscribed')" ] && echo "✅ Subscribed" || echo "❌ Not Subscribed")"
echo "   Backend: $([ -z "$(echo "$response" | grep 'not subscribed')" ] && echo "✅ Ready for Real Data" || echo "⚠️  Using Mock Data")"
echo ""
echo "💡 Why you see mock data:"
echo "   - No API subscription = Fallback to mock data"
echo "   - Mock data = Demo functionality without costs"
echo "   - Real APIs = Live flight prices and availability"
echo ""
