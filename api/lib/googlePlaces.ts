// @ts-nocheck
import { GooglePlacesError, AppError } from '../lib/errors'; // Added AppError to imports
import { getApiKey } from '../config'; // Import config to get API keys
import { CityConfigService } from '../services/CityConfigService';
import { LocationResolver } from '../services/LocationResolver';

// Ensure this interface matches what your application expects and what Google returns
export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    periods?: any[]; // Consider typing this more strictly if needed
  };
  photos?: any[]; // Consider typing this more strictly if needed
  website?: string;
  international_phone_number?: string;
  // Add any other fields your application might use from Google Places response
}

export interface VenueSearchResult {
    primary: PlaceDetails;
    alternatives: PlaceDetails[];
}

function getLocationBias(query: string, citySlug?: string): { coordinates: string; radius: string } {
  try {
    // Initialize services
    const cityConfigService = new CityConfigService();
    const locationResolver = new LocationResolver();
    
    console.log(`🔍 [googlePlaces] Getting location bias for query: "${query}", citySlug: "${citySlug}"`);
    
    // Determine the city slug from the query if not provided
    let effectiveCitySlug = citySlug;
    if (!effectiveCitySlug) {
      // Try to detect city from query
      const queryLower = query.toLowerCase();
      if (queryLower.includes('london')) {
        effectiveCitySlug = 'london';
      } else if (queryLower.includes('boston')) {
        effectiveCitySlug = 'boston';
      } else if (queryLower.includes('austin')) {
        effectiveCitySlug = 'austin';
      } else {
        // Default to NYC
        effectiveCitySlug = 'nyc';
      }
    }
    
    console.log(`🏙️ [googlePlaces] Effective city slug: "${effectiveCitySlug}"`);
    
    // Get city config with detailed areas
    const cityConfig = cityConfigService.getCityConfigWithDetails(effectiveCitySlug);
    console.log(`📊 [googlePlaces] Loaded ${cityConfig.detailedAreas?.length || 0} detailed areas for ${effectiveCitySlug}`);
    
    // Try to find specific area mentions in the query
    const areas = locationResolver.extractAreaReferences(query, cityConfig);
    console.log(`🗺️ [googlePlaces] Found ${areas.length} area matches in query`);
    
    if (areas.length > 0) {
      // Use the first matched area's coordinates
      const area = areas[0];
      const bias = {
        coordinates: `${area.coordinates.lat},${area.coordinates.lng}`,
        radius: '5000' // 5km radius for neighborhoods
      };
      console.log(`📍 [googlePlaces] Using specific area "${area.name}" coordinates:`, bias);
      return bias;
    }
    
    // Fall back to city center if no specific area found
    const bias = {
      coordinates: `${cityConfig.defaultLocation.lat},${cityConfig.defaultLocation.lng}`,
      radius: '25000' // 25km radius for city-wide search
    };
    console.log(`📍 [googlePlaces] Using city center for "${effectiveCitySlug}":`, bias);
    return bias;
  } catch (error) {
    console.error('❌ [googlePlaces] Error getting location bias:', error);
    // Default fallback to NYC center
    const fallback = {
      coordinates: '40.7128,-74.0060',
      radius: '25000'
    };
    console.log('📍 [googlePlaces] Using fallback NYC coordinates:', fallback);
    return fallback;
  }
}

// Keeping SearchOptions interface for clarity, even if not all are used by Text Search directly
export interface SearchOptions {
  query?: string; // Made optional as searchQuery is constructed
  location?: string;
  keywords?: string[];
  type?: string;
  minRating?: number; // Note: Text Search doesn't directly support minRating
  // Add other potential options if your app uses them elsewhere for different Google APIs
  // For Text Search, the main input is the 'query' parameter.
  // For Nearby Search (another API), parameters like location (lat,lng), radius, type, keyword are used.
  // The current implementation seems to be a Text Search.
  searchTerm?: string; // This was used in ItineraryPlanningService, let's ensure it maps to query
  citySlug?: string; // Add city slug to help with location bias
}

export async function searchPlace(
    locationQuery: string, // This is the primary search input, e.g., "restaurants in SoHo" or just "SoHo"
    options?: Partial<SearchOptions> // Make options partial, as query comes from locationQuery now
  ): Promise<VenueSearchResult> { // Return VenueSearchResult

  const effectiveQuery = options?.query || options?.searchTerm || locationQuery;

  console.log('🔍 [googlePlaces] Starting search with effective query:', effectiveQuery, 'Original options:', options);
  
  const apiKey = getApiKey('GOOGLE_PLACES_API_KEY');
  
  console.log('🔑 [googlePlaces] API Key Status (inside searchPlace):');
  console.log('   - Retrieved from config:', !!apiKey);
  console.log('   - Length:', apiKey?.length || 0);
  
  if (!apiKey) {
    const error = new GooglePlacesError('Google Places API key not found from config.getApiKey()');
    console.error('❌ [googlePlaces] API Key Error:', error.message);
    throw error;
  }

  try {
    let searchQuery = effectiveQuery;
    // The user prompt's version of searchPlace had `options.location` and `options.keywords` to augment the query.
    // The original call from ItineraryPlanningService passed `timeSlot.location` as first arg, and `searchOptionsForGoogle` as second.
    // Let's ensure we can still use context from `options` if provided.
    if (options?.location && locationQuery !== options.location) {
        // If options.location is different from the main locationQuery, it might be a refining context.
        searchQuery += ` near ${options.location}`;
    }
    if (options?.keywords && options.keywords.length > 0) {
      searchQuery += ` ${options.keywords.join(' ')}`;
    }
    
    console.log('🔍 [googlePlaces] Final constructed search query for API:', searchQuery);
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.append('query', searchQuery);
    url.searchParams.append('key', apiKey);
    
    // Add location bias based on query and city context
    const locationBias = getLocationBias(searchQuery, options?.citySlug);
    url.searchParams.append('location', locationBias.coordinates);
    url.searchParams.append('radius', locationBias.radius);
    
    // Append type from options if it exists
    if (options?.type) {
      url.searchParams.append('type', options.type);
    }
    
    console.log('🌐 [googlePlaces] Request URL (key hidden):', url.toString().replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(url.toString());
    console.log('📡 [googlePlaces] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      // Attempt to get error message from Google if available
      let errorBody = 'Unknown error from Google Places API.';
      try {
        const errData = await response.json();
        errorBody = errData.error_message || errData.status || errorBody;
      } catch (e) { /* ignore parsing error */ }
      throw new GooglePlacesError(`Google Places API HTTP Error ${response.status}: ${response.statusText}. Detail: ${errorBody}`);
    }
    
    const data = await response.json();
    console.log('📊 [googlePlaces] API Response status from data object:', data.status);
    
    if (data.status === 'OK') {
      let results = (data.results || []) as PlaceDetails[];
      console.log('✅ [googlePlaces] Success! Found', results.length, 'places');
      
      // Filter results to only include venues in the requested city
      if (options?.citySlug) {
        const cityConfigService = new CityConfigService();
        const cityConfig = cityConfigService.getCityConfigWithDetails(options.citySlug);
        const cityName = cityConfig.name.toLowerCase();
        
        const cityAliases: Record<string, string[]> = {
          'new york': ['new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'],
          'boston': ['boston', 'ma', 'massachusetts', 'cambridge', 'somerville', 'brookline'],
          'london': ['london', 'uk', 'united kingdom', 'england'],
          'austin': ['austin', 'tx', 'texas']
        };
        
        const cityTerms = cityAliases[cityName] || [cityName];
        
        results = results.filter(place => {
          const address = (place.formatted_address || '').toLowerCase();
          
          // Check for city terms with word boundaries to avoid false matches
          const isInCity = cityTerms.some(term => {
            // For short terms like state codes, ensure word boundaries
            if (term.length <= 2) {
              // Check for state codes with proper formatting (e.g., ", MA" or " MA ")
              const statePattern = new RegExp(`[, ]${term}[, ]|[, ]${term}$`, 'i');
              return statePattern.test(address);
            }
            // For longer terms, regular includes is fine
            return address.includes(term);
          });
          
          if (!isInCity) {
            console.log(`🚫 [googlePlaces] Filtering out ${place.name} - address "${place.formatted_address}" not in ${cityConfig.name}`);
          }
          
          return isInCity;
        });
        
        console.log(`🏙️ [googlePlaces] After city filtering: ${results.length} venues remain for ${cityConfig.name}`);
      }
      
      if (results.length > 0) {
        console.log('📍 [googlePlaces] First result:', {
          name: results[0].name,
          address: results[0].formatted_address,
          place_id: results[0].place_id,
          rating: results[0].rating,
          types: results[0].types
        });
        console.log('🔍 [googlePlaces] Full first result data:', JSON.stringify(results[0], null, 2));
        return { primary: results[0], alternatives: results.slice(1) };
      } else {
        // Still OK status but zero results after filtering
        console.log('📍 [googlePlaces] No results found after city filtering');
        return { primary: null as any, alternatives: [] }; // Return structure expected by service
      }
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('📍 [googlePlaces] No results found for query:', searchQuery);
      return { primary: null as any, alternatives: [] }; // Return structure expected by service
    } else {
      const errorMsg = data.error_message || `Google Places API returned status: ${data.status}`;
      console.error('❌ [googlePlaces] Google API Error:', { status: data.status, error_message: data.error_message, query: searchQuery });
      throw new GooglePlacesError(errorMsg);
    }
  } catch (error: any) {
    console.error('❌ [googlePlaces] Search function failed catastrophically:', { error: error.message, query: effectiveQuery });
    if (error instanceof GooglePlacesError || error instanceof AppError) { // Re-throw known AppErrors
      throw error;
    }
    // Wrap unknown errors
    throw new GooglePlacesError(`Google Places search failed for "${effectiveQuery}" due to an unexpected error.`, error);
  }
}