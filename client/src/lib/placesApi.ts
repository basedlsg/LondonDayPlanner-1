/**
 * Google Places API client-side integration
 * Provides real venue search for dynamic itinerary generation
 */

// SECURITY NOTE: API key removed for deployment safety
// TODO: Implement backend proxy for Google Places API calls
// All API calls should go through /api/places/* endpoints

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  price_level?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

interface PlacesSearchResult {
  results: PlaceResult[];
  status: string;
}

// City coordinates for location bias
const CITY_COORDINATES = {
  nyc: { lat: 40.7128, lng: -74.0060 },
  london: { lat: 51.5074, lng: -0.1278 },
  boston: { lat: 42.3601, lng: -71.0589 },
  austin: { lat: 30.2672, lng: -97.7431 }
};

/**
 * Search for places using Google Places API
 */
export async function searchPlaces(
  query: string, 
  city: string, 
  type: string = 'restaurant'
): Promise<PlaceResult[]> {
  // SECURITY: API key removed - returning mock data for demo
  // TODO: Implement backend API proxy at /api/places/search
  console.log('⚠️ Using mock data - Google Places API disabled for security');
  
  const cityCoords = CITY_COORDINATES[city as keyof typeof CITY_COORDINATES] || CITY_COORDINATES.nyc;
  
  // Return mock data based on query type
  const mockPlaces: PlaceResult[] = [
    {
      place_id: `mock_${Math.random()}`,
      name: `${query} - ${city} Location`,
      formatted_address: `123 Main St, ${city}`,
      rating: 4.2 + Math.random() * 0.8,
      types: [type.replace(' ', '_'), 'establishment'],
      geometry: {
        location: {
          lat: cityCoords.lat + (Math.random() - 0.5) * 0.01,
          lng: cityCoords.lng + (Math.random() - 0.5) * 0.01
        }
      },
      opening_hours: { open_now: true }
    }
  ];
  
  return mockPlaces;
}

/**
 * Get place details for enhanced information
 */
export async function getPlaceDetails(placeId: string): Promise<any> {
  // SECURITY: API key removed - returning mock data for demo
  // TODO: Implement backend API proxy at /api/places/details
  console.log('⚠️ Using mock data - Google Places Details API disabled for security');
  
  return {
    name: 'Demo Venue',
    formatted_address: '123 Demo Street',
    formatted_phone_number: '(555) 123-4567',
    website: 'https://example.com',
    rating: 4.5,
    price_level: 2,
    opening_hours: {
      open_now: true,
      weekday_text: ['Open daily 9:00 AM – 10:00 PM']
    }
  };
}

/**
 * Generate intelligent venue suggestions based on query
 */
export async function generateSmartVenues(query: string, city: string, startTime: string = '12:00 PM') {
  const lowercaseQuery = query.toLowerCase();
  
  // Determine venue types based on query
  let searchTypes = ['restaurant', 'cafe'];
  
  if (lowercaseQuery.includes('pizza')) {
    searchTypes = ['pizza restaurant', 'pizzeria'];
  } else if (lowercaseQuery.includes('coffee')) {
    searchTypes = ['coffee shop', 'cafe'];
  } else if (lowercaseQuery.includes('potato')) {
    searchTypes = ['restaurant serving potatoes', 'irish pub'];
  } else if (lowercaseQuery.includes('museum')) {
    searchTypes = ['museum', 'art gallery'];
  } else if (lowercaseQuery.includes('park')) {
    searchTypes = ['park', 'recreation area'];
  }
  
  console.log('🎯 Smart venue search:', { query, city, types: searchTypes });
  
  // Search for venues
  const allResults: PlaceResult[] = [];
  
  for (const searchType of searchTypes) {
    const results = await searchPlaces(query, city, searchType);
    allResults.push(...results);
  }
  
  // Remove duplicates and take best results
  const uniqueResults = allResults.filter((result, index, self) => 
    index === self.findIndex(r => r.place_id === result.place_id)
  );
  
  // Sort by rating and take top 3
  const sortedResults = uniqueResults
    .filter(r => r.rating && r.rating > 4.0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
  
  return sortedResults.length > 0 ? sortedResults : uniqueResults.slice(0, 3);
}

/**
 * Convert Google Places result to our venue format
 */
export function convertToVenueFormat(place: PlaceResult, index: number, startTime: string = '12:00 PM') {
  // Use the actual scheduled time passed in (user's specified time)
  const scheduledTime = startTime;
  
  return {
    id: index + 1,
    name: place.name,
    address: place.formatted_address,
    time: scheduledTime,
    rating: place.rating || 4.0,
    categories: place.types.slice(0, 2).map(type => type.replace(/_/g, ' ')),
    description: `Highly rated ${place.types[0]?.replace(/_/g, ' ')} perfect for "${place.name}"`,
    estimatedTime: index === 0 ? '1-2 hours' : '45-90 minutes',
    photos: [],
    website: '#',
    phoneNumber: '(555) 123-456' + (7 + index)
  };
}