import { GooglePlacesError, AppError } from '../lib/errors'; // Added AppError to imports

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
}

export async function searchPlace(
    locationQuery: string, // This is the primary search input, e.g., "restaurants in SoHo" or just "SoHo"
    options?: Partial<SearchOptions> // Make options partial, as query comes from locationQuery now
  ): Promise<VenueSearchResult> { // Return VenueSearchResult

  const effectiveQuery = options?.query || options?.searchTerm || locationQuery;

  console.log('🔍 [googlePlaces] Starting search with effective query:', effectiveQuery, 'Original options:', options);
  
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  console.log('🔑 [googlePlaces] API Key Status (inside searchPlace):');
  console.log('   - Present in process.env:', !!apiKey);
  console.log('   - Length:', apiKey?.length || 0);
  // console.log('   - First 10 chars:', apiKey?.substring(0, 10) + '...' || 'NOT SET'); // Avoid logging key parts
  
  if (!apiKey) {
    const error = new GooglePlacesError('Google Places API key not found directly from process.env.GOOGLE_PLACES_API_KEY');
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
      const results = (data.results || []) as PlaceDetails[];
      console.log('✅ [googlePlaces] Success! Found', results.length, 'places');
      
      if (results.length > 0) {
        console.log('📍 [googlePlaces] First result:', {
          name: results[0].name,
          address: results[0].formatted_address,
          place_id: results[0].place_id
        });
        return { primary: results[0], alternatives: results.slice(1) };
      } else {
        // Still OK status but zero results
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