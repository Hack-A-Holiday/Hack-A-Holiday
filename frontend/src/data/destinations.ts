export interface Destination {
  id: string;
  name: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  description: string;
  category: 'beach' | 'city' | 'nature' | 'historical' | 'adventure' | 'cultural';
  popularity: number; // 1-10 scale
  bestMonths: string[];
  averageCost: string;
  image?: string;
}

export const popularDestinations: Destination[] = [
  // Europe
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    continent: 'Europe',
    latitude: 48.8566,
    longitude: 2.3522,
    description: 'The City of Light, famous for the Eiffel Tower, Louvre, and romantic atmosphere.',
    category: 'city',
    popularity: 10,
    bestMonths: ['April', 'May', 'September', 'October'],
    averageCost: '$150-300/day'
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    continent: 'Europe',
    latitude: 41.9028,
    longitude: 12.4964,
    description: 'The Eternal City with ancient history, Vatican City, and incredible cuisine.',
    category: 'historical',
    popularity: 9,
    bestMonths: ['April', 'May', 'September', 'October'],
    averageCost: '$120-250/day'
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    continent: 'Europe',
    latitude: 51.5074,
    longitude: -0.1278,
    description: 'Historic capital with royal palaces, museums, and vibrant culture.',
    category: 'city',
    popularity: 9,
    bestMonths: ['May', 'June', 'July', 'August', 'September'],
    averageCost: '$180-350/day'
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    continent: 'Europe',
    latitude: 41.3851,
    longitude: 2.1734,
    description: 'Gaudí architecture, beaches, and Mediterranean charm.',
    category: 'city',
    popularity: 8,
    bestMonths: ['April', 'May', 'September', 'October'],
    averageCost: '$100-200/day'
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    continent: 'Europe',
    latitude: 52.3676,
    longitude: 4.9041,
    description: 'Canals, museums, and bike-friendly culture.',
    category: 'city',
    popularity: 8,
    bestMonths: ['April', 'May', 'September', 'October'],
    averageCost: '$120-250/day'
  },

  // Asia
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    latitude: 35.6762,
    longitude: 139.6503,
    description: 'Modern metropolis blending tradition with cutting-edge technology.',
    category: 'city',
    popularity: 9,
    bestMonths: ['March', 'April', 'May', 'September', 'October', 'November'],
    averageCost: '$120-300/day'
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    continent: 'Asia',
    latitude: -8.3405,
    longitude: 115.0920,
    description: 'Tropical paradise with temples, beaches, and rice terraces.',
    category: 'beach',
    popularity: 9,
    bestMonths: ['April', 'May', 'June', 'July', 'August', 'September'],
    averageCost: '$50-150/day'
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    continent: 'Asia',
    latitude: 1.3521,
    longitude: 103.8198,
    description: 'Garden city with futuristic architecture and amazing food.',
    category: 'city',
    popularity: 8,
    bestMonths: ['February', 'March', 'April', 'May', 'June'],
    averageCost: '$80-200/day'
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    continent: 'Asia',
    latitude: 19.0760,
    longitude: 72.8777,
    description: 'Bollywood capital with colonial architecture and vibrant street life.',
    category: 'city',
    popularity: 7,
    bestMonths: ['November', 'December', 'January', 'February', 'March'],
    averageCost: '$30-80/day'
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    continent: 'Asia',
    latitude: 13.7563,
    longitude: 100.5018,
    description: 'Vibrant street markets, temples, and incredible street food.',
    category: 'city',
    popularity: 8,
    bestMonths: ['November', 'December', 'January', 'February'],
    averageCost: '$40-100/day'
  },

  // North America
  {
    id: 'new-york',
    name: 'New York City',
    country: 'United States',
    continent: 'North America',
    latitude: 40.7128,
    longitude: -74.0060,
    description: 'The Big Apple with iconic skyline, Broadway, and diverse neighborhoods.',
    category: 'city',
    popularity: 10,
    bestMonths: ['April', 'May', 'September', 'October', 'November'],
    averageCost: '$200-400/day'
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    country: 'United States',
    continent: 'North America',
    latitude: 34.0522,
    longitude: -118.2437,
    description: 'Hollywood glamour, beaches, and year-round sunshine.',
    category: 'city',
    popularity: 8,
    bestMonths: ['March', 'April', 'May', 'September', 'October', 'November'],
    averageCost: '$150-300/day'
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    continent: 'North America',
    latitude: 43.6532,
    longitude: -79.3832,
    description: 'Multicultural city with CN Tower and vibrant arts scene.',
    category: 'city',
    popularity: 7,
    bestMonths: ['May', 'June', 'July', 'August', 'September'],
    averageCost: '$100-200/day'
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    continent: 'North America',
    latitude: 19.4326,
    longitude: -99.1332,
    description: 'Rich history, incredible cuisine, and vibrant culture.',
    category: 'cultural',
    popularity: 7,
    bestMonths: ['March', 'April', 'May', 'October', 'November'],
    averageCost: '$50-120/day'
  },

  // South America
  {
    id: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    country: 'Brazil',
    continent: 'South America',
    latitude: -22.9068,
    longitude: -43.1729,
    description: 'Carnival, Christ the Redeemer, and beautiful beaches.',
    category: 'beach',
    popularity: 8,
    bestMonths: ['April', 'May', 'June', 'September', 'October'],
    averageCost: '$70-150/day'
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    continent: 'South America',
    latitude: -34.6118,
    longitude: -58.3960,
    description: 'Tango, steakhouses, and European-style architecture.',
    category: 'cultural',
    popularity: 7,
    bestMonths: ['March', 'April', 'May', 'September', 'October', 'November'],
    averageCost: '$60-130/day'
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu',
    country: 'Peru',
    continent: 'South America',
    latitude: -13.1631,
    longitude: -72.5450,
    description: 'Ancient Incan citadel high in the Andes mountains.',
    category: 'historical',
    popularity: 9,
    bestMonths: ['May', 'June', 'July', 'August', 'September'],
    averageCost: '$80-180/day'
  },

  // Africa
  {
    id: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    continent: 'Africa',
    latitude: -33.9249,
    longitude: 18.4241,
    description: 'Table Mountain, wine regions, and stunning coastline.',
    category: 'nature',
    popularity: 8,
    bestMonths: ['November', 'December', 'January', 'February', 'March'],
    averageCost: '$70-150/day'
  },
  {
    id: 'marrakech',
    name: 'Marrakech',
    country: 'Morocco',
    continent: 'Africa',
    latitude: 31.6295,
    longitude: -7.9811,
    description: 'Medina markets, palaces, and Sahara gateway.',
    category: 'cultural',
    popularity: 7,
    bestMonths: ['March', 'April', 'May', 'October', 'November'],
    averageCost: '$50-120/day'
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    continent: 'Africa',
    latitude: 30.0444,
    longitude: 31.2357,
    description: 'Pyramids of Giza, ancient history, and Nile River.',
    category: 'historical',
    popularity: 8,
    bestMonths: ['October', 'November', 'December', 'January', 'February', 'March'],
    averageCost: '$40-100/day'
  },

  // Oceania
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    continent: 'Oceania',
    latitude: -33.8688,
    longitude: 151.2093,
    description: 'Opera House, Harbour Bridge, and beautiful beaches.',
    category: 'city',
    popularity: 9,
    bestMonths: ['September', 'October', 'November', 'March', 'April', 'May'],
    averageCost: '$120-250/day'
  },
  {
    id: 'auckland',
    name: 'Auckland',
    country: 'New Zealand',
    continent: 'Oceania',
    latitude: -36.8485,
    longitude: 174.7633,
    description: 'Adventure activities, stunning landscapes, and friendly culture.',
    category: 'nature',
    popularity: 7,
    bestMonths: ['December', 'January', 'February', 'March', 'April'],
    averageCost: '$100-200/day'
  },

  // Additional Popular Destinations
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    continent: 'Asia',
    latitude: 25.2048,
    longitude: 55.2708,
    description: 'Luxury shopping, ultramodern architecture, and desert adventures.',
    category: 'city',
    popularity: 8,
    bestMonths: ['November', 'December', 'January', 'February', 'March', 'April'],
    averageCost: '$150-400/day'
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    continent: 'Europe',
    latitude: 41.0082,
    longitude: 28.9784,
    description: 'Bridge between Europe and Asia with rich history and culture.',
    category: 'historical',
    popularity: 8,
    bestMonths: ['April', 'May', 'September', 'October'],
    averageCost: '$60-140/day'
  },
  {
    id: 'maldives',
    name: 'Maldives',
    country: 'Maldives',
    continent: 'Asia',
    latitude: 3.2028,
    longitude: 73.2207,
    description: 'Tropical paradise with overwater bungalows and crystal clear waters.',
    category: 'beach',
    popularity: 9,
    bestMonths: ['November', 'December', 'January', 'February', 'March', 'April'],
    averageCost: '$200-800/day'
  }
];

export const getDestinationsByContinent = (continent: string): Destination[] => {
  return popularDestinations.filter(dest => dest.continent === continent);
};

export const getDestinationsByCategory = (category: string): Destination[] => {
  return popularDestinations.filter(dest => dest.category === category);
};

export const searchDestinations = (query: string): Destination[] => {
  const lowercaseQuery = query.toLowerCase();
  return popularDestinations.filter(dest => 
    dest.name.toLowerCase().includes(lowercaseQuery) ||
    dest.country.toLowerCase().includes(lowercaseQuery) ||
    dest.description.toLowerCase().includes(lowercaseQuery)
  );
};