import type { PlaceDetails, VenueSearchResult, SearchParameters } from "@shared/schema";
import { normalizeLocationName, verifyPlaceMatch, suggestSimilarLocations } from "./locationNormalizer";
import { nycAreas, findAreasByCharacteristics } from "../data/new-york-areas";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE = "https://places.googleapis.com";
const MAX_ALTERNATIVES = 3; // Maximum number of alternative venues to return

interface SearchOptions {
  type?: string;
  openNow?: boolean;
  minRating?: number;
  searchTerm?: string;
  keywords?: string[];
  requireOpenNow?: boolean;
  checkReviewsForKeywords?: boolean; // Whether to perform the more intensive review check
  searchPreference?: string; // Specific venue preference (e.g., "hipster coffee shop", "authentic Jewish deli")
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return Math.round(distance * 1000) / 1000; // Round to 3 decimal places
}

// Helper function to convert new Places API format to legacy format
function convertNewPlaceToLegacy(newPlaceData: any): any {
  return {
    name: newPlaceData.displayName?.text || '',
    formatted_address: newPlaceData.formattedAddress || '',
    geometry: {
      location: {
        lat: newPlaceData.location?.latitude || 0,
        lng: newPlaceData.location?.longitude || 0
      }
    },
    opening_hours: newPlaceData.regularOpeningHours ? {
      open_now: true, // Simplified - would need more logic for actual status
      periods: newPlaceData.regularOpeningHours.periods || []
    } : undefined,
    business_status: newPlaceData.businessStatus || 'OPERATIONAL',
    rating: newPlaceData.rating || 0,
    price_level: newPlaceData.priceLevel || 0,
    types: newPlaceData.types || [],
    reviews: newPlaceData.reviews || []
  };
}

// Helper function to convert new search results to legacy format
function convertNewSearchResultsToLegacy(searchResponse: any): any {
  if (!searchResponse.places || !Array.isArray(searchResponse.places)) {
    return { results: [], status: "ZERO_RESULTS" };
  }

  const results = searchResponse.places.map((place: any) => ({
    place_id: place.id || '',
    name: place.displayName?.text || '',
    formatted_address: place.formattedAddress || '',
    geometry: {
      location: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0
      }
    },
    opening_hours: place.regularOpeningHours ? {
      open_now: true,
      periods: place.regularOpeningHours.periods || []
    } : undefined,
    business_status: place.businessStatus || 'OPERATIONAL',
    rating: place.rating || 0,
    price_level: place.priceLevel || 0,
    types: place.types || [],
    photos: place.photos || []
  }));

  return {
    results,
    status: results.length > 0 ? "OK" : "ZERO_RESULTS"
  };
}

// Helper function to fetch place details
async function fetchPlaceDetails(placeId: string, includeReviews: boolean = false): Promise<any> {
  // Add reviews field if requested
  const fields = includeReviews
    ? "displayName,formattedAddress,location,regularOpeningHours,businessStatus,rating,priceLevel,types,reviews"
    : "displayName,formattedAddress,location,regularOpeningHours,businessStatus,rating,priceLevel,types";

  const detailsUrl = `${PLACES_API_BASE}/v1/places/${placeId}?key=${GOOGLE_PLACES_API_KEY}`;

  const detailsRes = await fetch(detailsUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': fields
    }
  });

  const detailsData = await detailsRes.json();

  if (!detailsData.displayName) {
    throw new Error(`Error fetching details for place ${placeId}.`);
  }

  // Convert new API format to legacy format for compatibility
  return convertNewPlaceToLegacy(detailsData);
}

/**
 * Check if any of the place's reviews mention specific keywords
 * Useful for food-specific searches like "focaccia sandwich"
 * 
 * @param placeId Google Places ID
 * @param keywords List of keywords to look for in reviews
 * @returns Boolean indicating if any keywords were found in reviews
 */
async function checkPlaceReviewsForKeywords(placeId: string, keywords: string[]): Promise<boolean> {
  try {
    // Get detailed place information including reviews
    const details = await fetchPlaceDetails(placeId, true);
    
    if (!details?.reviews || !Array.isArray(details.reviews)) {
      return false;
    }
    
    // Check if any keywords appear in review text
    return details.reviews.some((review: any) => {
      if (!review.text) return false;
      const reviewText = review.text.toLowerCase();
      return keywords.some(keyword => reviewText.includes(keyword.toLowerCase()));
    });
  } catch (error) {
    console.error("Error checking reviews:", error);
    return false;
  }
}

export async function searchPlace(
  query: string, 
  options: SearchOptions = {}
): Promise<VenueSearchResult> {
  try {
    console.log(`Search request for query: "${query}" with options:`, options);
    
    // Add better search term extraction from complex activity types
    let searchType = options.type;
    let searchKeyword = '';
    let keywordsList: string[] = [];
    
    // Use search preference as the highest priority if available
    if (options.searchPreference) {
      console.log(`VENUE PREFERENCE: Using specific venue preference as primary search term: "${options.searchPreference}"`);
      searchKeyword = options.searchPreference;
    } 
    // Otherwise use regular searchTerm if available
    else if (options.searchTerm) {
      console.log(`VENUE SEARCH: Using searchTerm: "${options.searchTerm}"`);
      searchKeyword = options.searchTerm;
    } else {
      // Ensure we have at least a basic search term for all searches
      console.log(`VENUE SEARCH: Using query as fallback search term: "${query}"`);
      searchKeyword = query;
    }
    
    if (options.keywords && Array.isArray(options.keywords)) {
      keywordsList = options.keywords;
    }
    
    // If we have a searchPreference, add it to the keywords list as well for maximum effect
    if (options.searchPreference && (!keywordsList.includes(options.searchPreference))) {
      if (!keywordsList) keywordsList = [];
      keywordsList.push(options.searchPreference);
    }

    // Extract better search terms from complex activity types
    if (typeof options.type === 'string') {
      // Map complex activity types to better search terms
      if (options.type.includes('coffee shop') || options.type.includes('cafe')) {
        searchType = 'cafe';
        searchKeyword = 'coffee shop';
      } else if (options.type.includes('dinner') || options.type.includes('restaurant')) {
        searchType = 'restaurant';
        searchKeyword = options.type;
      } else if (options.type.includes('library')) {
        searchType = 'library';
      } else if (options.type.includes('bar') || options.type.includes('pub')) {
        searchType = 'bar';
      }
    }
    
    // First check if this matches any of our known areas
    const matchingArea = nycAreas.find(area => 
      area.name.toLowerCase() === query.toLowerCase() ||
      area.neighbors.some(n => n.toLowerCase() === query.toLowerCase())
    );

    // Normalize the location name
    const normalizedLocation = normalizeLocationName(query);
    console.log(`Normalized location: ${query} -> ${normalizedLocation}`);

    // Build search query with appropriate context
    let searchQuery = normalizedLocation;
    if (!normalizedLocation.toLowerCase().includes('new york')) {
      // Add more specific context for stations and streets
      if (normalizedLocation.toLowerCase().includes('station')) {
        searchQuery = `${normalizedLocation}, Subway Station, New York`;
      } else if (matchingArea) {
        searchQuery = `${normalizedLocation}, ${matchingArea.borough || 'New York'}, NY`;
      } else {
        searchQuery = `${normalizedLocation}, New York`;
      }
    }

    // When searching for an activity type near a landmark, use a two-step approach
    if (options.type && options.type !== "landmark") {
      console.log(`Searching for ${options.type} near ${searchQuery} (using searchType: ${searchType}, searchKeyword: ${searchKeyword})`);

      // First find the landmark using new Places API
      const landmarkRequestBody = {
        textQuery: searchQuery,
        locationBias: {
          rectangle: {
            low: { latitude: 40.4774, longitude: -74.2591 },
            high: { latitude: 40.9176, longitude: -73.7004 }
          }
        },
        languageCode: "en",
        maxResultCount: 1
      };

      const landmarkUrl = `${PLACES_API_BASE}/v1/places:searchText?key=${GOOGLE_PLACES_API_KEY}`;
      const landmarkRes = await fetch(landmarkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.businessStatus,places.regularOpeningHours,places.id'
        },
        body: JSON.stringify(landmarkRequestBody)
      });
      const landmarkData = await landmarkRes.json();
      const convertedLandmarkData = convertNewSearchResultsToLegacy(landmarkData);

      if (convertedLandmarkData.status !== "OK" || !convertedLandmarkData.results?.length) {
        const suggestions = suggestSimilarLocations(query);
        throw new Error(
          `Could not find "${query}"${suggestions.length ? `. Did you mean: ${suggestions.join(", ")}?` : ""}. ` +
          "Try being more specific or using the full name."
        );
      }

      // Get the landmark's location
      const landmark = convertedLandmarkData.results[0];
      const { lat, lng } = landmark.geometry.location;

      // Now search for the activity type near this landmark using new Places API
      // Use a combined text query that includes both the activity type and location
      const combinedQuery = searchKeyword
        ? `${searchKeyword} near ${searchQuery}`
        : `${options.type || query} near ${searchQuery}`;

      const nearbyRequestBody = {
        textQuery: combinedQuery,
        languageCode: "en",
        maxResultCount: 20, // Get more results to filter
      };

      const nearbyUrl = `${PLACES_API_BASE}/v1/places:searchText?key=${GOOGLE_PLACES_API_KEY}`;
      const nearbyRes = await fetch(nearbyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.businessStatus,places.regularOpeningHours,places.id'
        },
        body: JSON.stringify(nearbyRequestBody)
      });
      const nearbyData = await nearbyRes.json();
      const convertedNearbyData = convertNewSearchResultsToLegacy(nearbyData);

      if (convertedNearbyData.status !== "OK" || !convertedNearbyData.results?.length) {
        console.log(`No results found for ${options.type} near ${normalizedLocation}. Trying a more generic search...`);
        
        // Try a more generic search without the type restriction
        const fallbackQuery = searchKeyword
          ? `${searchKeyword} near ${searchQuery}`
          : `${query} near ${searchQuery}`;

        const fallbackRequestBody = {
          textQuery: fallbackQuery,
          languageCode: "en",
          maxResultCount: 20,
        };

        const fallbackUrl = `${PLACES_API_BASE}/v1/places:searchText?key=${GOOGLE_PLACES_API_KEY}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.businessStatus,places.regularOpeningHours,places.id'
          },
          body: JSON.stringify(fallbackRequestBody)
        });
        const fallbackData = await fallbackRes.json();
        const convertedFallbackData = convertNewSearchResultsToLegacy(fallbackData);

        if (convertedFallbackData.status === "OK" && convertedFallbackData.results?.length > 0) {
          console.log(`Fallback search successful, found ${convertedFallbackData.results.length} results`);
          Object.assign(convertedNearbyData, convertedFallbackData);
        } else {
          // If we still couldn't find anything, throw an error
          throw new Error(`No ${options.type || 'venues'} found near ${normalizedLocation}. Try a different location or activity type.`);
        }
      }

      // Filter results by rating if specified
      let results = [...convertedNearbyData.results];
      if (options.minRating !== undefined) {
        const minRating = options.minRating; // Store in a constant to avoid the "possibly undefined" error
        const qualifiedResults = results.filter(
          (r: any) => r.rating >= minRating
        );
        if (qualifiedResults.length > 0) {
          results = qualifiedResults;
        }
      }
      
      // Check reviews for specific food items or keywords if requested
      if (options.checkReviewsForKeywords && keywordsList.length > 0) {
        try {
          console.log(`Checking reviews for specific keywords: ${keywordsList.join(', ')}`);
          
          // Look through the top 10 results for keyword matches in reviews
          const reviewPromises = results.slice(0, 10).map(async (result) => {
            const hasKeywords = await checkPlaceReviewsForKeywords(result.place_id, keywordsList);
            return { result, hasKeywords };
          });
          
          const reviewResults = await Promise.all(reviewPromises);
          const matchingResults = reviewResults.filter(item => item.hasKeywords).map(item => item.result);
          
          // If we found venues with matching reviews, prioritize these results
          if (matchingResults.length > 0) {
            console.log(`Found ${matchingResults.length} venues with reviews mentioning keywords`);
            
            // Preserve other results but put the matching ones first
            const nonMatchingResults = results.filter(result => 
              !matchingResults.some(match => match.place_id === result.place_id)
            );
            
            results = [...matchingResults, ...nonMatchingResults];
          }
        } catch (error) {
          console.error("Error during review checking:", error);
          // Continue with regular search if review checking fails
        }
      }
      
      // Enhanced type filtering to exclude inappropriate venues
      if (options.type) {
        if (options.type === 'cafe' || options.type === 'coffee') {
          // For cafes/coffee, exclude inappropriate places and prioritize dedicated cafes
          const filteredResults = results.filter(place => 
            // Exclude inappropriate venues
            !place.types.includes('gas_station') && 
            !place.types.includes('lodging') &&
            !place.types.includes('hospital') &&
            !place.types.includes('car_dealer') &&
            !place.types.includes('car_rental') &&
            // Prioritize venues that are actually cafes or restaurants
            (place.types.includes('cafe') || 
             place.types.includes('restaurant') || 
             place.types.includes('bakery') ||
             place.types.includes('food'))
          );
          
          // Only use filtered results if we didn't filter everything out
          if (filteredResults.length > 0) {
            results = filteredResults;
          }
        } else if (options.type === 'restaurant' || options.type === 'lunch' || options.type === 'dinner' || options.type === 'breakfast') {
          // For food activities, exclude inappropriate venues and prioritize restaurants
          const filteredResults = results.filter(place => 
            // Exclude inappropriate venues
            !place.types.includes('gas_station') && 
            !place.types.includes('lodging') &&
            !place.types.includes('hospital') &&
            !place.types.includes('car_dealer') &&
            !place.types.includes('car_rental') &&
            // At least one of these types should be present
            (place.types.includes('restaurant') || 
             place.types.includes('meal_takeaway') || 
             place.types.includes('meal_delivery') ||
             place.types.includes('food'))
          );
          
          if (filteredResults.length > 0) {
            results = filteredResults;
          }
          
          // Further sort by prioritizing dedicated restaurants
          results = results.sort((a, b) => {
            // Calculate relevance score based on venue types
            const scoreTypes = (types: string[]) => {
              let score = 0;
              if (types.includes('restaurant')) score += 5;
              if (types.includes('food')) score += 3;
              if (types.includes('meal_takeaway')) score += 2;
              if (types.includes('cafe')) score += 1;
              return score;
            };
            
            return scoreTypes(b.types) - scoreTypes(a.types);
          });
        } else if (options.type === 'bar' || options.type === 'drinks' || options.type === 'night_club' || options.type === 'nightlife') {
          // For nightlife venues, prioritize bars and clubs
          const filteredResults = results.filter(place => 
            !place.types.includes('gas_station') && 
            !place.types.includes('hospital') &&
            (place.types.includes('bar') || 
             place.types.includes('night_club') ||
             place.types.includes('restaurant'))
          );
          
          if (filteredResults.length > 0) {
            results = filteredResults;
          }
        }
        
        // If we still don't have good results, try a more generic search
        if (results.length === 0) {
          // First try with our enhanced keywords if available
          if (searchKeyword || keywordsList.length > 0) {
            let finalKeyword = searchKeyword;
            
            // If we have additional keywords, use them too
            if (keywordsList.length > 0) {
              const combinedKeywords = keywordsList.join(' ');
              finalKeyword = searchKeyword ? `${searchKeyword} ${combinedKeywords}` : combinedKeywords;
            }
            
            console.log(`All results filtered out, trying generic search with keyword: ${finalKeyword}`);
            const keywordParams = new URLSearchParams({
              location: `${lat},${lng}`,
              radius: "2000",
              keyword: finalKeyword,
              key: GOOGLE_PLACES_API_KEY || "",
              language: "en"
            });
            
            const keywordUrl = `${PLACES_API_BASE}/nearbysearch/json?${keywordParams.toString()}`;
            const keywordRes = await fetch(keywordUrl);
            const keywordData = await keywordRes.json();
            
            if (keywordData.status === "OK" && keywordData.results?.length > 0) {
              results = keywordData.results;
              
              // Apply some basic filtering to these results too
              results = results.filter(place => 
                !place.types.includes('gas_station') && 
                !place.types.includes('lawyer') &&
                !place.types.includes('finance')
              );
            }
          }
          
          // If still no results or no keyword was available, try with original type
          if (results.length === 0) {
            console.log(`No ${options.type} found with strict filtering, using more generic search`);
            const genericParams = new URLSearchParams({
              location: `${lat},${lng}`,
              radius: "2000",
              keyword: options.type,
              key: GOOGLE_PLACES_API_KEY || "",
              language: "en"
            });
            
            const genericUrl = `${PLACES_API_BASE}/nearbysearch/json?${genericParams.toString()}`;
            const genericRes = await fetch(genericUrl);
            const genericData = await genericRes.json();
            
            if (genericData.status === "OK" && genericData.results?.length > 0) {
              results = genericData.results;
            }
          }
        }
      }
      
      // Limit to maximum results (1 primary + MAX_ALTERNATIVES)
      results = results.slice(0, 1 + MAX_ALTERNATIVES);
      
      if (results.length === 0) {
        throw new Error(`No ${options.type} found near ${normalizedLocation}. Try a different location or activity type.`);
      }
      
      // Get primary result
      const primaryResult = results[0];
      const primaryLat = primaryResult.geometry.location.lat;
      const primaryLng = primaryResult.geometry.location.lng;
      
      // Get details for all venues
      const primaryDetails = await fetchPlaceDetails(primaryResult.place_id);
      
      // Mark as primary and add area info
      const primary: PlaceDetails = {
        ...primaryDetails,
        place_id: primaryResult.place_id,
        is_primary: true,
        distance_from_primary: 0,
        area_info: matchingArea
      };
      
      // Get alternative venues
      const alternativePromises = results.slice(1).map(async (result) => {
        const details = await fetchPlaceDetails(result.place_id);
        
        // Calculate distance from primary result
        const distance = calculateDistance(
          primaryLat, 
          primaryLng,
          result.geometry.location.lat, 
          result.geometry.location.lng
        );
        
        return {
          ...details,
          place_id: result.place_id,
          is_primary: false,
          distance_from_primary: distance,
          area_info: matchingArea
        };
      });
      
      const alternatives = await Promise.all(alternativePromises);
      
      console.log(`Found ${results.length} ${options.type} venues near ${normalizedLocation}:`, {
        primary: primary.name,
        alternatives: alternatives.map(a => a.name)
      });
      
      return {
        primary,
        alternatives
      };

    } else {
      // Regular landmark search using new Places API
      const searchRequestBody = {
        textQuery: searchQuery,
        locationBias: {
          rectangle: {
            low: { latitude: 40.4774, longitude: -74.2591 },
            high: { latitude: 40.9176, longitude: -73.7004 }
          }
        },
        languageCode: "en",
        maxResultCount: 1 + MAX_ALTERNATIVES,

      };

      const searchUrl = `${PLACES_API_BASE}/v1/places:searchText?key=${GOOGLE_PLACES_API_KEY}`;
      const searchRes = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.businessStatus,places.regularOpeningHours,places.id'
        },
        body: JSON.stringify(searchRequestBody)
      });
      const searchData = await searchRes.json();
      const convertedSearchData = convertNewSearchResultsToLegacy(searchData);

      if (convertedSearchData.status !== "OK" || !convertedSearchData.results?.length) {
        const suggestions = suggestSimilarLocations(query);
        throw new Error(
          `Could not find "${query}"${suggestions.length ? `. Did you mean: ${suggestions.join(", ")}?` : ""}. ` +
          "Try being more specific or using the full name."
        );
      }

      // Get up to MAX_ALTERNATIVES + 1 results, but handle cases where there are few or no similar alternatives
      const results = convertedSearchData.results.slice(0, 1 + MAX_ALTERNATIVES);
      // There should always be at least one result if we reach here
      const primaryResult = results[0];
      
      // Verify the primary result matches what was requested
      if (!verifyPlaceMatch(query, primaryResult.name, primaryResult.types)) {
        console.warn(`Place match verification warning for "${query}". Got "${primaryResult.name}" instead.`);
      }
      
      // Get primary landmark details
      const primaryDetails = await fetchPlaceDetails(primaryResult.place_id);
      const primaryLat = primaryResult.geometry.location.lat;
      const primaryLng = primaryResult.geometry.location.lng;
      
      // Create primary result object
      const primary: PlaceDetails = {
        ...primaryDetails,
        place_id: primaryResult.place_id,
        is_primary: true,
        distance_from_primary: 0,
        area_info: matchingArea
      };
      
      // Get alternative landmarks
      const alternativePromises = results.slice(1).map(async (result: any) => {
        const details = await fetchPlaceDetails(result.place_id);
        
        // Calculate distance from primary result
        const distance = calculateDistance(
          primaryLat, 
          primaryLng,
          result.geometry.location.lat, 
          result.geometry.location.lng
        );
        
        return {
          ...details,
          place_id: result.place_id,
          is_primary: false,
          distance_from_primary: distance,
          area_info: matchingArea
        };
      });
      
      const alternatives = await Promise.all(alternativePromises);
      
      console.log(`Found landmark "${primary.name}" with ${alternatives.length} alternatives`);
      
      return {
        primary,
        alternatives
      };
    }
  } catch (error) {
    console.error(`Error searching place "${query}":`, error);
    throw error;
  }
}