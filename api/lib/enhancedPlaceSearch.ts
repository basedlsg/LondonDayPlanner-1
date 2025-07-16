import { GooglePlacesError } from './errors';
import { getApiKey, isFeatureEnabled } from '../config';
import { PlaceDetails, VenueSearchResult } from './googlePlaces';
import { geminiGenerate } from './geminiAdapter';
import { CityConfigService } from '../services/CityConfigService';
import { LocationResolver } from '../services/LocationResolver';
import { AreaIntelligenceService } from '../services/AreaIntelligenceService';
import { filterOpenVenues, validateOperatingHours } from './operatingHours';

interface EnhancedSearchOptions {
  query: string;
  location?: string;
  keywords?: string[];
  type?: string;
  preferences?: any;
  scheduledDateTime?: Date; // For operating hours validation
  cityContext?: {
    name: string;
    slug: string;
    timezone: string;
  };
}

/**
 * Uses Gemini to enhance search queries for better Google Places results
 */
async function enhanceQueryWithGemini(options: EnhancedSearchOptions): Promise<string> {
  if (!isFeatureEnabled('USE_GEMINI')) {
    return options.query; // Return original query if Gemini is disabled
  }

  const prompt = `You are helping find the best places in ${options.cityContext?.name || 'New York City'}.

User request: "${options.query}"
${options.location ? `Specific area: ${options.location}` : ''}
${options.keywords?.length ? `Keywords: ${options.keywords.join(', ')}` : ''}
${options.type ? `Type of place: ${options.type}` : ''}
${options.preferences?.venuePreference ? `Venue preference: ${options.preferences.venuePreference}` : ''}
${options.preferences?.specificRequirements?.length ? `Requirements: ${options.preferences.specificRequirements.join(', ')}` : ''}
${options.preferences?.cuisine ? `Cuisine: ${options.preferences.cuisine}` : ''}

IMPORTANT: If the user mentions a specific food or dish (like "fish and chips", "pizza", "sushi", "tacos"), make sure to include that EXACT food in the search query. Don't generalize it to just "restaurant".

LANDMARK RECOGNITION: If the location is a famous landmark (e.g., "Big Ben", "Tower of London", "Buckingham Palace"), return the EXACT landmark name as the search query. Don't add "best" or "near" - just the landmark name itself.

Create an optimal Google Places search query that will find the most relevant and highly-rated places.
Focus on being specific about:
1. The type of place (restaurant, cafe, etc.)
2. The specific neighborhood or area
3. Any cuisine or style preferences (IMPORTANT: use the venue preference if provided)
4. Quality indicators (best, top-rated, popular) - EXCEPT for landmarks
5. Any specific requirements (e.g., outdoor seating, wifi, etc.)
6. For landmarks/tourist attractions, use the exact name without modifiers

Return ONLY the enhanced search query, nothing else.`;

  try {
    const response = await geminiGenerate({
      prompt,
      temperature: 0.3,
      maxTokens: 50
    });
    
    const enhancedQuery = response.trim();
    console.log('🤖 [Gemini] Enhanced query:', enhancedQuery);
    return enhancedQuery;
  } catch (error) {
    console.error('Failed to enhance query with Gemini:', error);
    return options.query; // Fallback to original query
  }
}

/**
 * Fetches detailed place information including ratings
 */
async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = getApiKey('GOOGLE_PLACES_API_KEY');
  
  if (!apiKey) {
    console.error('❌ [getPlaceDetails] No API key available');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', placeId);
    url.searchParams.append('fields', 'place_id,name,formatted_address,geometry,types,rating,price_level,opening_hours,photos,website,international_phone_number,user_ratings_total');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('❌ [getPlaceDetails] HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      console.log('✅ [getPlaceDetails] Got details for place:', data.result.name, 'Rating:', data.result.rating);
      return data.result as PlaceDetails;
    }
    
    console.error('❌ [getPlaceDetails] API error:', data.status);
    return null;
  } catch (error) {
    console.error('❌ [getPlaceDetails] Failed to fetch place details:', error);
    return null;
  }
}

/**
 * Get location coordinates for a specific area or neighborhood
 */
function getLocationCoordinates(location: string, cityContext?: { slug: string }): { lat: number; lng: number; radius: number } | null {
  if (!cityContext?.slug) return null;

  try {
    // Initialize services
    const cityConfigService = new CityConfigService();
    const locationResolver = new LocationResolver();
    
    // Get city config with detailed areas
    const cityConfig = cityConfigService.getCityConfigWithDetails(cityContext.slug);
    
    // Try to find the specific area
    const areas = locationResolver.extractAreaReferences(location, cityConfig);
    
    if (areas.length > 0) {
      // Use the first matched area's coordinates
      const area = areas[0];
      console.log(`📍 [enhancedPlaceSearch] Found specific area coordinates for "${location}":`, area.coordinates);
      return {
        lat: area.coordinates.lat,
        lng: area.coordinates.lng,
        radius: 5000 // 5km radius for neighborhoods
      };
    }
    
    // Fall back to city center if no specific area found
    console.log(`📍 [enhancedPlaceSearch] Using city center for "${cityContext.slug}"`);
    return {
      lat: cityConfig.defaultLocation.lat,
      lng: cityConfig.defaultLocation.lng,
      radius: 25000 // 25km radius for city-wide search
    };
  } catch (error) {
    console.error('Error getting location coordinates:', error);
    return null;
  }
}

/**
 * Generate meaningful reasons for venue alternatives
 */
function generateAlternativeReason(alternative: PlaceDetails, primary: PlaceDetails, index: number): string {
  const altRating = alternative.rating || 0;
  const primaryRating = primary.rating || 0;
  const altTypes = alternative.types || [];
  const primaryTypes = primary.types || [];
  
  // Higher rated alternative
  if (altRating > primaryRating) {
    const diff = (altRating - primaryRating).toFixed(1);
    return `Higher rated (+${diff} stars)`;
  }
  
  // Different cuisine/style
  const uniqueTypes = altTypes.filter(type => !primaryTypes.includes(type));
  if (uniqueTypes.length > 0) {
    const typeDescriptions: Record<string, string> = {
      'bakery': 'Great for pastries',
      'pizza_restaurant': 'Pizza specialist',
      'italian_restaurant': 'Italian cuisine',
      'french_restaurant': 'French cuisine',
      'japanese_restaurant': 'Japanese cuisine',
      'chinese_restaurant': 'Chinese cuisine',
      'mexican_restaurant': 'Mexican cuisine',
      'thai_restaurant': 'Thai cuisine',
      'seafood_restaurant': 'Seafood specialist',
      'steakhouse': 'Steak specialist',
      'vegetarian_restaurant': 'Vegetarian options',
      'rooftop_bar': 'Rooftop views',
      'sports_bar': 'Sports atmosphere',
      'cocktail_bar': 'Craft cocktails',
      'wine_bar': 'Wine selection',
      'coffee_shop': 'Coffee specialist',
      'fast_food_restaurant': 'Quick service'
    };
    
    for (const type of uniqueTypes) {
      if (typeDescriptions[type]) {
        return typeDescriptions[type];
      }
    }
  }
  
  // Price level differences
  if (alternative.price_level && primary.price_level) {
    if (alternative.price_level < primary.price_level) {
      return 'More budget-friendly';
    } else if (alternative.price_level > primary.price_level) {
      return 'More upscale option';
    }
  }
  
  // Fallback reasons based on position
  const fallbackReasons = [
    'Popular alternative',
    'Highly recommended',
    'Worth considering'
  ];
  
  return fallbackReasons[index] || 'Alternative option';
}

/**
 * Enhanced place search that combines Gemini intelligence with Google Places API
 */
export async function enhancedPlaceSearch(options: EnhancedSearchOptions): Promise<VenueSearchResult> {
  console.log('🔍 [enhancedPlaceSearch] Starting enhanced search with options:', options);
  
  const apiKey = getApiKey('GOOGLE_PLACES_API_KEY');
  
  if (!apiKey) {
    throw new GooglePlacesError('Google Places API key not found');
  }

  try {
    // Step 0: Use area intelligence for London to find better areas
    let searchLocation = options.location;
    if (options.cityContext?.slug === 'london' && options.type && options.preferences) {
      const areaIntelligence = new AreaIntelligenceService();
      
      // Determine time of day from context
      const timeOfDay = options.preferences.timeOfDay || 'afternoon';
      
      // Find suitable areas based on activity type and preferences
      const suitableAreas = areaIntelligence.findSuitableAreas(
        options.type,
        options.preferences.requirements || [],
        options.location || 'Central London',
        timeOfDay
      );
      
      if (suitableAreas.length > 0) {
        // Use the best area for search
        const bestArea = suitableAreas[0];
        searchLocation = bestArea.area.name;
        console.log(`🏙️ [Area Intelligence] Recommending ${bestArea.area.name} for ${options.type} (score: ${bestArea.score})`);
        console.log(`   Reasons: ${bestArea.reasons.join(', ')}`);
      }
    }
    
    // Step 1: Enhance the query with Gemini (include city name for better results)
    const queryWithCity = options.cityContext 
      ? `${options.query} in ${searchLocation || options.cityContext.name}`
      : options.query;
    const enhancedQuery = await enhanceQueryWithGemini({ ...options, query: queryWithCity, location: searchLocation });
    
    // Step 2: Search with enhanced query
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.append('query', enhancedQuery);
    url.searchParams.append('key', apiKey);
    
    // Add location bias based on specific location or city
    if (options.location && options.cityContext) {
      const coords = getLocationCoordinates(options.location, options.cityContext);
      if (coords) {
        url.searchParams.append('location', `${coords.lat},${coords.lng}`);
        url.searchParams.append('radius', coords.radius.toString());
        console.log(`🎯 [enhancedPlaceSearch] Using location bias: ${coords.lat},${coords.lng} with radius ${coords.radius}m`);
      }
    } else if (options.cityContext?.slug) {
      // Fallback to city defaults if no specific location
      const defaults: Record<string, { lat: number; lng: number }> = {
        'nyc': { lat: 40.7128, lng: -74.0060 },
        'london': { lat: 51.5074, lng: -0.1278 },
        'boston': { lat: 42.3601, lng: -71.0589 },
        'austin': { lat: 30.2672, lng: -97.7431 }
      };
      
      const cityDefault = defaults[options.cityContext.slug];
      if (cityDefault) {
        url.searchParams.append('location', `${cityDefault.lat},${cityDefault.lng}`);
        url.searchParams.append('radius', '25000');
        console.log(`🏙️ [enhancedPlaceSearch] Using city default for ${options.cityContext.slug}`);
      }
    }
    
    console.log('🌐 [enhancedPlaceSearch] Searching with query:', enhancedQuery);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new GooglePlacesError(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results?.length) {
      console.log('📍 [enhancedPlaceSearch] No results found');
      return { primary: null as any, alternatives: [] };
    }
    
    // Step 3: Get detailed info for top results (including ratings)
    const topResults = data.results.slice(0, 4); // Get top 4 results
    const detailedResults = await Promise.all(
      topResults.map(async (place: PlaceDetails) => {
        // If the place already has a rating, use it
        if (place.rating) {
          return place;
        }
        
        // Otherwise, fetch detailed info
        const details = await getPlaceDetails(place.place_id);
        return details || place;
      })
    );
    
    // Filter out any null results
    let validResults = detailedResults.filter(place => place !== null);
    
    // Step 3.5: Filter results to only include venues in the requested city
    if (options.cityContext) {
      const cityName = options.cityContext.name.toLowerCase();
      const cityAliases: Record<string, string[]> = {
        'new york city': ['new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'],
        'boston': ['boston', 'ma', 'massachusetts', 'cambridge', 'somerville', 'brookline'],
        'london': ['london', 'uk', 'united kingdom', 'england'],
        'austin': ['austin', 'tx', 'texas']
      };
      
      const cityTerms = cityAliases[cityName] || [cityName];
      
      validResults = validResults.filter(place => {
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
          console.log(`🚫 [enhancedPlaceSearch] Filtering out ${place.name} - address "${place.formatted_address}" not in ${options.cityContext!.name}`);
        }
        
        return isInCity;
      });
      
      console.log(`🏙️ [enhancedPlaceSearch] After city filtering: ${validResults.length} venues remain for ${options.cityContext.name}`);
    }
    
    if (validResults.length === 0) {
      console.log('📍 [enhancedPlaceSearch] No results found after city filtering');
      return { primary: null as any, alternatives: [] };
    }
    
    // Step 4: Filter by operating hours if scheduled time is provided
    if (options.scheduledDateTime && options.cityContext?.timezone) {
      console.log(`🕒 [enhancedPlaceSearch] Filtering venues by operating hours for ${options.scheduledDateTime.toISOString()}`);
      
      const { openVenues, closedVenues } = filterOpenVenues(
        validResults, 
        options.scheduledDateTime, 
        options.cityContext.timezone
      );
      
      // Use open venues if available, otherwise fall back to all venues with a warning
      if (openVenues.length > 0) {
        validResults = openVenues;
        console.log(`✅ [enhancedPlaceSearch] ${openVenues.length} venues are open, ${closedVenues.length} are closed`);
      } else {
        console.log(`⚠️ [enhancedPlaceSearch] No venues are confirmed open, using all ${validResults.length} venues`);
        // Keep all results but log the issue
      }
    }
    
    // Implement variety: Mix high ratings with randomization
    // 1. Filter to only include places with good ratings (>= 4.0)
    const goodRatingThreshold = 4.0;
    const goodPlaces = validResults.filter(place => (place.rating || 0) >= goodRatingThreshold);
    
    // 2. If we have good places, randomly select from them
    const placesToSelectFrom = goodPlaces.length > 0 ? goodPlaces : validResults;
    
    // 3. Use weighted random selection - higher rated places have better chance
    const weightedSelection = (places: PlaceDetails[]): PlaceDetails => {
      // Calculate weights based on rating (rating^2 for exponential weighting)
      const weights = places.map(place => Math.pow(place.rating || 3.5, 2));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      
      // Random selection based on weights
      let random = Math.random() * totalWeight;
      for (let i = 0; i < places.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return places[i];
        }
      }
      return places[0]; // Fallback
    };
    
    // 4. Select primary venue with variety
    const selectedIndex = placesToSelectFrom.indexOf(weightedSelection(placesToSelectFrom));
    const primary = placesToSelectFrom[selectedIndex];
    
    // 5. Remove selected from alternatives and sort remaining by rating
    const alternatives = placesToSelectFrom
      .filter((_, index) => index !== selectedIndex)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3); // Keep top 3 alternatives
    
    console.log('✅ [enhancedPlaceSearch] Found', validResults.length, 'places with ratings');
    console.log('🎲 [enhancedPlaceSearch] Selected venue (with variety):', {
      name: primary.name,
      rating: primary.rating,
      address: primary.formatted_address
    });
    console.log('🔄 [enhancedPlaceSearch] Alternatives:', alternatives.map(a => ({ name: a.name, rating: a.rating })));
    
    // Enhance alternatives with reasons for suggestion
    const enhancedAlternatives = alternatives.map((alt, index) => {
      const reason = generateAlternativeReason(alt, primary, index);
      return {
        ...alt,
        reason
      };
    });
    
    return {
      primary,
      alternatives: enhancedAlternatives
    };
    
  } catch (error: any) {
    console.error('❌ [enhancedPlaceSearch] Search failed:', error);
    if (error instanceof GooglePlacesError) {
      throw error;
    }
    throw new GooglePlacesError('Enhanced place search failed', error);
  }
}