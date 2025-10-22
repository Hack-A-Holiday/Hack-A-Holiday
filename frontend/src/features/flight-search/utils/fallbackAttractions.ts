/**
 * Fallback Attractions Data
 * 
 * Fallback attraction data for major cities when API fails
 */

import { Attraction } from '../types';

export const getFallbackAttractions = (destination: string): Partial<Attraction>[] => {
  const destLower = destination.toLowerCase();

  if (destLower.includes('new york') || destLower.includes('nyc')) {
    return [
      {
        name: 'Brooklyn Bridge',
        category: 'Bridges',
        rating: 4.7,
        num_reviews: 26302,
        description: 'Iconic suspension bridge connecting Manhattan and Brooklyn',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800&h=600&fit=crop' } }, caption: 'Brooklyn Bridge at sunset' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'Brooklyn Bridge walkway' }
        ]
      },
      {
        name: 'Central Park',
        category: 'Parks',
        rating: 4.8,
        num_reviews: 134354,
        description: 'Massive public park in the heart of Manhattan',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' } }, caption: 'Central Park in autumn' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop' } }, caption: 'Central Park lake and skyline' }
        ]
      },
      {
        name: 'The Metropolitan Museum of Art',
        category: 'Art Museums',
        rating: 4.8,
        num_reviews: 55463,
        description: 'World-renowned art museum with vast collections',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' } }, caption: 'Metropolitan Museum of Art facade' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' } }, caption: 'Met Museum interior' }
        ]
      },
      {
        name: 'The High Line',
        category: 'Parks',
        rating: 4.6,
        num_reviews: 45678,
        description: 'Elevated park built on former railway tracks',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'High Line park walkway' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' } }, caption: 'High Line with city views' }
        ]
      },
      {
        name: 'The National 9/11 Memorial & Museum',
        category: 'Memorials',
        rating: 4.7,
        num_reviews: 23456,
        description: 'Memorial and museum honoring 9/11 victims',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: '9/11 Memorial reflecting pools' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' } }, caption: '9/11 Memorial tribute' }
        ]
      },
      {
        name: 'Top of the Rock',
        category: 'Observation Decks',
        rating: 4.5,
        num_reviews: 34567,
        description: 'Observation deck at Rockefeller Center',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=800&h=600&fit=crop' } }, caption: 'Top of the Rock observation deck' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'NYC skyline from Top of the Rock' }
        ]
      }
    ];
  }

  if (destLower.includes('paris')) {
    return [
      {
        name: 'Eiffel Tower',
        category: 'Towers',
        rating: 4.6,
        num_reviews: 123456,
        description: 'Iconic iron lattice tower and symbol of Paris',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=600&fit=crop' } }, caption: 'Eiffel Tower at sunset' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop' } }, caption: 'Eiffel Tower from below' }
        ]
      },
      {
        name: 'Louvre Museum',
        category: 'Art Museums',
        rating: 4.5,
        num_reviews: 98765,
        description: 'World\'s largest art museum and historic monument',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' } }, caption: 'Louvre Museum pyramid' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' } }, caption: 'Louvre Museum interior' }
        ]
      },
      {
        name: 'Notre-Dame Cathedral',
        category: 'Cathedrals',
        rating: 4.4,
        num_reviews: 87654,
        description: 'Medieval Catholic cathedral and Gothic masterpiece',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'Notre-Dame Cathedral facade' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' } }, caption: 'Notre-Dame Cathedral interior' }
        ]
      }
    ];
  }

  if (destLower.includes('london')) {
    return [
      {
        name: 'Big Ben',
        category: 'Towers',
        rating: 4.5,
        num_reviews: 87654,
        description: 'Iconic clock tower and symbol of London',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=600&fit=crop' } }, caption: 'Big Ben clock tower' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'Big Ben and Westminster' }
        ]
      },
      {
        name: 'Tower of London',
        category: 'Castles',
        rating: 4.4,
        num_reviews: 76543,
        description: 'Historic castle and royal palace',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop' } }, caption: 'Tower of London exterior' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' } }, caption: 'Tower of London courtyard' }
        ]
      },
      {
        name: 'British Museum',
        category: 'Museums',
        rating: 4.6,
        num_reviews: 98765,
        description: 'World\'s first national public museum',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'British Museum facade' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' } }, caption: 'British Museum interior' }
        ]
      }
    ];
  }

  if (destLower.includes('dubai')) {
    return [
      { name: 'Burj Khalifa', category: 'Skyscrapers', rating: 4.6, num_reviews: 45678, description: 'World\'s tallest building and Dubai icon' },
      { name: 'Burj Al Arab', category: 'Hotels', rating: 4.5, num_reviews: 34567, description: 'Luxury hotel shaped like a sail' },
      { name: 'Palm Jumeirah', category: 'Islands', rating: 4.4, num_reviews: 23456, description: 'Artificial island in the shape of a palm tree' },
      { name: 'Dubai Mall', category: 'Shopping Centers', rating: 4.3, num_reviews: 12345, description: 'One of the world\'s largest shopping malls' },
      { name: 'Dubai Fountain', category: 'Fountains', rating: 4.5, num_reviews: 10987, description: 'Musical fountain show at the base of Burj Khalifa' },
      { name: 'Dubai Marina', category: 'Waterfronts', rating: 4.2, num_reviews: 9876, description: 'Artificial canal city with luxury yachts' }
    ];
  }

  if (destLower.includes('mumbai') || destLower.includes('bombay')) {
    return [
      { name: 'Gateway of India', category: 'Monuments', rating: 4.3, num_reviews: 25678, description: 'Iconic arch monument overlooking the Arabian Sea' },
      { name: 'Marine Drive', category: 'Promenades', rating: 4.4, num_reviews: 18765, description: 'Famous waterfront promenade known as Queen\'s Necklace' },
      { name: 'Chhatrapati Shivaji Terminus', category: 'Railway Stations', rating: 4.2, num_reviews: 12345, description: 'UNESCO World Heritage railway station with Victorian architecture' },
      { name: 'Elephanta Caves', category: 'Caves', rating: 4.1, num_reviews: 9876, description: 'Ancient rock-cut caves dedicated to Lord Shiva' },
      { name: 'Haji Ali Dargah', category: 'Religious Sites', rating: 4.3, num_reviews: 11234, description: 'Famous mosque and tomb on an islet in the Arabian Sea' }
    ];
  }

  if (destLower.includes('tokyo')) {
    return [
      { name: 'Tokyo Skytree', category: 'Towers', rating: 4.5, num_reviews: 34567, description: 'Tallest structure in Japan and broadcasting tower' },
      { name: 'Senso-ji Temple', category: 'Temples', rating: 4.4, num_reviews: 23456, description: 'Ancient Buddhist temple in Asakusa' },
      { name: 'Tokyo Imperial Palace', category: 'Palaces', rating: 4.3, num_reviews: 12345, description: 'Primary residence of the Emperor of Japan' },
      { name: 'Meiji Shrine', category: 'Shrines', rating: 4.5, num_reviews: 10987, description: 'Shinto shrine dedicated to Emperor Meiji' },
      { name: 'Shibuya Crossing', category: 'Squares', rating: 4.2, num_reviews: 9876, description: 'World\'s busiest pedestrian crossing' }
    ];
  }

  if (destLower.includes('italy')) {
    return [
      {
        name: 'Colosseum',
        category: 'Monuments',
        rating: 4.6,
        num_reviews: 123456,
        description: 'Ancient Roman amphitheater and iconic symbol of Rome',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=600&fit=crop' } }, caption: 'Colosseum exterior view' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' } }, caption: 'Colosseum interior arena' }
        ]
      },
      {
        name: 'Leaning Tower of Pisa',
        category: 'Towers',
        rating: 4.3,
        num_reviews: 87654,
        description: 'Famous leaning bell tower in Pisa, Italy',
        photos: [
          { images: { large: { url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' } }, caption: 'Leaning Tower of Pisa' },
          { images: { large: { url: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop' } }, caption: 'Pisa Cathedral and Tower' }
        ]
      }
    ];
  }

  return [];
};
