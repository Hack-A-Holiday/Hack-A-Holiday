/**
 * Comprehensive Airport Destinations
 * All major airports that can be searched for flights and hotels
 * Based on AIRPORT_COORDINATES from booking-api.ts
 */

export interface AirportDestination {
  id: string;
  code: string; // 3-letter IATA code
  name: string;
  city: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  category: 'hub' | 'regional' | 'international';
  popularity: number; // 1-10 scale
}

export const airportDestinations: AirportDestination[] = [
  // North America
  {
    id: 'jfk',
    code: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    continent: 'North America',
    latitude: 40.6413,
    longitude: -73.7781,
    category: 'hub',
    popularity: 10
  },
  {
    id: 'lax',
    code: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'United States',
    continent: 'North America',
    latitude: 33.9416,
    longitude: -118.4085,
    category: 'hub',
    popularity: 10
  },
  {
    id: 'ord',
    code: 'ORD',
    name: "O'Hare International Airport",
    city: 'Chicago',
    country: 'United States',
    continent: 'North America',
    latitude: 41.9742,
    longitude: -87.9073,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'mia',
    code: 'MIA',
    name: 'Miami International Airport',
    city: 'Miami',
    country: 'United States',
    continent: 'North America',
    latitude: 25.7959,
    longitude: -80.2870,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'yyz',
    code: 'YYZ',
    name: 'Toronto Pearson International Airport',
    city: 'Toronto',
    country: 'Canada',
    continent: 'North America',
    latitude: 43.6777,
    longitude: -79.6248,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'yvr',
    code: 'YVR',
    name: 'Vancouver International Airport',
    city: 'Vancouver',
    country: 'Canada',
    continent: 'North America',
    latitude: 49.1939,
    longitude: -123.1844,
    category: 'international',
    popularity: 7
  },
  {
    id: 'mex',
    code: 'MEX',
    name: 'Mexico City International Airport',
    city: 'Mexico City',
    country: 'Mexico',
    continent: 'North America',
    latitude: 19.4363,
    longitude: -99.0721,
    category: 'hub',
    popularity: 8
  },

  // Europe
  {
    id: 'lhr',
    code: 'LHR',
    name: 'London Heathrow Airport',
    city: 'London',
    country: 'United Kingdom',
    continent: 'Europe',
    latitude: 51.4700,
    longitude: -0.4543,
    category: 'hub',
    popularity: 10
  },
  {
    id: 'cdg',
    code: 'CDG',
    name: 'Charles de Gaulle Airport',
    city: 'Paris',
    country: 'France',
    continent: 'Europe',
    latitude: 49.0097,
    longitude: 2.5479,
    category: 'hub',
    popularity: 10
  },
  {
    id: 'fra',
    code: 'FRA',
    name: 'Frankfurt Airport',
    city: 'Frankfurt',
    country: 'Germany',
    continent: 'Europe',
    latitude: 50.0379,
    longitude: 8.5622,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'ams',
    code: 'AMS',
    name: 'Amsterdam Airport Schiphol',
    city: 'Amsterdam',
    country: 'Netherlands',
    continent: 'Europe',
    latitude: 52.3105,
    longitude: 4.7683,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'mad',
    code: 'MAD',
    name: 'Adolfo Suárez Madrid-Barajas Airport',
    city: 'Madrid',
    country: 'Spain',
    continent: 'Europe',
    latitude: 40.4983,
    longitude: -3.5676,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'bcn',
    code: 'BCN',
    name: 'Barcelona-El Prat Airport',
    city: 'Barcelona',
    country: 'Spain',
    continent: 'Europe',
    latitude: 41.2974,
    longitude: 2.0833,
    category: 'international',
    popularity: 9
  },
  {
    id: 'fco',
    code: 'FCO',
    name: 'Leonardo da Vinci-Fiumicino Airport',
    city: 'Rome',
    country: 'Italy',
    continent: 'Europe',
    latitude: 41.8003,
    longitude: 12.2389,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'mxp',
    code: 'MXP',
    name: 'Milan Malpensa Airport',
    city: 'Milan',
    country: 'Italy',
    continent: 'Europe',
    latitude: 45.6306,
    longitude: 8.7281,
    category: 'international',
    popularity: 8
  },
  {
    id: 'zur',
    code: 'ZUR',
    name: 'Zurich Airport',
    city: 'Zurich',
    country: 'Switzerland',
    continent: 'Europe',
    latitude: 47.4647,
    longitude: 8.5492,
    category: 'international',
    popularity: 8
  },
  {
    id: 'vie',
    code: 'VIE',
    name: 'Vienna International Airport',
    city: 'Vienna',
    country: 'Austria',
    continent: 'Europe',
    latitude: 48.1103,
    longitude: 16.5697,
    category: 'international',
    popularity: 7
  },
  {
    id: 'dub',
    code: 'DUB',
    name: 'Dublin Airport',
    city: 'Dublin',
    country: 'Ireland',
    continent: 'Europe',
    latitude: 53.4213,
    longitude: -6.2701,
    category: 'international',
    popularity: 7
  },
  {
    id: 'lis',
    code: 'LIS',
    name: 'Lisbon Portela Airport',
    city: 'Lisbon',
    country: 'Portugal',
    continent: 'Europe',
    latitude: 38.7742,
    longitude: -9.1342,
    category: 'international',
    popularity: 7
  },
  {
    id: 'ath',
    code: 'ATH',
    name: 'Athens International Airport',
    city: 'Athens',
    country: 'Greece',
    continent: 'Europe',
    latitude: 37.9364,
    longitude: 23.9445,
    category: 'international',
    popularity: 7
  },
  {
    id: 'ist',
    code: 'IST',
    name: 'Istanbul Airport',
    city: 'Istanbul',
    country: 'Turkey',
    continent: 'Europe',
    latitude: 41.2753,
    longitude: 28.7519,
    category: 'hub',
    popularity: 9
  },

  // Asia
  {
    id: 'nrt',
    code: 'NRT',
    name: 'Narita International Airport',
    city: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    latitude: 35.7720,
    longitude: 140.3929,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'hnd',
    code: 'HND',
    name: 'Tokyo Haneda Airport',
    city: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    latitude: 35.5494,
    longitude: 139.7798,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'icn',
    code: 'ICN',
    name: 'Incheon International Airport',
    city: 'Seoul',
    country: 'South Korea',
    continent: 'Asia',
    latitude: 37.4602,
    longitude: 126.4407,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'pek',
    code: 'PEK',
    name: 'Beijing Capital International Airport',
    city: 'Beijing',
    country: 'China',
    continent: 'Asia',
    latitude: 40.0799,
    longitude: 116.6031,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'pvg',
    code: 'PVG',
    name: 'Shanghai Pudong International Airport',
    city: 'Shanghai',
    country: 'China',
    continent: 'Asia',
    latitude: 31.1443,
    longitude: 121.8083,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'hkg',
    code: 'HKG',
    name: 'Hong Kong International Airport',
    city: 'Hong Kong',
    country: 'Hong Kong',
    continent: 'Asia',
    latitude: 22.3080,
    longitude: 113.9185,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'sin',
    code: 'SIN',
    name: 'Singapore Changi Airport',
    city: 'Singapore',
    country: 'Singapore',
    continent: 'Asia',
    latitude: 1.3644,
    longitude: 103.9915,
    category: 'hub',
    popularity: 10
  },
  {
    id: 'bkk',
    code: 'BKK',
    name: 'Suvarnabhumi Airport',
    city: 'Bangkok',
    country: 'Thailand',
    continent: 'Asia',
    latitude: 13.6900,
    longitude: 100.7501,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'kul',
    code: 'KUL',
    name: 'Kuala Lumpur International Airport',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    continent: 'Asia',
    latitude: 2.7456,
    longitude: 101.7072,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'del',
    code: 'DEL',
    name: 'Indira Gandhi International Airport',
    city: 'New Delhi',
    country: 'India',
    continent: 'Asia',
    latitude: 28.5562,
    longitude: 77.1000,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'bom',
    code: 'BOM',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    city: 'Mumbai',
    country: 'India',
    continent: 'Asia',
    latitude: 19.0896,
    longitude: 72.8656,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'blr',
    code: 'BLR',
    name: 'Kempegowda International Airport',
    city: 'Bangalore',
    country: 'India',
    continent: 'Asia',
    latitude: 13.1979,
    longitude: 77.7063,
    category: 'international',
    popularity: 8
  },
  {
    id: 'maa',
    code: 'MAA',
    name: 'Chennai International Airport',
    city: 'Chennai',
    country: 'India',
    continent: 'Asia',
    latitude: 12.9941,
    longitude: 80.1709,
    category: 'international',
    popularity: 7
  },
  {
    id: 'sgn',
    code: 'SGN',
    name: 'Tan Son Nhat International Airport',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    continent: 'Asia',
    latitude: 10.8188,
    longitude: 106.6519,
    category: 'international',
    popularity: 7
  },

  // Middle East & Africa
  {
    id: 'dxb',
    code: 'DXB',
    name: 'Dubai International Airport',
    city: 'Dubai',
    country: 'United Arab Emirates',
    continent: 'Asia',
    latitude: 25.2532,
    longitude: 55.3657,
    category: 'hub',
    popularity: 10
  },
  {
    id: 'auh',
    code: 'AUH',
    name: 'Abu Dhabi International Airport',
    city: 'Abu Dhabi',
    country: 'United Arab Emirates',
    continent: 'Asia',
    latitude: 24.4330,
    longitude: 54.6511,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'doh',
    code: 'DOH',
    name: 'Hamad International Airport',
    city: 'Doha',
    country: 'Qatar',
    continent: 'Asia',
    latitude: 25.2731,
    longitude: 51.6080,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'cai',
    code: 'CAI',
    name: 'Cairo International Airport',
    city: 'Cairo',
    country: 'Egypt',
    continent: 'Africa',
    latitude: 30.1219,
    longitude: 31.4056,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'jnb',
    code: 'JNB',
    name: 'O. R. Tambo International Airport',
    city: 'Johannesburg',
    country: 'South Africa',
    continent: 'Africa',
    latitude: -26.1392,
    longitude: 28.2460,
    category: 'hub',
    popularity: 7
  },
  {
    id: 'cpt',
    code: 'CPT',
    name: 'Cape Town International Airport',
    city: 'Cape Town',
    country: 'South Africa',
    continent: 'Africa',
    latitude: -33.9715,
    longitude: 18.6021,
    category: 'international',
    popularity: 8
  },

  // Oceania
  {
    id: 'syd',
    code: 'SYD',
    name: 'Sydney Kingsford Smith Airport',
    city: 'Sydney',
    country: 'Australia',
    continent: 'Oceania',
    latitude: -33.9399,
    longitude: 151.1753,
    category: 'hub',
    popularity: 9
  },
  {
    id: 'mel',
    code: 'MEL',
    name: 'Melbourne Airport',
    city: 'Melbourne',
    country: 'Australia',
    continent: 'Oceania',
    latitude: -37.6690,
    longitude: 144.8410,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'akl',
    code: 'AKL',
    name: 'Auckland Airport',
    city: 'Auckland',
    country: 'New Zealand',
    continent: 'Oceania',
    latitude: -37.0082,
    longitude: 174.7850,
    category: 'international',
    popularity: 7
  },
  {
    id: 'bne',
    code: 'BNE',
    name: 'Brisbane Airport',
    city: 'Brisbane',
    country: 'Australia',
    continent: 'Oceania',
    latitude: -27.3942,
    longitude: 153.1218,
    category: 'international',
    popularity: 7
  },

  // South America
  {
    id: 'gru',
    code: 'GRU',
    name: 'São Paulo-Guarulhos International Airport',
    city: 'São Paulo',
    country: 'Brazil',
    continent: 'South America',
    latitude: -23.4356,
    longitude: -46.4731,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'gig',
    code: 'GIG',
    name: 'Rio de Janeiro-Galeão International Airport',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    continent: 'South America',
    latitude: -22.8099,
    longitude: -43.2505,
    category: 'hub',
    popularity: 8
  },
  {
    id: 'eze',
    code: 'EZE',
    name: 'Ministro Pistarini International Airport',
    city: 'Buenos Aires',
    country: 'Argentina',
    continent: 'South America',
    latitude: -34.8222,
    longitude: -58.5358,
    category: 'hub',
    popularity: 7
  },
  {
    id: 'bog',
    code: 'BOG',
    name: 'El Dorado International Airport',
    city: 'Bogotá',
    country: 'Colombia',
    continent: 'South America',
    latitude: 4.7016,
    longitude: -74.1469,
    category: 'hub',
    popularity: 7
  },
  {
    id: 'lim',
    code: 'LIM',
    name: 'Jorge Chávez International Airport',
    city: 'Lima',
    country: 'Peru',
    continent: 'South America',
    latitude: -12.0219,
    longitude: -77.1143,
    category: 'international',
    popularity: 7
  }
];

// Helper functions
export const getAirportByCode = (code: string): AirportDestination | undefined => {
  return airportDestinations.find(airport => airport.code === code);
};

export const getAirportsByContinent = (continent: string): AirportDestination[] => {
  return airportDestinations.filter(airport => airport.continent === continent);
};

export const searchAirports = (query: string): AirportDestination[] => {
  const lowercaseQuery = query.toLowerCase();
  return airportDestinations.filter(airport => 
    airport.code.toLowerCase().includes(lowercaseQuery) ||
    airport.city.toLowerCase().includes(lowercaseQuery) ||
    airport.name.toLowerCase().includes(lowercaseQuery) ||
    airport.country.toLowerCase().includes(lowercaseQuery)
  );
};

export const getPopularAirports = (limit: number = 20): AirportDestination[] => {
  return airportDestinations
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};
