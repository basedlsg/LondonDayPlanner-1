/**
 * Google Places API client-side integration
 * Provides real venue search for dynamic itinerary generation
 */

// Proxy-based Google Places API - SENIOR ARCHITECT APPROVED SOLUTION
const GOOGLE_PLACES_API_KEY = 'AIzaSyANvAALVm7PDSxqHplpqhw3SbE8Q3xE8lY';
const PROXY = 'https://api.allorigins.win/raw?url=';

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
  try {
    const cityCoords = CITY_COORDINATES[city as keyof typeof CITY_COORDINATES] || CITY_COORDINATES.nyc;
    
    // Build search query with location bias
    const searchQuery = `${query} ${type} in ${city}`;
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.append('query', searchQuery);
    url.searchParams.append('location', `${cityCoords.lat},${cityCoords.lng}`);
    url.searchParams.append('radius', '10000'); // 10km radius
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
    
    console.log('🔍 Searching Google Places:', { query: searchQuery, city });
    
    // Use proxy to bypass CORS - SENIOR ARCHITECT SOLUTION
    const proxiedUrl = PROXY + encodeURIComponent(url.toString());
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }
    
    const data: PlacesSearchResult = await response.json();
    
    if (data.status !== 'OK') {
      console.warn('Places API warning:', data.status);
      return [];
    }
    
    console.log('✅ Found places:', data.results.length);
    return data.results.slice(0, 5); // Return top 5 results
    
  } catch (error) {
    console.error('❌ Places API error:', error);
    return [];
  }
}

/**
 * Get place details for enhanced information
 */
export async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'name,formatted_address,formatted_phone_number,website,rating,price_level,opening_hours,photos');
    url.searchParams.append('key', GOOGLE_PLACES_API_KEY);
    
    const proxiedUrl = PROXY + encodeURIComponent(url.toString());
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Place details error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.result;
    
  } catch (error) {
    console.error('❌ Place details error:', error);
    return null;
  }
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