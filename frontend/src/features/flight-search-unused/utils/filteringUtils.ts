/**
 * Filtering Utilities
 * 
 * Functions for filtering and personalizing attraction recommendations
 */

import { Attraction, UserPreferences, FilterType } from '../types';
import { getCategoryName, getDestinationCityName } from './helpers';
import { getFallbackAttractions } from './fallbackAttractions';

/**
 * Filter recommendations to ensure they're in the correct destination and are actual attractions
 */
export const filterByDestination = (recommendations: Attraction[], destination: string): Attraction[] => {
  const cityName = getDestinationCityName(destination);
  const destinationLower = cityName.toLowerCase();
  const destinationWords = destinationLower.split(' ').filter(word => word.length > 2);

  console.log(`🔍 Filtering ${recommendations.length} recommendations for destination: ${destination} -> ${cityName}`);

  const filtered = recommendations.filter(rec => {
    const name = (rec.name || '').toLowerCase();
    const address = (rec.address || '').toLowerCase();
    const description = (rec.description || '').toLowerCase();
    const category = getCategoryName(rec.category).toLowerCase();

    // Must be in the correct destination - be more flexible for city matching
    const isInDestination = address.includes(destinationLower) ||
      name.includes(destinationLower) ||
      description.includes(destinationLower) ||
      // Check for common city variations
      (destinationLower === 'mumbai' && (address.includes('bombay') || name.includes('bombay'))) ||
      (destinationLower === 'new york' && (address.includes('nyc') || name.includes('manhattan'))) ||
      // For countries, check if address contains the country
      (destinationLower === 'italy' && address.includes('italy')) ||
      (destinationLower === 'france' && address.includes('france')) ||
      (destinationLower === 'spain' && address.includes('spain')) ||
      (destinationLower === 'germany' && address.includes('germany')) ||
      (destinationLower === 'japan' && address.includes('japan')) ||
      (destinationLower === 'australia' && address.includes('australia')) ||
      // More flexible matching - if no specific location found, be more lenient
      (destinationWords.some(word => address.includes(word) || name.includes(word)));

    // Must be an actual attraction/tourist place (not random businesses)
    const isAttraction = category.includes('attraction') ||
      category.includes('landmark') ||
      category.includes('museum') ||
      category.includes('park') ||
      category.includes('bridge') ||
      category.includes('monument') ||
      category.includes('memorial') ||
      category.includes('gallery') ||
      category.includes('theater') ||
      category.includes('theatre') ||
      category.includes('zoo') ||
      category.includes('aquarium') ||
      category.includes('garden') ||
      category.includes('square') ||
      category.includes('plaza') ||
      category.includes('tower') ||
      category.includes('castle') ||
      category.includes('palace') ||
      category.includes('cathedral') ||
      category.includes('church') ||
      category.includes('temple') ||
      category.includes('beach') ||
      category.includes('island') ||
      category.includes('mountain') ||
      category.includes('canyon') ||
      category.includes('waterfall') ||
      category.includes('cave') ||
      category.includes('ruins') ||
      category.includes('fort') ||
      category.includes('observatory') ||
      category.includes('heritage') ||
      category.includes('tourist') ||
      category.includes('sightseeing') ||
      category.includes('viewpoint') ||
      category.includes('scenic') ||
      category.includes('historic') ||
      category.includes('famous') ||
      category.includes('popular') ||
      category.includes('iconic') ||
      category.includes('location') ||
      category.includes('things to do') ||
      (!category.includes('restaurant') && !category.includes('hotel') && !category.includes('shop'));

    // Reject generic businesses
    const isGenericBusiness = (category.includes('restaurant') && !category.includes('famous')) ||
      (category.includes('hotel') && !category.includes('historic')) ||
      category.includes('shop') ||
      category.includes('store') ||
      category.includes('mall') ||
      category.includes('bar') ||
      category.includes('club') ||
      category.includes('cafe') ||
      category.includes('gym') ||
      category.includes('spa') ||
      category.includes('clinic') ||
      category.includes('hospital') ||
      category.includes('school') ||
      category.includes('office');

    // Reject results in wrong cities
    const isInWrongCity = (address.includes('budapest') && !destinationLower.includes('budapest')) ||
      (address.includes('las vegas') && !destinationLower.includes('las vegas')) ||
      (address.includes('paris') && !destinationLower.includes('paris')) ||
      (address.includes('london') && !destinationLower.includes('london')) ||
      (address.includes('tokyo') && !destinationLower.includes('tokyo')) ||
      (address.includes('dubai') && !destinationLower.includes('dubai')) ||
      (destinationLower === 'italy' && (address.includes('jordan') || address.includes('istanbul') || address.includes('turkey'))) ||
      (destinationLower === 'france' && (address.includes('jordan') || address.includes('istanbul') || address.includes('turkey'))) ||
      (destinationLower === 'spain' && (address.includes('jordan') || address.includes('istanbul') || address.includes('turkey')));

    return isInDestination && isAttraction && !isGenericBusiness && !isInWrongCity;
  });

  console.log(`✅ Filtered to ${filtered.length} recommendations`);
  return filtered;
};

/**
 * Personalize recommendations based on user preferences
 */
export const personalizeRecommendations = (
  recommendations: Attraction[],
  userPreferences: UserPreferences | null,
  destination: string
): Attraction[] => {
  const cityName = getDestinationCityName(destination);
  const filteredRecommendations = filterByDestination(recommendations, cityName);

  if (filteredRecommendations.length === 0) {
    console.warn('⚠️ No quality recommendations found for destination:', destination);
    
    // Use fallback attractions for major cities
    const fallbackAttractions = getFallbackAttractions(destination);
    if (fallbackAttractions.length > 0) {
      console.log('🎯 Using fallback attractions for', cityName);
      return fallbackAttractions.map(attraction => ({
        location_id: `fallback_${attraction.name?.toLowerCase().replace(/\s+/g, '_')}`,
        name: attraction.name || '',
        category: attraction.category || 'Attraction',
        rating: attraction.rating || 4.0,
        num_reviews: attraction.num_reviews || 0,
        address: `${cityName}`,
        photos: attraction.photos || [],
        reviews: [],
        description: attraction.description,
        web_url: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(attraction.name + ' ' + cityName)}`
      }));
    }

    return recommendations.slice(0, 6);
  }

  if (!userPreferences || Object.keys(userPreferences).length === 0) {
    return filteredRecommendations.slice(0, 6);
  }

  const { interests = [], travelStyle } = userPreferences;

  // Define category mappings for interests
  const interestCategoryMap: { [key: string]: string[] } = {
    'sightseeing': ['attraction', 'landmarks', 'museums', 'monuments'],
    'food': ['restaurant', 'cafe', 'food'],
    'nightlife': ['bar', 'club', 'entertainment'],
    'shopping': ['shopping', 'market', 'mall'],
    'nature': ['park', 'garden', 'beach', 'mountain'],
    'culture': ['museum', 'gallery', 'theater', 'cultural'],
    'adventure': ['adventure', 'outdoor', 'sports'],
    'relaxation': ['spa', 'wellness', 'resort'],
    'family': ['family', 'kids', 'amusement'],
    'history': ['historical', 'heritage', 'monument']
  };

  // Score each recommendation
  const scoredRecommendations = filteredRecommendations.map(rec => {
    let personalizationScore = 0;
    const category = getCategoryName(rec.category).toLowerCase();
    const description = (rec.description || '').toLowerCase();

    // Score based on interests
    interests.forEach((interest: string) => {
      const mappedCategories = interestCategoryMap[interest.toLowerCase()] || [];
      if (mappedCategories.some(cat => category.includes(cat))) {
        personalizationScore += 0.3;
      }
      if (description.includes(interest.toLowerCase())) {
        personalizationScore += 0.2;
      }
    });

    // Score based on travel style
    if (travelStyle) {
      if (travelStyle === 'luxury' && (category.includes('resort') || description.includes('luxury'))) {
        personalizationScore += 0.2;
      }
      if (travelStyle === 'budget' && (description.includes('budget') || description.includes('affordable'))) {
        personalizationScore += 0.2;
      }
    }

    // Boost for high ratings
    const rating = parseFloat(rec.rating as string) || 0;
    if (rating >= 4.5) personalizationScore += 0.3;
    else if (rating >= 4.0) personalizationScore += 0.2;
    else if (rating >= 3.5) personalizationScore += 0.1;

    // Boost for review count
    const reviewCount = parseInt(rec.num_reviews as string) || 0;
    if (reviewCount >= 10000) personalizationScore += 0.3;
    else if (reviewCount >= 1000) personalizationScore += 0.2;
    else if (reviewCount >= 100) personalizationScore += 0.1;

    // Boost for iconic places
    const name = rec.name.toLowerCase();
    const isIconic = name.includes('bridge') || name.includes('tower') || name.includes('museum') ||
      name.includes('cathedral') || name.includes('palace') || name.includes('monument');
    if (isIconic) personalizationScore += 0.4;

    return {
      ...rec,
      personalizationScore: Math.min(personalizationScore, 1.0)
    };
  });

  // Sort by personalization score, then by rating
  return scoredRecommendations
    .sort((a, b) => {
      if (a.personalizationScore !== b.personalizationScore) {
        return (b.personalizationScore || 0) - (a.personalizationScore || 0);
      }
      return (parseFloat(b.rating as string) || 0) - (parseFloat(a.rating as string) || 0);
    })
    .slice(0, 6);
};

/**
 * Filter recommendations based on active filter
 */
export const getFilteredRecommendations = (
  recommendations: Attraction[],
  activeFilter: FilterType
): Attraction[] => {
  if (!recommendations || recommendations.length === 0) return [];

  switch (activeFilter) {
    case 'Top Rated':
      return recommendations.filter(rec => parseFloat(rec.rating as string) >= 4.5);
    case 'Popular':
      return recommendations.filter(rec => parseInt(rec.num_reviews as string) >= 1000);
    case 'Hidden Gems':
      // Good rating but fewer reviews
      return recommendations.filter(rec =>
        parseFloat(rec.rating as string) >= 4.0 && parseInt(rec.num_reviews as string) < 500
      );
    case 'All':
    default:
      return recommendations;
  }
};
