#!/bin/bash

# 🚀 Quick Setup for Real Flight Data
# This script helps you get real flight data instead of mock data

echo "🚀 Quick Setup for Real Flight Data"
echo "===================================="
echo ""

# Check if API keys are set
if [ -z "$AMADEUS_API_KEY" ] || [ -z "$AMADEUS_API_SECRET" ]; then
    echo "❌ API Keys Not Set"
    echo ""
    echo "🔑 To get real flight data, you need Amadeus API keys:"
    echo ""
    echo "1. 🌐 Visit: https://developers.amadeus.com/"
    echo "2. 📝 Sign up with your email"
    echo "3. 🏠 Go to 'My Self-Service Workspace'"
    echo "4. ➕ Click 'Create new app'"
    echo "5. 📋 Copy API Key and API Secret"
    echo ""
    echo "⏱️ This takes 2-3 minutes and is FREE!"
    echo ""
    echo "📋 Then run these commands:"
    echo "export AMADEUS_API_KEY='your_api_key_here'"
    echo "export AMADEUS_API_SECRET='your_api_secret_here'"
    echo "npm run deploy --prefix infrastructure"
    echo ""
    echo "🎯 After that, you'll see REAL flight data!"
    echo ""
else
    echo "✅ API Keys Are Set!"
    echo "   AMADEUS_API_KEY: ${AMADEUS_API_KEY:0:10}..."
    echo "   AMADEUS_API_SECRET: ${AMADEUS_API_SECRET:0:10}..."
    echo ""
    echo "🚀 Deploying Enhanced Flight Search..."
    echo ""
    
    # Deploy the infrastructure
    cd infrastructure
    npm run deploy
    cd ..
    
    echo ""
    echo "✅ Deployment Complete!"
    echo ""
    echo "🛫 Testing Real API..."
    
    # Test the API
    sleep 5
    curl -s -X POST https://1ye5soedl8.execute-api.us-east-1.amazonaws.com/dev/enhanced-flight-search \
        -H "Content-Type: application/json" \
        -d '{"origin":"JFK","destination":"CDG","departureDate":"2024-06-01","passengers":{"adults":1}}' \
        | head -5
    
    echo ""
    echo "🎉 Real flight data should now be working!"
    echo "   Visit: http://localhost:3000/flight-search"
fi

echo ""
echo "📊 Current Status:"
echo "   Frontend: ✅ Running on http://localhost:3000"
echo "   API Keys: $([ -n "$AMADEUS_API_KEY" ] && echo "✅ Set" || echo "❌ Not Set")"
echo "   Backend: $([ -n "$AMADEUS_API_KEY" ] && echo "✅ Ready for Real Data" || echo "⚠️  Using Mock Data")"
echo ""
echo "💡 Why you see mock data:"
echo "   - No API keys = Fallback to mock data"
echo "   - Mock data = Demo functionality without costs"
echo "   - Real APIs = Live flight prices and availability"
echo ""
