/**
 * Cities Controller
 * Handles city search and autocomplete functionality
 */

/**
 * Search cities for autocomplete
 */
exports.searchCities = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        cities: []
      });
    }

    // For now, return a static list of popular cities
    // In production, this could connect to a cities database or external API
    const popularCities = [
      { name: 'New York', country: 'United States', iataCode: 'NYC', displayName: 'New York, NY, USA' },
      { name: 'London', country: 'United Kingdom', iataCode: 'LON', displayName: 'London, UK' },
      { name: 'Paris', country: 'France', iataCode: 'PAR', displayName: 'Paris, France' },
      { name: 'Tokyo', country: 'Japan', iataCode: 'TYO', displayName: 'Tokyo, Japan' },
      { name: 'Los Angeles', country: 'United States', iataCode: 'LAX', displayName: 'Los Angeles, CA, USA' },
      { name: 'Dubai', country: 'United Arab Emirates', iataCode: 'DXB', displayName: 'Dubai, UAE' },
      { name: 'Singapore', country: 'Singapore', iataCode: 'SIN', displayName: 'Singapore' },
      { name: 'Sydney', country: 'Australia', iataCode: 'SYD', displayName: 'Sydney, Australia' },
      { name: 'Mumbai', country: 'India', iataCode: 'BOM', displayName: 'Mumbai, India' },
      { name: 'Toronto', country: 'Canada', iataCode: 'YYZ', displayName: 'Toronto, ON, Canada' },
      { name: 'Barcelona', country: 'Spain', iataCode: 'BCN', displayName: 'Barcelona, Spain' },
      { name: 'Amsterdam', country: 'Netherlands', iataCode: 'AMS', displayName: 'Amsterdam, Netherlands' },
      { name: 'Rome', country: 'Italy', iataCode: 'ROM', displayName: 'Rome, Italy' },
      { name: 'Bangkok', country: 'Thailand', iataCode: 'BKK', displayName: 'Bangkok, Thailand' },
      { name: 'Hong Kong', country: 'Hong Kong', iataCode: 'HKG', displayName: 'Hong Kong' },
      { name: 'Berlin', country: 'Germany', iataCode: 'BER', displayName: 'Berlin, Germany' },
      { name: 'Madrid', country: 'Spain', iataCode: 'MAD', displayName: 'Madrid, Spain' },
      { name: 'Istanbul', country: 'Turkey', iataCode: 'IST', displayName: 'Istanbul, Turkey' },
      { name: 'Seoul', country: 'South Korea', iataCode: 'SEL', displayName: 'Seoul, South Korea' },
      { name: 'Mexico City', country: 'Mexico', iataCode: 'MEX', displayName: 'Mexico City, Mexico' },
      { name: 'São Paulo', country: 'Brazil', iataCode: 'SAO', displayName: 'São Paulo, Brazil' },
      { name: 'Cairo', country: 'Egypt', iataCode: 'CAI', displayName: 'Cairo, Egypt' },
      { name: 'Delhi', country: 'India', iataCode: 'DEL', displayName: 'Delhi, India' },
      { name: 'Beijing', country: 'China', iataCode: 'PEK', displayName: 'Beijing, China' },
      { name: 'Shanghai', country: 'China', iataCode: 'SHA', displayName: 'Shanghai, China' },
      { name: 'Chicago', country: 'United States', iataCode: 'CHI', displayName: 'Chicago, IL, USA' },
      { name: 'Miami', country: 'United States', iataCode: 'MIA', displayName: 'Miami, FL, USA' },
      { name: 'San Francisco', country: 'United States', iataCode: 'SFO', displayName: 'San Francisco, CA, USA' },
      { name: 'Las Vegas', country: 'United States', iataCode: 'LAS', displayName: 'Las Vegas, NV, USA' },
      { name: 'Vancouver', country: 'Canada', iataCode: 'YVR', displayName: 'Vancouver, BC, Canada' },
      { name: 'Montreal', country: 'Canada', iataCode: 'YUL', displayName: 'Montreal, QC, Canada' },
      { name: 'Melbourne', country: 'Australia', iataCode: 'MEL', displayName: 'Melbourne, Australia' },
      { name: 'Perth', country: 'Australia', iataCode: 'PER', displayName: 'Perth, Australia' },
      { name: 'Auckland', country: 'New Zealand', iataCode: 'AKL', displayName: 'Auckland, New Zealand' },
      { name: 'Cape Town', country: 'South Africa', iataCode: 'CPT', displayName: 'Cape Town, South Africa' },
      { name: 'Johannesburg', country: 'South Africa', iataCode: 'JNB', displayName: 'Johannesburg, South Africa' },
      { name: 'Nairobi', country: 'Kenya', iataCode: 'NBO', displayName: 'Nairobi, Kenya' },
      { name: 'Casablanca', country: 'Morocco', iataCode: 'CMN', displayName: 'Casablanca, Morocco' },
      { name: 'Marrakech', country: 'Morocco', iataCode: 'RAK', displayName: 'Marrakech, Morocco' },
      { name: 'Lisbon', country: 'Portugal', iataCode: 'LIS', displayName: 'Lisbon, Portugal' },
      { name: 'Porto', country: 'Portugal', iataCode: 'OPO', displayName: 'Porto, Portugal' },
      { name: 'Vienna', country: 'Austria', iataCode: 'VIE', displayName: 'Vienna, Austria' },
      { name: 'Prague', country: 'Czech Republic', iataCode: 'PRG', displayName: 'Prague, Czech Republic' },
      { name: 'Budapest', country: 'Hungary', iataCode: 'BUD', displayName: 'Budapest, Hungary' },
      { name: 'Warsaw', country: 'Poland', iataCode: 'WAW', displayName: 'Warsaw, Poland' },
      { name: 'Stockholm', country: 'Sweden', iataCode: 'ARN', displayName: 'Stockholm, Sweden' },
      { name: 'Copenhagen', country: 'Denmark', iataCode: 'CPH', displayName: 'Copenhagen, Denmark' },
      { name: 'Oslo', country: 'Norway', iataCode: 'OSL', displayName: 'Oslo, Norway' },
      { name: 'Helsinki', country: 'Finland', iataCode: 'HEL', displayName: 'Helsinki, Finland' },
      { name: 'Reykjavik', country: 'Iceland', iataCode: 'KEF', displayName: 'Reykjavik, Iceland' },
      { name: 'Dublin', country: 'Ireland', iataCode: 'DUB', displayName: 'Dublin, Ireland' },
      { name: 'Edinburgh', country: 'United Kingdom', iataCode: 'EDI', displayName: 'Edinburgh, UK' },
      { name: 'Manchester', country: 'United Kingdom', iataCode: 'MAN', displayName: 'Manchester, UK' }
    ];

    const lowerQuery = query.toLowerCase();
    const filteredCities = popularCities
      .filter(city => 
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery) ||
        city.displayName.toLowerCase().includes(lowerQuery) ||
        (city.iataCode && city.iataCode.toLowerCase().includes(lowerQuery))
      )
      .slice(0, parseInt(limit));

    console.log(`🔍 City search for "${query}": found ${filteredCities.length} results`);

    res.json({
      success: true,
      cities: filteredCities,
      query
    });
  } catch (error) {
    console.error('❌ Error searching cities:', error);
    res.status(500).json({
      error: 'Failed to search cities',
      message: error.message
    });
  }
};