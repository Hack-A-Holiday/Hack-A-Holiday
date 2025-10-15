class IntegratedAITravelAgent {
  /**
   * Process a user message and return AI response
   */
  async processMessage(userId, message) {
    // Example: load context, extract preferences, and return a stub response
    const context = await this.getUserContext(userId);
    const preferences = this.extractPreferencesFromMessage(message, context.preferences);
    // Stub intent extraction (replace with real logic)
    let intent = null;
    if (message && typeof message === 'string') {
      if (message.toLowerCase().includes('flight')) intent = 'flight_search';
      else if (message.toLowerCase().includes('hotel')) intent = 'hotel_search';
      else if (message.toLowerCase().includes('plan')) intent = 'trip_planning';
      else intent = 'general_query';
    }
    // If missingInfo is present, ask user for required info
    if (preferences.missingInfo) {
      return {
        reply: preferences.missingInfo,
        context,
        intent
      };
    }
    // TODO: Add real AI logic here
    return {
      reply: `Received your message: "${message}". Preferences: ${JSON.stringify(preferences)}`,
      context,
      intent
    };
  }
  /**
   * Extract user preferences from a message string
   */
  extractPreferencesFromMessage(message) {
    // If message is missing, use preferences from user object
    if (!message || typeof message !== 'string') {
      return { missingInfo: 'Please provide your travel details (destination, dates, etc.)' };
    }
    // Simple keyword-based extraction (can be improved)
    const preferences = {};
    const lower = message.toLowerCase();
    if (lower.includes('budget')) preferences.travelStyle = 'budget';
    if (lower.includes('luxury')) preferences.travelStyle = 'luxury';
    if (lower.includes('adventure')) preferences.interests = ['adventure'];
    if (lower.includes('beach')) preferences.interests = ['beach'];
    if (lower.match(/\d+\s*(days|nights)/)) preferences.duration = lower.match(/\d+/)[0];
    // Add more extraction rules as needed
    return preferences;
  }
  /**
   * Get user context for chat/AI agent
   */
  async getUserContext(userId) {
    // Load user preferences and recent conversation
    const preferences = await this.loadUserPreferences(userId);
    const conversation = this.conversations ? this.conversations.get(userId) : [];
    return {
      userId,
      preferences,
      conversation
    };
  }
      /**
      // ...existing code for all methods inside the class...
      }
      module.exports = IntegratedAITravelAgent;
      }, null, 2));

      // Return null if API failed or no results
      if (!results || results.provider === 'mock') {
        console.log('   ⚠️ Hotel API unavailable or only mock data, returning null');
        console.log('🏨 ===== HOTEL API FETCH END (NO REAL DATA) =====\n');
        return null;
      }

      const returnData = {
        type: 'hotel',
        request: searchRequest,
        results: results.hotels || [],
        totalResults: results.hotels?.length || 0,
        provider: results.provider,
        searchTime: results.searchTime
      };
      
      console.log('   ✅ Returning real hotel data:', JSON.stringify({
        type: returnData.type,
        totalResults: returnData.totalResults,
        provider: returnData.provider
      }, null, 2));
      console.log('🏨 ===== HOTEL API FETCH END (SUCCESS) =====\n');

      return returnData;

    } catch (error) {
      console.error('\n   ❌ HOTEL API ERROR:');
      console.error('   Error Message:', error.message);
      console.error('   Error Stack:', error.stack);
      console.error('   Error Code:', error.code);
      console.error('   Error Response:', error.response?.data);
      console.log('🏨 ===== HOTEL API FETCH END (ERROR) =====\n');
      return null; // Return null instead of fallback data
    }
  }

  /**
   * Build comprehensive context prompt for Bedrock
   */
  buildContextPrompt(userQuery, conversationHistory, userPreferences, realData, queryIntent, userProfileSummary = '', conversationSummary = null) {
    const lowerQuery = userQuery.toLowerCase(); // Define lowerQuery for use throughout method
    
  let contextPrompt = 'You are an expert AI travel assistant helping users plan their perfect trips.\n\n=== USER CONTEXT ===\n\nIMPORTANT: If you cannot provide a direct answer to the user\'s query (for example, live sports schedules, directions, or unavailable flight/hotel data), you MUST provide a helpful link to an official or trusted source. Use the following rules:\n\n1. For Barcelona football match queries, include this link: https://www.fcbarcelona.com/en/football/first-team/schedule\n2. For directions (how to get from point A to point B), include a Google Maps link in this format:\n   https://www.google.com/maps/dir/?api=1&origin=ORIGIN&destination=DESTINATION (replace ORIGIN and DESTINATION with the user\'s locations)\n3. For flight searches with no results, include a Google Flights link in this format:\n   https://www.google.com/travel/flights?q=ORIGIN%20to%20DESTINATION%20DATE (replace ORIGIN, DESTINATION, DATE)\n4. For hotel searches with no results, include links to Booking.com, Hotels.com, and Airbnb for the destination.\n5. For general travel questions, always prefer official or government tourism sites if available.\n\nAlways explain why you are providing the link, and make it easy for the user to click and continue their search. NEVER hallucinate data or make up details. If you provide a link, use clear anchor text (e.g., "Official Barcelona Match Schedule", "Google Maps Directions", "Search on Google Flights").';

    // Add conversation summary FIRST (highest priority for context awareness)
    if (conversationSummary) {
  contextPrompt += '\nCONVERSATION CONTEXT:\n' + conversationSummary + '\n\n';
  contextPrompt += 'IMPORTANT: Use this conversation context to understand what the user is planning. If they ask for "flights" and the context shows they\'re planning a trip to Japan, search for flights to Japan.\n\n';
    }

    // Add learned user profile summary
    if (userProfileSummary) {
      contextPrompt += userProfileSummary;
    }

    // Add user preferences
    if (Object.keys(userPreferences).length > 0) {
  contextPrompt += '\nUser Preferences & Trip Details:\n';
      
      // Current trip details (from trip planning form)
      if (userPreferences.currentTripOrigin) {
  contextPrompt += '- Origin: ' + userPreferences.currentTripOrigin + '\n';
      }
      if (userPreferences.currentTripDestination) {
  contextPrompt += '- Destination: ' + userPreferences.currentTripDestination + '\n';
      }
      if (userPreferences.currentTripDuration) {
  contextPrompt += '- Duration: ' + userPreferences.currentTripDuration + ' days\n';
      }
      if (userPreferences.currentTripStartDate) {
  contextPrompt += '- Start Date: ' + userPreferences.currentTripStartDate + '\n';
      }
      if (userPreferences.budget) {
  contextPrompt += '- Budget: $' + userPreferences.budget + '\n';
      }
      if (userPreferences.travelers) {
  contextPrompt += '- Number of Travelers: ' + userPreferences.travelers + '\n';
      }
      if (userPreferences.travelStyle) {
  contextPrompt += '- Travel Style: ' + userPreferences.travelStyle + '\n';
      }
      if (userPreferences.interests && Array.isArray(userPreferences.interests)) {
  contextPrompt += '- Interests: ' + userPreferences.interests.join(', ') + '\n';
      }
      
      // Stored preferences
      if (userPreferences.preferredDestinations) {
  contextPrompt += '- Favorite Destinations: ' + userPreferences.preferredDestinations.join(', ') + '\n';
      }
      if (userPreferences.budgetRange) {
  contextPrompt += '- Budget Range: ' + userPreferences.budgetRange + '\n';
      }
    }

    // Add conversation history with full context
    if (conversationHistory.length > 0) {
  contextPrompt += '\n=== RECENT CONVERSATION ===\n';
      conversationHistory.slice(-5).forEach(turn => {
  contextPrompt += 'User: ' + turn.user + '\n';
  contextPrompt += 'Assistant: ' + turn.assistant.substring(0, 200) + (turn.assistant.length > 200 ? '...' : '') + '\n\n';
      });
      
      // Emphasize multi-destination context if detected
      if (queryIntent.multiDestination && queryIntent.extractedInfo.destinations) {
  contextPrompt += '\nCRITICAL CONTEXT: User asked about ' + queryIntent.extractedInfo.destinations.length + ' destinations: ' + queryIntent.extractedInfo.destinations.join(', ') + '\n';
  contextPrompt += 'You MUST provide information about ALL ' + queryIntent.extractedInfo.destinations.length + ' destinations mentioned, not just the first one!\n\n';
      }
    }

    // Add real data if fetched
    if (realData && !realData.error) {
  contextPrompt += '\n=== REAL-TIME DATA ===\n';
      
      // Handle combined flight + hotel data
      if (realData.type === 'combined') {
        // Add flight data
        if (realData.flights && realData.flights.results && realData.flights.results.length > 0) {
          contextPrompt += '\nFLIGHT OPTIONS (' + realData.flights.totalResults + ' found):\n';
          // Show all flights so AI can present complete options
          realData.flights.results.forEach((flight, idx) => {
            contextPrompt += '\nFlight Option ' + (idx + 1) + ':\n';
            contextPrompt += '- Airline: ' + (flight.airline || 'N/A') + ' (' + (flight.flightNumber || 'N/A') + ')\n';
            contextPrompt += '- Price: ' + (flight.price || 'N/A') + ' ' + (flight.currency || 'USD') + '\n';
            contextPrompt += '- Route: ' + (flight.origin || realData.flights.request.origin) + ' to ' + (flight.destination || realData.flights.request.destination) + '\n';
            contextPrompt += '- Departure: ' + (flight.departureDate || 'N/A') + ' at ' + (flight.departureTime || 'N/A') + '\n';
            contextPrompt += '- Arrival: ' + (flight.arrivalTime || 'N/A') + '\n';
            contextPrompt += '- Duration: ' + (flight.duration || 'N/A') + '\n';
            contextPrompt += `- Stops: ${flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}\n`;
            if (flight.stopDetails && flight.stopDetails.length > 0) {
              contextPrompt += `- Layovers: ${flight.stopDetails.map(s => `${s.airport || s.city} (${s.duration})`).join(', ')}\n`;
            }
          });
        }
        
        // Add hotel data
        if (realData.hotels && realData.hotels.results && realData.hotels.results.length > 0) {
          contextPrompt += `\n\nHOTEL OPTIONS (${realData.hotels.totalResults} found):\n`;
          realData.hotels.results.slice(0, 5).forEach((hotel, idx) => {
            contextPrompt += `\nHotel Option ${idx + 1}:\n`;
            contextPrompt += `- Name: ${hotel.name || 'N/A'}\n`;
            contextPrompt += `- Price: ${hotel.price || 'N/A'} ${hotel.currency || 'USD'} per night\n`;
            contextPrompt += `- Rating: ${hotel.rating || 'N/A'} ⭐\n`;
            contextPrompt += `- Location: ${hotel.location || 'N/A'}\n`;
          });
        }
      }
      // Handle flight-only data
      else if (realData.type === 'flight') {
  contextPrompt += 'Flight Search Results (' + realData.totalResults + ' options found):\n';
  contextPrompt += '\nCRITICAL PRICE INSTRUCTION: All prices below are ALREADY in ' + (realData.currency || 'the correct currency') + '. Display them EXACTLY as shown. DO NOT convert, multiply, or change the numbers in any way! If you see "45564 INR", display it as "45564 INR" or "INR 45,564" - nothing else!\n\n';
        if (realData.results.length > 0) {
          // Show all flights (not just 5) so AI can present them all
          realData.results.forEach(function(flight, idx) {
            var roundedPrice = Math.round(parseFloat(flight.price) || 0);
            var departureTime = flight.departureTime ? 
              (flight.departureTime.includes('T') ? flight.departureTime.split('T')[1].substring(0, 5) : flight.departureTime) : 'N/A';
            var arrivalTime = flight.arrivalTime ? 
              (flight.arrivalTime.includes('T') ? flight.arrivalTime.split('T')[1].substring(0, 5) : flight.arrivalTime) : 'N/A';
            contextPrompt += '\nOption ' + (idx + 1) + ':\n';
            contextPrompt += '- Airline: ' + (flight.airline || 'N/A') + ' (' + (flight.flightNumber || 'N/A') + ')\n';
            contextPrompt += '- Price: ' + roundedPrice + ' ' + (flight.currency || realData.currency || 'USD') + ' (IMPORTANT: Use this EXACT number - do NOT convert or multiply!)\n';
            contextPrompt += '- Route: ' + (flight.origin || 'N/A') + ' to ' + (flight.destination || 'N/A') + '\n';
            contextPrompt += '- Departure: ' + (flight.departureDate || 'N/A') + ' at ' + departureTime + '\n';
            contextPrompt += '- Arrival: ' + arrivalTime + '\n';
            contextPrompt += '- Duration: ' + (flight.duration || 'N/A') + '\n';
            contextPrompt += '- Stops: ' + (flight.stops === 0 ? 'Direct' : (flight.stops + ' stop' + (flight.stops > 1 ? 's' : ''))) + '\n';
            if (flight.stopDetails && flight.stopDetails.length > 0) {
              contextPrompt += '- Layovers: ' + flight.stopDetails.map(function(s) { return (s.airport || s.city) + ' (' + s.duration + ')'; }).join(', ') + '\n';
            }
          });
        } else if (realData.googleFlightsFallback) {
          // No results but Google Flights fallback available
          contextPrompt += 'No flights found in our database.\n';
          contextPrompt += 'IMPORTANT: Tell the user you can help them search on Google Flights instead.\n';
          contextPrompt += 'Google Flights URL: ' + realData.googleFlightsFallback.url + '\n';
          contextPrompt += 'YOU MUST include this clickable link in your response so users can continue their search.\n';
        } else {
          contextPrompt += 'No flights found. Provide general guidance.\n';
        }
        contextPrompt += `\nSearch Details:\n`;
  contextPrompt += '\nSearch Details:\n';
  contextPrompt += '- Route: ' + realData.request.origin + ' to ' + realData.request.destination + '\n';
  contextPrompt += '- Date: ' + realData.request.departureDate + '\n';
  contextPrompt += '- Passengers: ' + realData.request.passengers.adults + '\n';
      }
      // Handle hotel-only data
      else if (realData.type === 'hotel') {
  contextPrompt += 'Hotel Search Results (' + realData.totalResults + ' options found):\n';
        if (realData.results.length > 0) {
          realData.results.slice(0, 5).forEach((hotel, idx) => {
            contextPrompt += '\nOption ' + (idx + 1) + ':\n';
            contextPrompt += '- Name: ' + (hotel.name || 'N/A') + '\n';
            contextPrompt += '- Price: ' + (hotel.price || 'N/A') + ' ' + (hotel.currency || 'USD') + ' per night\n';
            contextPrompt += '- Rating: ' + (hotel.rating || 'N/A') + '\n';
            contextPrompt += '- Location: ' + (hotel.location || 'N/A') + '\n';
          });
        } else {
          contextPrompt += 'No hotels found. Provide general recommendations.\n';
        }
  contextPrompt += '\nSearch Details:\n';
  contextPrompt += '- Destination: ' + realData.request.destination + '\n';
  contextPrompt += '- Check-in: ' + realData.request.checkIn + '\n';
  contextPrompt += '- Check-out: ' + realData.request.checkOut + '\n';
      }
      // Handle multi-destination flight comparison
      else if (realData.type === 'multi_destination_comparison') {
        // Get currency from top level (preferred) or first destination
        const currency = realData.currency || realData.destinations[0]?.flightData?.currency || 'USD';
        const currencySymbol = this.getCurrencySymbol(currency);
        
  console.log('Context building - Using currency: ' + currency + ' to ' + currencySymbol);
        
  contextPrompt += '\n=== REAL-TIME MULTI-DESTINATION FLIGHT COMPARISON ===\n';
  contextPrompt += 'Flight prices from ' + (realData.destinations[0] && realData.destinations[0].flightData && realData.destinations[0].flightData.request && realData.destinations[0].flightData.request.origin ? realData.destinations[0].flightData.request.origin : 'origin') + ':\n\n';
        
        realData.destinations.forEach((dest, idx) => {
          var roundedPrice = Math.round(parseFloat(dest.cheapestPrice) || 0);
          contextPrompt += (idx + 1) + '. ' + dest.destination + ': ' + currencySymbol + roundedPrice + ' (cheapest option)\n';
          if (dest.flightData.results.length > 0) {
            var topFlight = dest.flightData.results[0];
            contextPrompt += '   - Airline: ' + (topFlight.airline || 'N/A') + '\n';
            contextPrompt += '   - Duration: ' + (topFlight.duration || 'N/A') + '\n';
            contextPrompt += '   - Stops: ' + (topFlight.stops || 'Direct') + '\n';
          }
          contextPrompt += '\n';
        });
      }
      // Handle multi-destination hotel comparison
      else if (realData.type === 'multi_destination_hotel_comparison') {
        contextPrompt += '\n=== REAL-TIME MULTI-DESTINATION HOTEL COMPARISON ===\n';
        contextPrompt += 'Hotel prices comparison:\n\n';
        realData.destinations.forEach(function(dest, idx) {
          contextPrompt += (idx + 1) + '. ' + dest.destination + ':\n';
          contextPrompt += '   - Cheapest: $' + dest.cheapestPrice + ' per night\n';
          contextPrompt += '   - Average: $' + dest.averagePrice + ' per night\n';
          if (dest.hotelData.results.length > 0) {
            var topHotel = dest.hotelData.results[0];
            contextPrompt += '   - Best Option: ' + (topHotel.name || 'N/A') + '\n';
            contextPrompt += '   - Rating: ' + (topHotel.rating || 'N/A') + '\n';
          }
          contextPrompt += '\n';
        });
      }
    }

    contextPrompt += `\n=== CURRENT QUERY ===\n`;
    contextPrompt += `Query Type: ${queryIntent.type}\n`;
    contextPrompt += `User Question: ${userQuery}\n\n`;

    contextPrompt += `=== YOUR TASK ===\n`;
    
    // Category-specific instructions
    if (realData && realData.type === 'multi_destination_comparison') {
      // Get currency from top level (preferred) or first destination
      const comparisonCurrency = realData.currency || realData.destinations[0]?.flightData?.currency || 'USD';
      const comparisonSymbol = this.getCurrencySymbol(comparisonCurrency);
      
      console.log(`💰 Multi-destination comparison currency: ${comparisonCurrency} → Symbol: ${comparisonSymbol}`);
      
      contextPrompt += `MULTI-DESTINATION FLIGHT COMPARISON MODE - Real price data available!\n\n`;
      contextPrompt += `🚨 CRITICAL RULES - NO EXCEPTIONS:\n`;
      contextPrompt += `1. User asked about ${realData.destinations.length} destinations: ${realData.destinations.map(d => d.destination).join(', ')}\n`;
      contextPrompt += `2. You MUST show price comparison for ALL ${realData.destinations.length} destinations, not just the first one!\n`;
      contextPrompt += `3. All prices MUST use ${comparisonSymbol} symbol, NOT $ or any other symbol!\n`;
      contextPrompt += `4. Round ALL prices to integers (no decimals)\n`;
      contextPrompt += `5. The user wants to COMPARE prices side-by-side, not see detailed flight lists!\n\n`;
      contextPrompt += `Your ONLY job is to:\n`;
      contextPrompt += `1. START with a quick comparison summary showing ALL ${realData.destinations.length} destination prices side-by-side\n`;
      contextPrompt += `2. Rank ALL ${realData.destinations.length} destinations from CHEAPEST to most expensive\n`;
      contextPrompt += `3. Use ONLY the real prices from the data above with currency symbol: ${comparisonSymbol} (NOT $)\n`;
      contextPrompt += `4. After the comparison, briefly mention 1-2 best flights for the cheapest option\n`;
      contextPrompt += `5. Keep it SUPER concise - comparison should be ${realData.destinations.length} lines showing each destination\n`;
      contextPrompt += `6. DO NOT list all flights for all destinations - that's too much!\n`;
      contextPrompt += `7. NO EMOJIS - use plain text formatting only\n\n`;
      contextPrompt += `REQUIRED FORMAT (notice the ${comparisonSymbol} symbol, NOT $):\n\n`;
      contextPrompt += `"Real-time flight price comparison from [origin]:\n\n`;
      
      // Generate numbered list based on actual number of destinations
      const sortedDests = [...realData.destinations].sort((a, b) => a.cheapestPrice - b.cheapestPrice);
      sortedDests.forEach((dest, idx) => {
        const label = idx === 0 ? 'CHEAPEST: ' : (idx === sortedDests.length - 1 ? 'MOST EXPENSIVE: ' : '');
        const roundedPrice = Math.round(parseFloat(dest.cheapestPrice) || 0);
        contextPrompt += `${idx + 1}. ${label}${dest.destination} - ${comparisonSymbol}${roundedPrice}\n`;
      });
      
      contextPrompt += `\nBest Deal: ${sortedDests[0].destination} is the cheapest at ${comparisonSymbol}${Math.round(sortedDests[0].cheapestPrice)}. Here are the best options:\n`;
      if (sortedDests[0].flightData.results.length > 0) {
        const topFlight = sortedDests[0].flightData.results[0];
        contextPrompt += `- ${topFlight.airline || 'N/A'}, ${topFlight.stops === 0 ? 'Direct' : topFlight.stops + ' stop'}, ${topFlight.duration || 'N/A'}, Departs ${topFlight.departureTime || 'TBD'}\n`;
      }
      
      contextPrompt += `\nAll prices shown are for the best available flight options. Need more details about a specific destination? Just ask!"\n\n`;
      contextPrompt += `IMPORTANT: After your response, you MUST add Google Flights button markers using this EXACT FORMAT:\n\n`;
      contextPrompt += `Search more options:\n`;
      
      // Add Google Flights button markers for each destination
      if (realData.destinations && realData.destinations.length > 0) {
        realData.destinations.forEach(dest => {
          if (dest.flightData?.request) {
            const googleUrl = this.buildGoogleFlightsUrlSync(dest.flightData.request);
            contextPrompt += `- ${dest.destination}: [GOOGLE_FLIGHTS_BUTTON]${googleUrl}[/GOOGLE_FLIGHTS_BUTTON]\n`;
          }
        });
      }
      
      contextPrompt += `\n🚫 CRITICAL: Your response MUST END with the button markers - DO NOT add standalone numbers after them!\n`;
      contextPrompt += `REMEMBER: Use ${comparisonSymbol} for ALL prices, not $!\n`;
      contextPrompt += `DO NOT show detailed flight lists for all destinations. Focus on the COMPARISON.\n\n`;
    } else if (realData && realData.type === 'multi_destination_hotel_comparison') {
      contextPrompt += `MULTI-DESTINATION HOTEL COMPARISON MODE - Real price data available!\n\n`;
      contextPrompt += `CRITICAL: The user wants to COMPARE hotel prices, not see detailed hotel lists!\n\n`;
      contextPrompt += `Your ONLY job is to:\n`;
      contextPrompt += `1. START with a quick comparison summary showing prices side-by-side\n`;
      contextPrompt += `2. Rank destinations from CHEAPEST to most expensive (use cheapest price per night)\n`;
      contextPrompt += `3. Use ONLY the real prices from the data above\n`;
      contextPrompt += `4. After the comparison, briefly mention 1-2 best hotels for the cheapest destination\n`;
      contextPrompt += `5. Keep it SUPER concise - comparison should be 3-5 lines max\n`;
      contextPrompt += `6. DO NOT list all hotels for all destinations - that's too much!\n`;
      contextPrompt += `7. NO EMOJIS - use plain text formatting only\n\n`;
      contextPrompt += `REQUIRED FORMAT:\n`;
      contextPrompt += `"Real-time hotel price comparison:\n\n`;
      contextPrompt += `1. CHEAPEST: [Destination] - from $XXX/night\n`;
      contextPrompt += `2. [Destination] - from $XXX/night\n`;
      contextPrompt += `3. [Destination] - from $XXX/night\n`;
      contextPrompt += `4. MOST EXPENSIVE: [Destination] - from $XXX/night\n\n`;
      contextPrompt += `Best Deal: [Destination] has the most affordable hotels starting at $XXX/night. Top options:\n`;
      contextPrompt += `- [Hotel Name], [Rating] stars, $XXX/night\n`;
      contextPrompt += `- [Alternative if needed]\n\n`;
      contextPrompt += `Prices are per night. Need details for another destination? Just ask!"\n\n`;
      contextPrompt += `DO NOT show detailed hotel lists for all destinations. Focus on the COMPARISON.\n\n`;
    } else if (queryIntent.type === 'flight_search') {
      // FLIGHT SEARCH - Focus on flights only
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `✈️ FLIGHT SEARCH MODE - Real flight data is available!\n\n`;
        
        // Add preference-aware intro message
        const prefs = userPreferences || {};
        let prefMessage = '';
        
        if (prefs.flightPreferences) {
          const fp = prefs.flightPreferences;
          const prefParts = [];
          
          if (fp.preferredCabinClass && fp.preferredCabinClass !== 'economy') {
            prefParts.push(`${fp.preferredCabinClass} class`);
          }
          if (fp.maxStops === 0) {
            prefParts.push('direct flights only');
          } else if (fp.maxStops === 1) {
            prefParts.push('max 1 stop');
          }
          if (fp.preferredAirlines && fp.preferredAirlines.length > 0) {
            prefParts.push(`preferred airlines: ${fp.preferredAirlines.slice(0, 2).join(', ')}`);
          }
          if (fp.preferredDepartureTime) {
            prefParts.push(`${fp.preferredDepartureTime} departures`);
          }
          
          if (prefParts.length > 0) {
            prefMessage = `Based on your profile preferences (${prefParts.join(', ')}), here are the best matching flight options`;
          }
        }
        
        if (!prefMessage) {
          prefMessage = 'Here are the top flight options';
        }
        
        contextPrompt += `CRITICAL FORMATTING RULES:\n`;
        contextPrompt += `1. Start with this intro: "${prefMessage} from [origin] to [destination] for [dates]:"\n`;
        contextPrompt += `2. Present each flight in this EXACT format:\n\n`;
        contextPrompt += `   Option X:\n`;
        contextPrompt += `   - Airline: [Name] (Flight [Number])\n`;
        contextPrompt += `   - Price: [ROUNDED_PRICE] ${realData.currency || 'USD'}\n`;
        contextPrompt += `   - Departure: [YYYY-MM-DD] at [HH:MM]\n`;
        contextPrompt += `   - Arrival: [HH:MM]\n`;
        contextPrompt += `   - Duration: [Hours]h [Minutes]m\n`;
        contextPrompt += `   - Stops: [Direct/1 stop/X stops] [If stops, show: "via [City]"]\n`;
        contextPrompt += `   - Why Choose: [Brief reason like "Cheapest option", "Fastest direct flight", "Most convenient timing"]\n\n`;
        contextPrompt += `3. CRITICAL: Round ALL prices to nearest integer (no decimals like 48362.981262)\n`;
        contextPrompt += `4. CRITICAL: Format dates as YYYY-MM-DD, times as HH:MM (not ISO timestamps like 2025-10-27T11:05:00)\n`;
        contextPrompt += `5. CRITICAL: Use currency ${realData.currency || 'USD'}, NOT $\n`;
        contextPrompt += `6. Present ALL available flights from the data (typically 3-5+ options)\n`;
        contextPrompt += `7. After ALL flights, add this EXACT TEXT on a NEW LINE:\n\n`;
        contextPrompt += `   [GOOGLE_FLIGHTS_BUTTON]${this.buildGoogleFlightsUrlSync(realData.request)}[/GOOGLE_FLIGHTS_BUTTON]\n\n`;
        contextPrompt += `8. 🚫 CRITICAL: DO NOT add a list of standalone numbers after the button marker\n`;
        contextPrompt += `9. 🚫 CRITICAL: Your response MUST END with the button marker - nothing after it!\n`;
        contextPrompt += `10. DO NOT repeat prices in a list after the flights\n`;
        contextPrompt += `11. DO NOT create itineraries, mention hotels, or add day-by-day plans\n`;
        contextPrompt += `12. Use the EXACT flight data provided above - don't make up details\n`;
        contextPrompt += `13. The [GOOGLE_FLIGHTS_BUTTON] marker will be converted to a beautiful button by the frontend\n\n`;
        contextPrompt += `WRONG RESPONSE EXAMPLE (DO NOT DO THIS):\n`;
        contextPrompt += `Option 1: ... Price: 62491 USD\n`;
        contextPrompt += `[GOOGLE_FLIGHTS_BUTTON]...[/GOOGLE_FLIGHTS_BUTTON]\n`;
        contextPrompt += `62491\n`;  // ← 🚫 DO NOT ADD THESE NUMBERS!
        contextPrompt += `63203\n`;
        contextPrompt += `64106\n\n`;
        contextPrompt += `CORRECT RESPONSE EXAMPLE:\n`;
        contextPrompt += `Option 1: ... Price: 62491 USD\n`;
        contextPrompt += `[GOOGLE_FLIGHTS_BUTTON]...[/GOOGLE_FLIGHTS_BUTTON]\n`;  // ← ✅ END HERE!
        contextPrompt += `(Your response ends here - no extra text or numbers!)\n\n`;
      } else {
        contextPrompt += `✈️ FLIGHT SEARCH MODE - Cannot fetch flight data\n\n`;
        
        // Check if we need country clarification
        const isCountryClarification = realData && realData.type === 'country_clarification_needed';
        
        // Check if destination is a region (Europe, Asia, etc.) instead of specific city
        const isRegionalQuery = queryIntent.extractedInfo?.destination && 
          ['europe', 'asia', 'africa', 'south america', 'north america', 'oceania', 'caribbean', 
           'middle east', 'southeast asia', 'south asia', 'east asia', 'central america', 
           'mediterranean', 'scandinavia', 'balkans', 'baltic', 'iberian peninsula'].some(region => 
            queryIntent.extractedInfo.destination.toLowerCase().includes(region.toLowerCase())
          );
        
        // Priority 1: Country clarification (user searched "Japan" instead of "Tokyo")
        if (isCountryClarification) {
          const countryName = realData.country.charAt(0).toUpperCase() + realData.country.slice(1);
          const suggestions = realData.suggestions || [];
          
          contextPrompt += `The user searched for flights to "${countryName}" (a country, not a specific city).\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n\n`;
          contextPrompt += `"I'd love to help you find flights to ${countryName}! 🇯🇵\n\n`;
          contextPrompt += `To get you the best flight options, could you specify which city in ${countryName} you'd like to visit?\n\n`;
          
          if (suggestions.length > 0) {
            contextPrompt += `**Popular destinations in ${countryName}:**\n`;
            suggestions.slice(0, 6).forEach((city, idx) => {
              contextPrompt += `${idx + 1}. **${city}**\n`;
            });
            contextPrompt += `\n`;
          }
          
          contextPrompt += `💡 **Why this matters**: Flight searches work best with specific city airports. For example, "Tokyo" will show you flights to both Narita (NRT) and Haneda (HND) airports.\n\n`;
          contextPrompt += `Once you pick a city, I'll fetch real-time flight prices and options for you!"\n\n`;
          contextPrompt += `BE FRIENDLY AND HELPFUL. Use the country's flag emoji if appropriate.\n\n`;
        }
        // Priority 2: Check if missing origin or destination
        else if (!queryIntent.extractedInfo?.origin && !queryIntent.extractedInfo?.destination) {
          contextPrompt += `The user asked about flights but didn't specify WHICH destination.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"I'd be happy to check real-time flight prices for you!\n\n`;
          contextPrompt += `Which specific destination would you like me to search flights for? For example:\n`;
          contextPrompt += `- 'Check flights to Bali'\n`;
          contextPrompt += `- 'Show me flights to Cebu'\n`;
          contextPrompt += `- 'What are flight prices to Goa?'\n\n`;
          contextPrompt += `Once you tell me, I'll fetch live flight data and prices for you!"\n\n`;
        } else if (isRegionalQuery) {
          // User mentioned a region (e.g., "Europe", "Asia") not a specific city
          contextPrompt += `The user mentioned a REGION (${queryIntent.extractedInfo?.destination}) not a specific city.\n\n`;
          contextPrompt += `YOUR RESPONSE MUST:\n`;
          contextPrompt += `1. Acknowledge their interest in ${queryIntent.extractedInfo?.destination}\n`;
          contextPrompt += `2. Suggest 4-5 popular/affordable cities in that region\n`;
          contextPrompt += `3. Ask which specific city they'd like flight prices for\n`;
          contextPrompt += `4. Be friendly and helpful, not robotic\n`;
          contextPrompt += `5. Consider their preferences (budget, interests) when suggesting cities\n\n`;
          contextPrompt += `EXAMPLE FORMAT:\n`;
          contextPrompt += `"Great choice! ${queryIntent.extractedInfo?.destination} has amazing destinations. Here are some popular cities I can search flights for:\n\n`;
          contextPrompt += `- Paris (France) - Culture, art, cuisine\n`;
          contextPrompt += `- Barcelona (Spain) - Beach, architecture\n`;
          contextPrompt += `- Rome (Italy) - History, food\n`;
          contextPrompt += `- Amsterdam (Netherlands) - Canals, museums\n`;
          contextPrompt += `- Prague (Czech Republic) - Budget-friendly, beautiful\n\n`;
          contextPrompt += `Which city would you like me to check flight prices for? Or I can compare multiple cities for you!"\n\n`;
          contextPrompt += `Adapt the cities based on the region and user preferences!\n\n`;
        } else if (!queryIntent.extractedInfo?.origin) {
          // Check if user has a saved home city
          if (userPreferences.homeCity) {
            contextPrompt += `User has saved home city: ${userPreferences.homeCity}.\n`;
            contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
            contextPrompt += `"I'd love to search flights to ${queryIntent.extractedInfo?.destination}!\n\n`;
            contextPrompt += `Should I search from your home city (${userPreferences.homeCity}) or a different city?\n\n`;
            contextPrompt += `Just reply:\n`;
            contextPrompt += `- 'Yes' or 'Home city' to use ${userPreferences.homeCity}\n`;
            contextPrompt += `- Or tell me another city like 'From Delhi' or 'Bangalore'"\n\n`;
          } else {
            contextPrompt += `Missing origin city. Ask:\n`;
            contextPrompt += `"I'd love to search flights to ${queryIntent.extractedInfo?.destination}! Where are you flying from?"\n\n`;
          }
        } else if (!queryIntent.extractedInfo?.destination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I can search flights from ${queryIntent.extractedInfo?.origin}! Which destination are you interested in?"\n\n`;
        } else if (!queryIntent.extractedInfo?.departureDate) {
          // Missing dates - ask user for travel dates
          contextPrompt += `Missing travel dates.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"I'd love to search flights from ${queryIntent.extractedInfo?.origin} to ${queryIntent.extractedInfo?.destination}!\n\n`;
          contextPrompt += `When are you planning to travel? Please provide:\n`;
          contextPrompt += `- Departure date (e.g., 'October 20' or '2025-10-20')\n`;
          contextPrompt += `- Return date (optional, for round-trip)\n\n`;
          contextPrompt += `Or you can say something like:\n`;
          contextPrompt += `- 'First week of November'\n`;
          contextPrompt += `- 'Departing October 20, returning October 29'\n`;
          contextPrompt += `- 'Next weekend' (for a quick trip)"\n\n`;
        } else {
          // API Error or No Results - provide Google Flights redirect with helpful suggestions
          contextPrompt += `API returned no flights or encountered an error.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          
          const origin = queryIntent.extractedInfo?.origin || '';
          const destination = queryIntent.extractedInfo?.destination || '';
          const depDate = queryIntent.extractedInfo?.departureDate || '';
          const retDate = queryIntent.extractedInfo?.returnDate || '';
          
          // Build Google Flights URL
          if (origin && destination) {
            let googleFlightsUrl = 'https://www.google.com/travel/flights';
            if (retDate) {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}%20returning%20${retDate}`;
            } else if (depDate) {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${depDate}`;
            } else {
              googleFlightsUrl += `?q=Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}`;
            }
            
            contextPrompt += `"I'm having trouble finding live flight data for **${origin} to ${destination}** on these dates.\n\n`;
            contextPrompt += `This could be because:\n`;
            contextPrompt += `- Flights aren't available yet for these dates (check if booking window is open)\n`;
            contextPrompt += `- The route may require connecting flights through major hubs\n`;
            contextPrompt += `- Try searching for a major city instead of the country (e.g., "Tokyo" instead of "Japan")\n\n`;
            contextPrompt += `🔗 **Search on Google Flights**: [Click here](${googleFlightsUrl})\n\n`;
            contextPrompt += `💡 **Alternative Options**:\n`;
            contextPrompt += `- **Skyscanner**: Great for comparing multiple airlines - [skyscanner.com](https://www.skyscanner.com/)\n`;
            contextPrompt += `- **Kayak**: Shows price trends and alerts - [kayak.com](https://www.kayak.com/)\n`;
            contextPrompt += `- **Momondo**: Often finds hidden deals - [momondo.com](https://www.momondo.com/)\n\n`;
            
            // Add helpful tips based on destination
            if (destination.toLowerCase().includes('japan')) {
              contextPrompt += `💡 **Tip for Japan**: Try searching for specific cities like "Tokyo (NRT/HND)" or "Osaka (KIX)" instead of "Japan" for better results.\n\n`;
            }
            
            contextPrompt += `I'll keep trying to get you live data! Meanwhile, I can help you with:\n`;
            contextPrompt += `- Creating a detailed itinerary for your trip\n`;
            contextPrompt += `- Recommending the best areas to stay\n`;
            contextPrompt += `- Suggesting must-see attractions and seasonal activities\n\n`;
            contextPrompt += `What would you like help with?"\n\n`;
          } else {
            contextPrompt += `"I'm having trouble fetching flight data right now. Please try:\n`;
            contextPrompt += `- **Google Flights**: [flights.google.com](https://www.google.com/travel/flights)\n`;
            contextPrompt += `- **Skyscanner**: [skyscanner.com](https://www.skyscanner.com/)\n`;
            contextPrompt += `- **Kayak**: [kayak.com](https://www.kayak.com/)\n\n`;
            contextPrompt += `Or provide more specific details (origin city, destination city, exact dates) and I'll try again!"\n\n`;
          }
        }
        contextPrompt += `DO NOT create itineraries when asked for flights.\n\n`;
      }
    } else if (queryIntent.type === 'hotel_search') {
      // HOTEL SEARCH - Focus on hotels only
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `🏨 HOTEL SEARCH MODE - Real hotel data is available!\n\n`;
        contextPrompt += `Your ONLY job is to:\n`;
        contextPrompt += `1. Present the TOP 5 BEST hotel options from the data above\n`;
        contextPrompt += `2. For each hotel, highlight: Price, Rating, Location, Key amenities\n`;
        contextPrompt += `3. Briefly explain WHY each is a good choice\n`;
        contextPrompt += `4. Keep it concise - 2-3 sentences per hotel maximum\n`;
        contextPrompt += `5. Format clearly with bullet points or numbered list\n`;
        contextPrompt += `6. DO NOT create itineraries or mention flights\n`;
        contextPrompt += `7. Just focus on helping them choose the best hotel\n\n`;
      } else {
        contextPrompt += `🏨 HOTEL SEARCH MODE - No real-time data available\n\n`;
        
        // Check if missing essential information
        if (!queryIntent.extractedInfo?.destination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I'd be happy to search hotels for you! Which city or destination are you interested in?"\n\n`;
        } else if (!queryIntent.extractedInfo?.checkIn || !queryIntent.extractedInfo?.checkOut) {
          // Missing dates - ask user for hotel dates
          contextPrompt += `Missing check-in/check-out dates.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"I'd love to search hotels in ${queryIntent.extractedInfo?.destination}!\n\n`;
          contextPrompt += `When will you be staying? Please provide:\n`;
          contextPrompt += `- Check-in date (e.g., 'October 20' or '2025-10-20')\n`;
          contextPrompt += `- Check-out date (e.g., 'October 25' or '2025-10-25')\n\n`;
          contextPrompt += `Or you can say something like:\n`;
          contextPrompt += `- 'Checking in October 20, checking out October 25'\n`;
          contextPrompt += `- 'Staying from Nov 1 to Nov 7'\n`;
          contextPrompt += `- '3 nights starting December 15'"\n\n`;
        } else {
          contextPrompt += `Simply respond:\n`;
          contextPrompt += `"I don't have real-time hotel data available right now. I recommend checking:\n`;
          contextPrompt += `- Booking.com\n`;
          contextPrompt += `- Hotels.com\n`;
          contextPrompt += `- Airbnb\n\n`;
          contextPrompt += `For accommodations in ${queryIntent.extractedInfo?.destination || 'your destination'}."\n\n`;
        }
      }
    } else if (queryIntent.type === 'trip_planning') {
      // TRIP PLANNING - Create full itinerary with flights and hotels
      
      // Get seasonal recommendations if we have destination and dates
      const destination = queryIntent.extractedInfo?.destination;
      const departureDate = queryIntent.extractedInfo?.departureDate || userPreferences.currentTripStartDate;
      let seasonalInfo = '';
      
      if (destination && departureDate) {
        const { season, month, monthName } = this.getSeasonAndMonth(departureDate);
        const mustDos = this.getSeasonalRecommendations(destination, season, monthName);
        
        if (mustDos && mustDos.length > 0) {
          seasonalInfo = `\n🎯 SEASONAL MUST-DO ACTIVITIES (${season} in ${monthName}):\n`;
          mustDos.forEach((activity, idx) => {
            seasonalInfo += `${idx + 1}. ${activity}\n`;
          });
          seasonalInfo += `\nIMPORTANT: PRIORITIZE these seasonal activities in your itinerary! These are time-sensitive experiences unique to ${season}.\n\n`;
          console.log(`   🌸 Added ${mustDos.length} seasonal must-dos for ${destination} in ${season}`);
        }
      }
      
      // Extract user interests from preferences
      let userInterests = '';
      if (userPreferences.interests && Array.isArray(userPreferences.interests) && userPreferences.interests.length > 0) {
        userInterests = `\n👤 USER INTERESTS & PREFERENCES:\n`;
        userInterests += `- Interests: ${userPreferences.interests.join(', ')}\n`;
        if (userPreferences.travelStyle) {
          userInterests += `- Travel Style: ${userPreferences.travelStyle}\n`;
        }
        if (userPreferences.budget) {
          userInterests += `- Budget: $${userPreferences.budget}\n`;
        }
        userInterests += `\nIMPORTANT: Tailor ALL recommendations to match these interests and travel style!\n\n`;
        console.log(`   🎯 Using user interests:`, userPreferences.interests);
      }
      
      if (realData && !realData.error && realData.results && realData.results.length > 0) {
        contextPrompt += `🗺️ TRIP PLANNING MODE - Real data is available!\n\n`;
        
        if (userInterests) {
          contextPrompt += userInterests;
        }
        
        if (seasonalInfo) {
          contextPrompt += seasonalInfo;
        }
        
        contextPrompt += `Your role is to:\n`;
        contextPrompt += `1. RECOMMEND the best 2-3 flights from the options above\n`;
        contextPrompt += `2. RECOMMEND the best 2-3 hotels from the options above\n`;
        contextPrompt += `3. Create a detailed day-by-day ITINERARY that:\n`;
        contextPrompt += `   - INCLUDES the seasonal must-do activities listed above (if any)\n`;
        contextPrompt += `   - MATCHES their interests and travel style from preferences\n`;
        contextPrompt += `   - Balances popular attractions with local experiences\n`;
        contextPrompt += `4. Suggest activities, attractions, restaurants for each day based on their interests\n`;
        contextPrompt += `5. Provide budget estimates and travel tips\n`;
        contextPrompt += `6. Format with clear day-by-day structure (#### Day 1: Title, etc.)\n`;
        contextPrompt += `7. Use ALL the data provided above - don't make up flight/hotel info\n\n`;
      } else {
        contextPrompt += `🗺️ TRIP PLANNING MODE - No real-time data available\n\n`;
        
        // Check if we have enough information to plan a trip
        const hasDestination = queryIntent.extractedInfo?.destination;
        const hasDuration = queryIntent.extractedInfo?.duration || queryIntent.extractedInfo?.departureDate;
        
        if (!hasDestination) {
          contextPrompt += `Missing destination. Ask:\n`;
          contextPrompt += `"I'd love to help you plan a trip! Where would you like to go?"\n\n`;
        } else if (!hasDuration) {
          contextPrompt += `Missing trip duration/dates.\n\n`;
          contextPrompt += `RESPOND EXACTLY LIKE THIS:\n`;
          contextPrompt += `"Great! I'll help you plan an amazing trip to ${queryIntent.extractedInfo?.destination}!\n\n`;
          contextPrompt += `To create the perfect itinerary, I need to know:\n`;
          contextPrompt += `- How many days/nights? (e.g., '7 days', '3-day weekend')\n`;
          contextPrompt += `- OR specific dates (e.g., 'October 20-27')\n\n`;
          contextPrompt += `This will help me plan the right amount of activities and experiences for you!"\n\n`;
        } else {
          if (userInterests) {
            contextPrompt += userInterests;
          }
          
          if (seasonalInfo) {
            contextPrompt += seasonalInfo;
          }
          
          contextPrompt += `Your role is to:\n`;
          contextPrompt += `1. Create an excellent day-by-day ITINERARY that:\n`;
          contextPrompt += `   - INCLUDES the seasonal must-do activities listed above (if any)\n`;
          contextPrompt += `   - MATCHES their interests and travel style from preferences\n`;
          contextPrompt += `   - Balances iconic sights with unique local experiences\n`;
          contextPrompt += `2. Suggest activities, attractions, restaurants based on their specific interests\n`;
          contextPrompt += `3. Provide budget estimates for activities and meals that match their travel style\n`;
          contextPrompt += `4. Give practical travel tips and local insights\n`;
          contextPrompt += `5. Format with clear day-by-day structure (#### Day 1: Title, etc.)\n`;
          contextPrompt += `6. DO NOT make up specific flight prices or hotel names - focus on the experience\n`;
          contextPrompt += `7. NEVER hallucinate specific flight numbers, prices, or hotel details\n`;
          contextPrompt += `8. If user needs flights/hotels, suggest they ask me separately for real-time data\n\n`;
        }
      }
    } else if (queryIntent.type === 'destination_recommendation') {
      // DESTINATION RECOMMENDATION MODE
      contextPrompt += `🌍 DESTINATION RECOMMENDATION MODE\n\n`;
      
      // Highlight user preferences if available
      if (userPreferences.interests && Array.isArray(userPreferences.interests) && userPreferences.interests.length > 0) {
        contextPrompt += `👤 USER PROFILE:\n`;
        contextPrompt += `- Interests: ${userPreferences.interests.join(', ')}\n`;
        if (userPreferences.travelStyle) {
          contextPrompt += `- Travel Style: ${userPreferences.travelStyle}\n`;
        }
        if (userPreferences.budget || userPreferences.budgetRange) {
          contextPrompt += `- Budget: ${userPreferences.budget || userPreferences.budgetRange}\n`;
        }
        if (userPreferences.preferredDestinations && userPreferences.preferredDestinations.length > 0) {
          contextPrompt += `- Past Favorites: ${userPreferences.preferredDestinations.join(', ')}\n`;
        }
        contextPrompt += `\nCRITICAL: Recommend destinations that MATCH these specific interests!\n\n`;
        console.log(`   🎯 Personalizing recommendations based on interests:`, userPreferences.interests);
      }
      
      contextPrompt += `The user is asking for destination suggestions.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. ANALYZE their preferences (budget, interests, travel style) from the USER PROFILE above\n`;
      contextPrompt += `2. RECOMMEND 3-5 destinations that PERFECTLY match their specific interests\n`;
      contextPrompt += `3. For each destination, explain:\n`;
      contextPrompt += `   - Why it's a PERFECT fit for THEIR specific interests (be specific!)\n`;
      contextPrompt += `   - Best time to visit (mention seasons/months)\n`;
      contextPrompt += `   - Estimated budget range that matches their travel style\n`;
      contextPrompt += `   - Key highlights tailored to THEIR interests (not generic tourist spots)\n`;
      contextPrompt += `4. PRIORITIZE destinations by best match to their preferences\n`;
      contextPrompt += `5. Be specific and actionable - give them clear next steps\n`;
      contextPrompt += `6. Format with clear sections and headings (no emojis)\n\n`;
      contextPrompt += `Example structure:\n`;
      contextPrompt += `1. Best Match: [Destination Name]\n`;
      contextPrompt += `Perfect for: [explain how it matches THEIR SPECIFIC interests]\n`;
      contextPrompt += `Best Time: [season/months]\n`;
      contextPrompt += `Budget: $X - $Y per day\n`;
      contextPrompt += `Must-do for YOU: [activities matching their interests]\n\n`;
    } else if (queryIntent.type === 'budget_inquiry') {
      // BUDGET INQUIRY MODE
      contextPrompt += `💰 BUDGET INQUIRY MODE\n\n`;
      contextPrompt += `The user is asking about travel costs and budgeting.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. Provide REALISTIC budget estimates based on their query\n`;
      contextPrompt += `2. Break down costs by category:\n`;
      contextPrompt += `   - Flights (round-trip estimate)\n`;
      contextPrompt += `   - Accommodation (per night range)\n`;
      contextPrompt += `   - Food & Dining (per day)\n`;
      contextPrompt += `   - Activities & Attractions (total estimate)\n`;
      contextPrompt += `   - Local Transport (daily estimate)\n`;
      contextPrompt += `3. Show budget for DIFFERENT travel styles:\n`;
      contextPrompt += `   - LUXURY: High-end experience\n`;
      contextPrompt += `   - COMFORTABLE: Mid-range quality\n`;
      contextPrompt += `   - BUDGET: Backpacker-friendly\n`;
      contextPrompt += `4. Include MONEY-SAVING TIPS specific to the destination\n`;
      contextPrompt += `5. Consider their travel style from preferences if available\n`;
      contextPrompt += `6. Be transparent about what's included/excluded\n`;
      contextPrompt += `7. Mention best time to visit for VALUE (off-season savings)\n\n`;
    } else if (queryIntent.type === 'public_transport') {
      // PUBLIC TRANSPORT MODE
      contextPrompt += `🚇 PUBLIC TRANSPORT MODE\n\n`;
      contextPrompt += `The user is asking about public transportation and getting around.\n\n`;
      contextPrompt += `Your role is to:\n`;
      contextPrompt += `1. Provide COMPREHENSIVE transport information for the destination\n`;
      contextPrompt += `2. Cover ALL major transport options:\n`;
      contextPrompt += `   - 🚇 Metro/Subway (lines, coverage, frequency)\n`;
      contextPrompt += `   - 🚌 Buses (main routes, how to use)\n`;
      contextPrompt += `   - 🚂 Trains (regional/local services)\n`;
      contextPrompt += `   - 🚕 Taxis & Ride-sharing (apps, typical costs)\n`;
      contextPrompt += `   - 🚲 Bikes/Scooters (rental options)\n`;
      contextPrompt += `   - 🚶 Walking (walkability of areas)\n`;
      contextPrompt += `3. Include PRACTICAL INFORMATION:\n`;
      contextPrompt += `   - Travel cards/passes (cost, duration, where to buy)\n`;
      contextPrompt += `   - Mobile apps for navigation/tickets\n`;
      contextPrompt += `   - Operating hours\n`;
      contextPrompt += `   - Typical costs per journey\n`;
      contextPrompt += `   - Tourist passes vs regular tickets\n`;
      contextPrompt += `4. Give MONEY-SAVING TIPS for transport\n`;
      contextPrompt += `5. Include SAFETY TIPS and cultural norms\n`;
      contextPrompt += `6. Suggest best transport for MAJOR TOURIST AREAS\n`;
      contextPrompt += `7. Format clearly with sections for each transport type\n\n`;
      contextPrompt += `Example structure:\n`;
      contextPrompt += `🚇 METRO/SUBWAY\n`;
      contextPrompt += `Coverage: [areas covered]\n`;
      contextPrompt += `Cost: [per ride / day pass]\n`;
      contextPrompt += `Tips: [insider advice]\n\n`;
    } else {
      // GENERAL QUERY - conversational
      contextPrompt += `💬 GENERAL CONVERSATION MODE\n\n`;
      
      // Check if this is a general travel question (e.g., "what can I carry on flights?")
      if (queryIntent.extractedInfo?.queryType === 'rules' || 
          queryIntent.extractedInfo?.queryType === 'general_info' ||
          lowerQuery.includes('what') || lowerQuery.includes('how') || lowerQuery.includes('can i')) {
        contextPrompt += `The user is asking a GENERAL TRAVEL QUESTION, not requesting to search flights/hotels.\n\n`;
        contextPrompt += `Your role is to:\n`;
        contextPrompt += `1. Answer their question directly and comprehensively\n`;
        contextPrompt += `2. Provide practical, actionable information\n`;
        contextPrompt += `3. Include specific examples or tips\n`;
        contextPrompt += `4. If relevant, mention variations by airline/country\n`;
        contextPrompt += `5. Be conversational and helpful\n`;
        contextPrompt += `6. End with: "Need help with anything else?"\n\n`;
        contextPrompt += `DO NOT offer to search flights/hotels unless they specifically ask.\n\n`;
      } else {
        contextPrompt += `Answer the user's question naturally and helpfully.\n\n`;
        contextPrompt += `Guidelines:\n`;
        contextPrompt += `1. Be FRIENDLY and conversational\n`;
        contextPrompt += `2. If it's travel-related:\n`;
        contextPrompt += `   - Use their context (preferences, past searches) to personalize\n`;
        contextPrompt += `   - Provide specific, actionable advice\n`;
        contextPrompt += `   - Suggest follow-up questions they might ask\n`;
        contextPrompt += `3. If asking about features/capabilities:\n`;
        contextPrompt += `   - Explain what you can help with clearly\n`;
        contextPrompt += `   - Give examples of questions they can ask\n`;
        contextPrompt += `4. Keep it CONCISE but informative\n`;
        contextPrompt += `5. Use clear formatting without emojis\n`;
        contextPrompt += `6. End with a helpful question or prompt to continue conversation\n\n`;
      }
    }
    
    contextPrompt += `IMPORTANT RULES:\n`;
    contextPrompt += `- MATCH your response to the query type (${queryIntent.type})\n`;
    contextPrompt += `- If they ask for FLIGHTS, give ONLY flight recommendations\n`;
    contextPrompt += `- If they ask for HOTELS, give ONLY hotel recommendations\n`;
    contextPrompt += `- If they ask for TRIP PLAN, give full itinerary with both\n`;
    contextPrompt += `- Use user preferences (budget, interests, style) in recommendations\n`;
    contextPrompt += `- Be specific and actionable\n`;
    contextPrompt += `- Be friendly and professional\n`;
    contextPrompt += `- DO NOT use emojis in your response - use plain text only\n`;
    contextPrompt += `- Use clear formatting with headers, bullets, and numbers instead of emojis\n\n`;

    contextPrompt += `Respond naturally and conversationally:`;

    return contextPrompt;
  }

  /**
   * Call AWS Bedrock with context
   */
  async callBedrock(systemPrompt, conversationHistory, currentQuery) {
    try {
      // ...existing code...
      // All logic for building messages, command, and handling response
      // ...existing code...
      // Debug: Check if Google Flights links are in the response
      if (responseText.includes('google.com/travel/flights')) {
        // ...existing code...
      }
      // ...existing code...
      return responseText;
    } catch (error) {
      console.error('   ❌ Bedrock API error:', error);
      return "I apologize, but I'm having trouble processing your request right now. I'm here to help you plan amazing trips! Could you please rephrase your question?";
    }
  }

  /**
   * Load user preferences from storage
   */
  async loadUserPreferences(userId) {
    try {
      let preferences = {};
      // Try to load from user profile first (includes homeCity from profile settings)
      try {
        const userModel = require('../models/userModel');
        const user = await userModel.getUserById(userId);
        if (user) {
          // Extract homeCity and other preferences from user profile
          // ...existing extraction logic...
        }
      } catch (error) {
        // ...handle error...
      }
      // ...other loading logic...
      return preferences;
    } catch (error) {
      // ...handle error...
      return {};
    }
  }

  /**
   * Save conversation to history
   */
  async saveConversation(sessionId, userId, conversation) {
    try {
      // Save to in-memory
      const history = this.conversations.get(sessionId) || [];
      history.push(conversation);
      this.conversations.set(sessionId, history.slice(-20)); // Keep last 20 turns
      // Try to save to DynamoDB
      if (process.env.CONVERSATIONS_TABLE) {
        const params = {
          TableName: process.env.CONVERSATIONS_TABLE,
          Item: marshall({
            sessionId,
            userId,
            timestamp: conversation.timestamp,
            ...conversation
          })
        };
        await this.dynamoClient.send(new PutItemCommand(params));
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  /**
   * Update user preferences based on conversation
   */
  async updatePreferencesFromConversation(userId, userQuery, aiResponse, currentPreferences) {
    try {
      const lowerQuery = userQuery.toLowerCase();
      const lowerResponse = aiResponse.toLowerCase();
      const updated = { ...currentPreferences };
      let hasUpdates = false;
      // Extract travel style
      if (lowerQuery.includes('budget') || lowerQuery.includes('cheap')) {
        updated.travelStyle = 'budget';
        hasUpdates = true;
      } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium')) {
        updated.travelStyle = 'luxury';
        hasUpdates = true;
      }
      // Extract destinations mentioned
      const cities = ['paris', 'london', 'tokyo', 'dubai', 'rome', 'barcelona', 'new york', 
                     'mumbai', 'delhi', 'singapore', 'bangkok'];
      for (const city of cities) {
        if (lowerQuery.includes(city) || lowerResponse.includes(city)) {
          updated.preferredDestinations = updated.preferredDestinations || [];
          const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
          if (!updated.preferredDestinations.includes(capitalizedCity)) {
            updated.preferredDestinations.push(capitalizedCity);
            hasUpdates = true;
          }
        }
      }
      // Extract interests
      const interests = ['adventure', 'culture', 'food', 'beach', 'shopping', 'nightlife', 'history'];
      for (const interest of interests) {
        if (lowerQuery.includes(interest)) {
          updated.interests = updated.interests || [];
          if (!updated.interests.includes(interest)) {
            updated.interests.push(interest);
            hasUpdates = true;
          }
        }
      }
      // Save if updates found
      if (hasUpdates) {
        updated.lastUpdated = new Date().toISOString();
        await this.saveUserPreferences(userId, updated);
        console.log('   ✅ User preferences updated');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId, preferences) {
    try {
      // Save to in-memory
      this.userPreferences.set(userId, preferences);
      // Try to save to DynamoDB
      if (process.env.USER_PREFERENCES_TABLE) {
        const params = {
          TableName: process.env.USER_PREFERENCES_TABLE,
          Item: marshall({
            userId,
            ...preferences,
            updatedAt: new Date().toISOString()
          })
        };
        await this.dynamoClient.send(new PutItemCommand(params));
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  /**
   * Get currency symbol from currency code
   */
  getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
      'CNY': '¥',
      'SEK': 'kr',
      'NZD': 'NZ$'
    };
    return symbols[currency?.toUpperCase()] || currency || '$';
  }

  /**
   * Get season and month from date string
   */
  getSeasonAndMonth(dateString) {
    if (!dateString) return { season: null, month: null, monthName: null };
    
    try {
      const date = new Date(dateString);
      const month = date.getMonth() + 1; // 1-12
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      let season;
      // Northern Hemisphere seasons
      if (month >= 3 && month <= 5) season = 'Spring';
      else if (month >= 6 && month <= 8) season = 'Summer';
      else if (month >= 9 && month <= 11) season = 'Fall';
      else season = 'Winter';
      
      return {
        season,
        month,
        monthName: monthNames[date.getMonth()]
      };
    } catch (error) {
      return { season: null, month: null, monthName: null };
    }
  }

  /**
   * Get seasonal must-do activities for popular destinations
   */
  getSeasonalRecommendations(destination, season, monthName) {
    const recommendations = {
      'Washington DC': {
        'Spring': ['Visit the National Cherry Blossom Festival (late March - early April)', 'Walk through the Tidal Basin when cherry trees are in full bloom', 'Explore monuments and memorials with perfect weather'],
        'Fall': ['Walk the National Mall with stunning fall foliage', 'Visit monuments and memorials during cooler, comfortable weather', 'Explore Georgetown\'s historic streets with autumn colors', 'Rock Creek Park hiking with fall leaves'],
        'Summer': ['Evening monument tour to avoid daytime heat', 'Free concerts at the National Mall', 'Smithsonian museums for air-conditioned exploration'],
        'Winter': ['National Christmas Tree and holiday decorations', 'Ice skating at the National Gallery of Art Sculpture Garden', 'Museum hopping (Smithsonian museums are free!)']
      },
      'New York': {
        'Spring': ['Central Park blooms and outdoor concerts', 'Brooklyn Botanic Garden Cherry Blossom Festival', 'Outdoor dining in Greenwich Village'],
        'Fall': ['Fall foliage in Central Park and Prospect Park', 'Thanksgiving Day Parade (late November)', 'Rockefeller Center holiday season begins', 'New York Film Festival'],
        'Summer': ['Free Shakespeare in the Park', 'Rooftop bars with skyline views', 'Coney Island beach and boardwalk', 'Free summer concerts in parks'],
        'Winter': ['Rockefeller Center Christmas Tree and ice skating', 'Holiday window displays on Fifth Avenue', 'Times Square New Year\'s Eve (if in late December)', 'Indoor museums and Broadway shows']
      },
      'Chicago': {
        'Spring': ['Millennium Park spring events', 'Chicago River turns green for St. Patrick\'s Day (March 17)', 'Architecture boat tours begin'],
        'Fall': ['Chicago Marathon (October)', 'Fall colors along the Lakefront Trail', 'Magnificent Mile with autumn weather'],
        'Summer': ['Navy Pier fireworks (Wednesdays and Saturdays)', 'Chicago beaches and lakefront activities', 'Millennium Park concerts and events', 'Outdoor festivals almost every weekend'],
        'Winter': ['Christkindlmarket (German Christmas market)', 'Ice skating at Millennium Park', 'Museum Campus indoor exploration']
      },
      'Tokyo': {
        'Spring': ['Cherry blossom viewing (Hanami) in Ueno Park and Chidorigafuchi', 'Sumida River cherry blossom cruise', 'Spring festivals at temples and shrines'],
        'Fall': ['Autumn foliage viewing at Meiji Shrine and Rikugien Gardens', 'Tokyo Grand Tea Ceremony', 'Comfortable weather for walking tours'],
        'Summer': ['Sumida River Fireworks Festival (July)', 'Asakusa Samba Carnival (August)', 'Evening exploration to avoid daytime heat'],
        'Winter': ['Winter illuminations citywide (November-February)', 'New Year\'s temple visits (Hatsumode)', 'Indoor attractions and ramen restaurants']
      },
      'Paris': {
        'Spring': ['Gardens blooming at Tuileries and Luxembourg', 'Seine river cruises with pleasant weather', 'Outdoor cafés reopening'],
        'Fall': ['Fall colors in Luxembourg Gardens and Bois de Boulogne', 'Wine harvest season in nearby regions', 'Fashion Week (late September)', 'Montmartre with autumn vibes'],
        'Summer': ['Bastille Day celebrations (July 14)', 'Paris Plages (beach on the Seine)', 'Outdoor concerts and events', 'Extended museum hours'],
        'Winter': ['Christmas markets on Champs-Élysées', 'New Year\'s Eve at the Eiffel Tower', 'Indoor museums and cozy cafés', 'Winter sales (Soldes) in January']
      },
      'Barcelona': {
        'Spring': ['Sant Jordi festival (April 23) - books and roses', 'Beach season begins', 'Park Güell and outdoor Gaudí sites'],
        'Fall': ['La Mercè festival (September)', 'Beach still warm enough for swimming (September)', 'Wine harvest in nearby Penedès region', 'Comfortable walking weather'],
        'Summer': ['Beaches and beach clubs', 'Festa Major de Gràcia (August)', 'Late-night dining and nightlife', 'Outdoor concerts and festivals'],
        'Winter': ['Christmas markets and lights', 'Three Kings Parade (January 5)', 'Fewer crowds at major attractions', 'Indoor Picasso and modern art museums']
      },
      'London': {
        'Spring': ['Kew Gardens in bloom', 'Thames river walks with spring weather', 'Outdoor markets reopening'],
        'Fall': ['Hyde Park with autumn colors', 'Bonfire Night (November 5)', 'Covent Garden fall atmosphere', 'Theater season in full swing'],
        'Summer': ['Changing of the Guard at Buckingham Palace', 'Hyde Park concerts and events', 'Thames river cruises', 'Outdoor theater and cinema', 'Notting Hill Carnival (August Bank Holiday)'],
        'Winter': ['Winter Wonderland in Hyde Park', 'Christmas lights on Oxford Street and Regent Street', 'New Year\'s Eve fireworks on the Thames', 'Cozy pubs and afternoon tea']
      },
      'Dubai': {
        'Spring': ['Perfect beach weather', 'Desert safaris with pleasant temperatures', 'Outdoor markets and souks'],
        'Fall': ['Start of pleasant outdoor weather', 'Dubai Shopping Festival begins (late fall)', 'Desert activities become comfortable'],
        'Summer': ['Dubai Summer Surprises (shopping festival)', 'Indoor mall exploration with A/C', 'Indoor ski resort and attractions', 'Late evening beach visits'],
        'Winter': ['Dubai Shopping Festival (December-January)', 'Perfect weather for all outdoor activities', 'Desert camping and safaris', 'Dubai Marathon (January)', 'New Year\'s Eve fireworks at Burj Khalifa']
      },
      'Rome': {
        'Spring': ['Easter celebrations at Vatican City', 'Perfect weather for Colosseum and Roman Forum', 'Rome\'s Birthday celebration (April 21)', 'Outdoor dining in Trastevere'],
        'Fall': ['Wine harvest season in nearby regions', 'Comfortable walking weather for ancient sites', 'Fall food festivals', 'Fewer tourists at major attractions'],
        'Summer': ['Evening strolls around Trevi Fountain', 'Outdoor concerts and festivals', 'Late opening hours at major sites', 'Gelato tours (peak season!)'],
        'Winter': ['Christmas markets and nativity scenes', 'New Year\'s at the Colosseum area', 'Indoor museums and churches', 'Fewer crowds at Vatican']
      },
      'Amsterdam': {
        'Spring': ['Tulip season (mid-March to May)', 'Keukenhof Gardens in full bloom', 'King\'s Day celebration (April 27)', 'Canal boat tours with spring weather'],
        'Fall': ['Amsterdam Dance Event (October)', 'Fall colors along canals', 'Museum season with fewer crowds', 'Cozy brown café culture'],
        'Summer': ['Outdoor festivals and concerts', 'Canal swimming spots', 'Vondelpark picnics', 'Open-air cinema', 'Pride Amsterdam (early August)'],
        'Winter': ['Ice skating on canals (if frozen)', 'Amsterdam Light Festival (December-January)', 'Christmas markets', 'Cozy museums and rijsttafel dinners']
      },
      'Singapore': {

        'Spring': ['Perfect weather before monsoon', 'Gardens by the Bay in bloom', 'Food festivals', 'Outdoor activities comfortable'],
        'Fall': ['Mid-Autumn Festival (September)', 'F1 Grand Prix (September)', 'Comfortable weather returns', 'Diwali celebrations'],
        'Summer': ['Great Singapore Sale (June-July)', 'National Day celebrations (August 9)', 'Indoor attractions and malls', 'Evening Marina Bay activities'],
        'Winter': ['Christmas decorations at Orchard Road', 'New Year\'s Eve at Marina Bay', 'Perfect weather for all outdoor activities', 'Chinese New Year (late January/February)']
      },
      'Sydney': {
        'Spring': ['Jacaranda trees blooming (October-November)', 'Sculpture by the Sea (October-November)', 'Comfortable beach weather begins', 'Coastal walks with perfect weather'],
        'Fall': ['Sydney Film Festival', 'Perfect beach weather continues', 'Vivid Sydney (May-June) - light festival', 'Autumn colors in gardens'],
        'Summer': ['Bondi Beach season', 'Sydney New Year\'s Eve fireworks (world-famous!)', 'Outdoor concerts and festivals', 'Christmas at Bondi Beach'],
        'Winter': ['Whale watching season (June-November)', 'Sydney International Art Series', 'Indoor attractions and museums', 'Winter markets and festivals']
      },
      'Bali': {
        'Spring': ['Perfect weather before rainy season', 'Nyepi (Balinese New Year) - Day of Silence', 'Beach activities and surfing', 'Rice terrace tours in ideal weather'],
        'Fall': ['Start of dry season', 'Comfortable temperatures', 'Fewer tourists before peak season', 'Best for outdoor activities'],
        'Summer': ['Peak dry season - perfect weather', 'Ubud Food Festival (April)', 'Best surfing conditions', 'Temple festivals throughout'],
        'Winter': ['Some rain but still warm', 'Fewer tourists in December', 'New Year celebrations', 'Indoor cultural activities and spa']
      },
      'Mumbai': {
        'Spring': ['Perfect weather after winter', 'Beach activities at Marine Drive', 'Outdoor markets and street food tours', 'Heritage walks in pleasant weather'],
        'Fall': ['Ganesh Chaturthi festival (August-September)', 'Navratri celebrations (September-October)', 'Post-monsoon pleasant weather', 'Diwali festivities (October-November)'],
        'Summer': ['Indoor attractions and museums', 'Monsoon season begins (June) - experience romantic rains', 'Mall exploration with A/C', 'Evening Marine Drive walks'],
        'Winter': ['Perfect weather for everything!', 'Kala Ghoda Arts Festival (February)', 'Beach and outdoor dining', 'Mumbai Festival (January)']
      },
      'Bangkok': {
        'Spring': ['Songkran Water Festival (mid-April)', 'Perfect weather before hot season', 'Temple visits comfortable', 'Night markets in pleasant weather'],
        'Fall': ['End of rainy season', 'Loy Krathong Festival (November)', 'Comfortable temperatures return', 'River activities resume'],
        'Summer': ['Indoor temple exploration', 'Shopping mall culture', 'Rooftop bars for evening views', 'Water markets in early morning'],
        'Winter': ['Perfect weather for all activities', 'Peak tourist season', 'Christmas and New Year celebrations', 'Best time for temple visits']
      },
      'Athens': {
        'Spring': ['Easter celebrations (Greek Orthodox)', 'Perfect weather for Acropolis visits', 'Wildflowers blooming', 'Outdoor tavernas opening'],
        'Fall': ['Athens Epidaurus Festival continues', 'Comfortable weather for ancient sites', 'Wine harvest season', 'Fewer tourists at attractions'],
        'Summer': ['Athens Epidaurus Festival', 'Rooftop bars with Acropolis views', 'Island hopping season', 'Evening visits to ancient sites'],
        'Winter': ['Fewer crowds at major sites', 'Christmas decorations in Syntagma Square', 'Indoor museums and archaeological sites', 'Traditional tavernas cozy atmosphere']
      },
      'Madrid': {
        'Spring': ['San Isidro Festival (May)', 'Perfect weather for Retiro Park', 'Outdoor terrazas (terraces) opening', 'Art museum season begins'],
        'Fall': ['Autumn art exhibitions at Prado and Reina Sofia', 'Perfect walking weather', 'Tapas season in full swing', 'Fewer tourists than summer'],
        'Summer': ['Veranos de la Villa cultural festival', 'Late-night dining culture peaks', 'Rooftop bars with city views', 'Day trips to escape heat'],
        'Winter': ['Christmas lights on Gran Via', 'Three Kings Parade (January 5)', 'Indoor museums (Prado, Reina Sofia)', 'Traditional hot chocolate and churros']
      }
    };

    const destRecommendations = recommendations[destination];
    if (destRecommendations && season && destRecommendations[season]) {
      return destRecommendations[season];
    }

    const partialMatch = Object.keys(recommendations).find(key => 
      key.toLowerCase().includes(destination.toLowerCase()) || 
      destination.toLowerCase().includes(key.toLowerCase())
    );

    if (partialMatch && season && recommendations[partialMatch][season]) {
      return recommendations[partialMatch][season];
    }

    const genericAdvice = {
      'Spring': ['Enjoy outdoor sightseeing with pleasant weather', 'Visit gardens and parks in bloom'],
      'Summer': ['Early morning or evening activities to avoid heat', 'Enjoy longer daylight hours'],
      'Fall': ['Perfect weather for walking tours', 'Enjoy fall colors if applicable'],
      'Winter': ['Bundle up for outdoor sightseeing', 'Explore indoor attractions and museums']
    };

    return season ? genericAdvice[season] : [];
  }

  /**
   * Build Google Flights URL synchronously (for use in prompts)
   */
  buildGoogleFlightsUrlSync(searchRequest) {
    if (!searchRequest || !searchRequest.origin || !searchRequest.destination) {
      return 'https://www.google.com/travel/flights';
    }
    
    let { origin, destination, departureDate, returnDate } = searchRequest;
    
    // Normalize dates (ensure they are ISO and refer to current/future year)
    if (departureDate) {
      departureDate = this.normalizeIsoToFuture(departureDate);
      if (!departureDate) departureDate = this.getDefaultDepartureDate();
    }
    if (returnDate) {
      returnDate = this.normalizeIsoToFuture(returnDate);
    }
    
    // Build simple query without encoding - browser will handle it
    // Format: "BOM to BCN 2025-11-11" works better than encoded version
    let query = `${origin} to ${destination}`;
    if (departureDate) {
      query += ` ${departureDate}`;
    }
    if (returnDate) {
      // Don't use "return" keyword, just add the date
      query += ` ${returnDate}`;
    }
    
    // Don't encode - let the browser/frontend handle encoding
    return `https://www.google.com/travel/flights?q=${query.replace(/ /g, '+')}`;
  }

  /**
   * Helper: Get default departure date (7 days from now)
   */
  getDefaultDepartureDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Get default return date (14 days from now)
   */
  getDefaultReturnDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  }

  /**
   * Remove all emojis from text
   */
  removeEmojis(text) {
    if (!text) return text;
    // Remove emojis using regex
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{E0020}-\u{E007F}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu, '');
  }
}
module.exports = IntegratedAITravelAgent;
