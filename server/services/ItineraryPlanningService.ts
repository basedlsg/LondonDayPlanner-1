import { type IStorage } from '../storage'; // Corrected: Use IStorage interface
import { type StructuredRequest } from '@shared/types'; // Corrected: Use StructuredRequest from shared types
import { type Place, type Itinerary, type PlaceDetails, type User, type InsertPlace, type InsertItinerary } from '@shared/schema'; // Corrected: User from @shared/schema, Itinerary is the details type, Added InsertPlace and InsertItinerary

// Assuming these are still needed from their original paths for now
import { searchPlace } from '../lib/googlePlaces'; 
import { calculateTravelTime } from '../lib/itinerary'; 
import { parseItineraryRequest } from '../lib/nlp-fixed'; 
import { parseTimeString } from '../lib/timeUtils'; // Added import for parseTimeString
import { isVenueOutdoor, getWeatherAwareVenue } from '../lib/weatherService'; // Added weather service imports

// Import custom errors
import {
  AppError, NLPServiceError, ValidationError, GooglePlacesError, DatabaseError, NotFoundError, InternalServerError
} from '../lib/errors';

import { MemoryCache, generateCacheKey } from '../lib/cache'; // Added cache imports

// Interface for the main planning input
export interface PlanRequestOptions {
  query: string;
  date?: string;
  startTime?: string;
  userId?: User['id']; // Corrected: Use User type from @shared/schema for ID
  nlpResult?: StructuredRequest; // Corrected: Use StructuredRequest
  enableGapFilling?: boolean; // Added option for gap filling
}

// Define a type for the items we'll store in itineraryPlaces temporarily
interface ItineraryPlaceItem {
  place: Place; // This will be the full Place object from the DB
  time: Date;   // The JS Date object for this item's scheduled time
  isFixed: boolean;
  travelTimeToNext?: number; // Added optional property for travel time
}

export class ItineraryPlanningService {
  private storage: IStorage; // Corrected: Use IStorage interface type
  private cache: MemoryCache; // Added cache instance member

  constructor(storage: IStorage) { // Corrected: Use IStorage interface type
    this.storage = storage;
    this.cache = new MemoryCache(); // Instantiate the cache
  }

  public async createPlan(options: PlanRequestOptions): Promise<Itinerary> {
    const { query, date, startTime, userId, enableGapFilling = false } = options;
    console.log('🚀 Creating plan for query:', query);

    let parsed: StructuredRequest;
    try {
      const nlpCacheKey = generateCacheKey('nlp', { query });
      parsed = options.nlpResult || await this.cache.getOrSet(
        nlpCacheKey,
        () => parseItineraryRequest(query),
        30 * 60 * 1000 
      );
    } catch (error:any) {
      if (error instanceof AppError) throw error;
      throw new NLPServiceError('Failed to parse itinerary request', error);
    }
    console.log('📝 Parsed request from cache/fetch:', parsed);

    const searchLocation = this._extractSearchLocation(parsed, query);
    console.log('📍 Determined initial search/start location:', searchLocation);

    // --- ADDED FALLBACK --- 
    if ((!parsed.fixedTimes || parsed.fixedTimes.length === 0) && 
        (!parsed.activities || parsed.activities.length === 0)) {
      
      console.log('🔧 NLP returned empty fixedTimes and activities, creating fallback activity based on original query.');
      // Ensure parsed.activities is an array before pushing
      if (!parsed.activities) {
        parsed.activities = [];
      }
      parsed.activities.push({
        description: query, // Use original query as the description
        location: searchLocation, // Use the determined searchLocation
        time: startTime || '12:00 PM', // Use provided start time or default
        searchParameters: { 
            type: 'restaurant', // Default to restaurant as per user suggestion for this fallback
            searchTerm: query,
            keywords: [],
            minRating: 0, // No specific rating for fallback initially
            requireOpenNow: true // Sensible default
        },
        requirements: []
      });
      console.log('🔧 Fallback activity created:', parsed.activities);
    }
    // --- END FALLBACK ---

    const baseDate = date ? new Date(date) : new Date();
    let currentTime = startTime
      ? parseTimeString(startTime, baseDate) 
      : new Date(new Date(baseDate).setHours(9, 0, 0, 0));

    const scheduledPlaces = new Set<string>(); 
    const itineraryPlaces: ItineraryPlaceItem[] = []; 

    // Handle lunch request specifically - use the reliable searchLocation
    let lunchHandled = false;
    if (enableGapFilling && parsed.preferences?.type === 'lunch' && searchLocation) { // Check searchLocation
      console.log("Searching for lunch venue near:", searchLocation);
      try {
        const searchOptions: any = {
          type: 'restaurant',
          requireOpenNow: true,
          minRating: 4.0,
          searchTerm: 'lunch restaurant',
          keywords: ['restaurant', 'lunch', 'dining']
        };
        
        if (parsed.preferences?.requirements && parsed.preferences.requirements.length > 0) {
          searchOptions.keywords = [
            ...searchOptions.keywords,
            ...parsed.preferences.requirements
          ];
        }
        
        const venueResult = await searchPlace(searchLocation, searchOptions);
        
        if (venueResult && venueResult.primary) {
          let lunchPlaceDetails = venueResult.primary;

          if (process.env.WEATHER_API_KEY && lunchPlaceDetails.types) {
            try {
              const lunchDateTime = parseTimeString('14:00', baseDate); // Standard lunch time
              console.log("Checking weather conditions for lunch venue...");
              
              const isOutdoor = lunchPlaceDetails.types && isVenueOutdoor(lunchPlaceDetails.types);
              lunchPlaceDetails.isOutdoorVenue = isOutdoor;
              
              const { venue: recommendedVenue, weatherSuitable } = await getWeatherAwareVenue(
                lunchPlaceDetails,
                venueResult.alternatives || [],
                lunchPlaceDetails.geometry.location.lat,
                lunchPlaceDetails.geometry.location.lng,
                lunchDateTime
              );
              
              lunchPlaceDetails.weatherSuitable = weatherSuitable;
              if (venueResult.alternatives && venueResult.alternatives.length > 0) {
                venueResult.alternatives.forEach(alt => {
                  alt.isOutdoorVenue = alt.types ? isVenueOutdoor(alt.types) : false;
                  alt.weatherSuitable = weatherSuitable;
                });
              }
              
              if (!weatherSuitable && recommendedVenue.place_id !== lunchPlaceDetails.place_id) {
                console.log(`Weather not optimal for ${lunchPlaceDetails.name} - suggesting alternative: ${recommendedVenue.name}`);
                recommendedVenue.weatherAwareRecommendation = true;
                lunchPlaceDetails = recommendedVenue;
              }
            } catch (weatherError) {
              console.warn("Weather service error for lunch venue (proceeding with original):", weatherError);
            }
          }

          console.log("Found lunch venue:", {
            name: lunchPlaceDetails.name,
            address: lunchPlaceDetails.formatted_address,
            // rating: lunchPlaceDetails.rating, // rating might not be on PlaceDetails from schema initially
            alternativesCount: venueResult.alternatives?.length || 0
          });

          const lunchTimeDate = parseTimeString('14:00', baseDate);
          const placeToInsert: InsertPlace = {
            placeId: lunchPlaceDetails.place_id,
            name: lunchPlaceDetails.name,
            address: lunchPlaceDetails.formatted_address,
            location: lunchPlaceDetails.geometry.location,
            details: lunchPlaceDetails, // Storing the full details from Google Places
            alternatives: venueResult.alternatives || [],
            scheduledTime: lunchTimeDate.toISOString(),
          };
          const newPlace = await this.storage.createPlace(placeToInsert);

          const compositeKey = `${newPlace.placeId}:lunch`;
          if (!scheduledPlaces.has(compositeKey)) {
            scheduledPlaces.add(compositeKey);
            itineraryPlaces.push({
              place: newPlace,
              time: lunchTimeDate,
              isFixed: true // Lunch is considered a fixed point if scheduled this way
            });
            lunchHandled = true;
          }
        } else {
          console.error("Failed to find lunch venue near:", searchLocation);
        }
      } catch (error) {
        console.error("Error finding lunch venue:", error); // Don't let this stop the whole plan
      }
    }

    if (parsed.fixedTimes && parsed.fixedTimes.length > 0) {
      await this._processFixedAppointments(
        parsed.fixedTimes, baseDate, query, scheduledPlaces, itineraryPlaces
      );
    }
    
    if (itineraryPlaces.length === 0 && parsed.activities && parsed.activities.length > 0) {
      await this._processGeneralActivities(
        parsed.activities,
        baseDate,
        scheduledPlaces,
        itineraryPlaces,
        searchLocation // Pass the reliable searchLocation as fallback
      );
    }
  
    itineraryPlaces.sort((a, b) => a.time.getTime() - b.time.getTime());
  
    if (itineraryPlaces.length > 1) {
      await this._calculateTravelTimes(itineraryPlaces);
    }
  
    const title = this._generateItineraryTitle(parsed, query);
    const itineraryPlacesForDb = itineraryPlaces.map(item => ({
      placeDbId: item.place.id,
      googlePlaceId: item.place.placeId,
      name: item.place.name,
      address: item.place.address,
      scheduledTime: item.time.toISOString(),
      duration: item.isFixed ? 60 : 90,
      notes: (item.place.details as PlaceDetails)?.activityDescription || '',
      travelTimeToNext: item.travelTimeToNext || 0,
      location: item.place.location 
    }));
    const travelTimesForDb = itineraryPlaces.filter(item => item.travelTimeToNext !== undefined && item.travelTimeToNext > 0).map((item, index) => {
      if (index < itineraryPlaces.length -1) {
        return {
          fromPlaceId: item.place.placeId,
          toPlaceId: itineraryPlaces[index+1].place.placeId,
          durationMinutes: item.travelTimeToNext
        };
      }
      return null;
    }).filter(tt => tt !== null);
    
    const itineraryToInsert: InsertItinerary = {
      title: title,
      description: `Generated from: "${query}" (around ${searchLocation})`,
      planDate: baseDate.toISOString(), 
      query: query,
      places: itineraryPlacesForDb, 
      travelTimes: travelTimesForDb, 
    };
  
    try {
      const createdItinerary = await this.storage.createItinerary(itineraryToInsert, userId);
      console.log(`Successfully created itinerary "${title}" with ID: ${createdItinerary.id}`);
      return createdItinerary;
    } catch (error: any) {
      throw new DatabaseError('Failed to save itinerary to database', error);
    }
  }

  public async getItineraryById(id: number, userId?: User['id']): Promise<Itinerary | null> {
    let itinerary;
    try {
      itinerary = await this.storage.getItinerary(id);
    } catch (error: any) {
      throw new DatabaseError(`Failed to retrieve itinerary with ID ${id}`, error);
    }

    if (!itinerary) {
      throw new NotFoundError('Itinerary', id);
    }
    // Add authorization check if necessary here, e.g., using userId
    // For now, assuming if found, it can be returned.
    return itinerary;
  }

  // Added private helper method from user prompt
  private _detectActivityTypeFromQuery(query: string, activity: string): string {
    const combined = `${query} ${activity}`.toLowerCase();
    
    // Food-related
    if (combined.includes('restaurant') || combined.includes('dining') || 
        combined.includes('food') || combined.includes('eat') || 
        combined.includes('breakfast') || combined.includes('lunch') || 
        combined.includes('dinner') || combined.includes('brunch')) {
      return 'restaurant';
    }
    
    // Culture
    if (combined.includes('museum') || combined.includes('gallery') || 
        combined.includes('art') || combined.includes('exhibition')) {
      return 'museum';
    }
    
    // Entertainment
    if (combined.includes('theater') || combined.includes('theatre') || 
        combined.includes('show') || combined.includes('performance') || 
        combined.includes('concert') || combined.includes('movie')) {
      return 'movie_theater';
    }
    
    // Outdoor
    if (combined.includes('park') || combined.includes('garden') || 
        combined.includes('zoo') || combined.includes('outdoor') ||
        combined.includes('walk') || combined.includes('nature')) {
      return 'park';
    }
    
    // Shopping
    if (combined.includes('shop') || combined.includes('shopping') || 
        combined.includes('store') || combined.includes('market') || 
        combined.includes('boutique')) {
      return 'shopping_mall';
    }
    
    // Nightlife
    if (combined.includes('bar') || combined.includes('pub') || 
        combined.includes('club') || combined.includes('nightclub') || 
        combined.includes('drink') || combined.includes('cocktail')) {
      return 'bar';
    }
    
    // Tourism
    if (combined.includes('tour') || combined.includes('landmark') || 
        combined.includes('monument') || combined.includes('historic') || 
        combined.includes('attraction') || combined.includes('sightseeing')) {
      return 'tourist_attraction';
    }
    
    // TODO: This will eventually move to ActivitySuggestionService
    return 'establishment'; // Generic fallback
  }

  // Added private helper method for processing fixed appointments
  private async _processFixedAppointments(
    fixedTimes: any[], 
    baseDate: Date,
    query: string, 
    scheduledPlaces: Set<string>,
    itineraryPlaces: ItineraryPlaceItem[]
  ): Promise<void> {
    if (!Array.isArray(fixedTimes)) {
      console.warn("_processFixedAppointments: fixedTimes is not an array, skipping.", fixedTimes);
      return;
    }

    for (const timeSlot of fixedTimes) {
      console.log('[SERVICE DEBUG] Raw timeSlot being processed:', JSON.stringify(timeSlot));
      try {
        if (!timeSlot || typeof timeSlot !== 'object' || typeof timeSlot.time !== 'string' || !timeSlot.location) {
          console.warn("Skipping invalid timeSlot (e.g. time or location undefined/wrong type):", timeSlot);
          continue;
        }
        const appointmentTime = parseTimeString(timeSlot.time, baseDate);
        if (!appointmentTime || !(appointmentTime instanceof Date) || isNaN(appointmentTime.getTime())) {
            console.error(`[SERVICE ERROR] parseTimeString returned invalid Date for time: ${timeSlot.time}. Got:`, appointmentTime);
            throw new ValidationError(`Invalid time format for appointment: ${timeSlot.time}`);
        }
        
        const activityDescription = timeSlot.searchTerm || timeSlot.activity || 'activity'; 
        let activityType = timeSlot.type;
        if (!activityType || activityType === 'activity') {
          activityType = this._detectActivityTypeFromQuery(query, activityDescription);
        }

        const searchOptionsForGoogle: any = {
          type: activityType,
          requireOpenNow: true,
          keywords: Array.isArray(timeSlot.keywords) ? [...timeSlot.keywords] : [],
          searchTerm: timeSlot.searchTerm || activityDescription,
          minRating: typeof timeSlot.minRating === 'number' ? timeSlot.minRating : 0,
        };
        if (timeSlot.searchPreference) {
            searchOptionsForGoogle.searchPreference = timeSlot.searchPreference;
            if (!searchOptionsForGoogle.keywords.includes(timeSlot.searchPreference)) {
                searchOptionsForGoogle.keywords.push(timeSlot.searchPreference);
            }
        }

        let venueResult;
        try {
          const searchCacheKey = generateCacheKey('googlePlaceSearch', { location: timeSlot.location, options: searchOptionsForGoogle });
          venueResult = await this.cache.getOrSet(
            searchCacheKey,
            () => searchPlace(timeSlot.location, searchOptionsForGoogle),
            2 * 60 * 60 * 1000 // Cache Google Places results for 2 hours
          );
        } catch (error: any) {
          if (error instanceof AppError) throw error;
          throw new GooglePlacesError(`Google Places search failed for "${timeSlot.location}"`, error);
        }

        if (!venueResult || !venueResult.primary) {
          console.warn(`Could not find location for fixed appointment: ${activityDescription} at ${timeSlot.location}`);
          continue; 
        }
        const placeDetails = venueResult.primary;
        const compositeKey = `${placeDetails.place_id}:${timeSlot.location}:${activityDescription}`;
        if (scheduledPlaces.has(compositeKey)) {
          console.log(`Skipping duplicate fixed appointment (already scheduled): ${placeDetails.name} for ${activityDescription}`);
          continue;
        }

        const placeToInsert: InsertPlace = {
          placeId: placeDetails.place_id,
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          location: placeDetails.geometry.location,
          details: placeDetails,
          alternatives: venueResult.alternatives || [],
          scheduledTime: appointmentTime.toISOString(),
        };

        let storedPlace: Place;
        try {
          storedPlace = await this.storage.createPlace(placeToInsert);
        } catch (dbError: any) {
          if (dbError.code === '23505' || (dbError.message && dbError.message.includes('duplicate key'))) { 
            try {
              const existingPlace = await this.storage.getPlaceByPlaceId(placeDetails.place_id);
              if (existingPlace) {
                storedPlace = existingPlace;
              } else {
                throw new DatabaseError(`Failed to fetch existing place ${placeDetails.place_id} after duplicate error.`, dbError);
              }
            } catch (fetchError: any) {
              throw new DatabaseError(`Database error while fetching existing place ${placeDetails.place_id}.`, fetchError);
            }
          } else {
            throw new DatabaseError(`Failed to create place "${placeDetails.name}" in database.`, dbError);
          }
        }
        
        itineraryPlaces.push({ place: storedPlace, time: appointmentTime, isFixed: true });
        scheduledPlaces.add(compositeKey);
        console.log(`Added fixed appointment to itinerary: ${storedPlace.name} at ${appointmentTime.toISOString()}`);

      } catch (error: any) {
        if (error instanceof AppError) throw error;
        console.error(`Error processing fixed appointment slot "${timeSlot?.activity || timeSlot?.searchTerm || 'Unknown'}":`, error.message);
      }
    }
  }

  // Added private helper method from user prompt
  private async _processGeneralActivities(
    activities: any[], 
    baseDate: Date,
    scheduledPlaces: Set<string>,
    itineraryPlaces: ItineraryPlaceItem[],
    fallbackStartLocation: string | null 
  ): Promise<void> {
    console.log(`[SERVICE DEBUG _processGeneralActivities] Called with ${activities.length} activities.`);
    // The 'activities' parameter comes from 'parsed.activities'
    // In 'shared/schema.ts', Activity is: { description, location, time, searchParameters, requirements }
    console.log(`Processing ${activities.length} general activities (no fixed times)`);
    
    let currentTime = new Date(baseDate);
    // If there are already fixed places, schedule general activities after the last fixed one.
    // Otherwise, start at 10 AM.
    if (itineraryPlaces.length > 0) {
      const lastFixedTime = itineraryPlaces[itineraryPlaces.length - 1].time;
      currentTime = new Date(lastFixedTime.getTime() + 30 * 60 * 1000); // Start 30 mins after last fixed
    } else {
      currentTime.setHours(10, 0, 0, 0); // Start at 10 AM if no fixed places
    }
    
    const maxActivities = Math.min(activities.length, 3);
    
    for (let i = 0; i < maxActivities; i++) {
      const activity = activities[i]; // This is an Activity from shared/schema.ts
      
      try {
        const activityDescription = activity.description || 'general activity';
        console.log(`Processing general activity: ${activityDescription}`);
        
        let activityType = activity.searchParameters?.type;
        if (!activityType) {
          activityType = this._detectActivityTypeFromQuery('', activityDescription);
        }
        
        const searchOptionsForGoogle: any = {
          type: activityType,
          keywords: activity.searchParameters?.keywords || activity.requirements || [],
          searchTerm: activity.searchParameters?.searchTerm || activityDescription,
          minRating: activity.searchParameters?.minRating || 0,
          requireOpenNow: activity.searchParameters?.requireOpenNow !== undefined ? activity.searchParameters.requireOpenNow : true,
        };
        // If location is specified in the activity, use it for searchPlace
        const searchLocation = activity.location || fallbackStartLocation || 'New York'; 

        console.log(`Search options for general activity at "${searchLocation}":`, searchOptionsForGoogle);
        let venueResult;
        try {
          const searchCacheKey = generateCacheKey('googlePlaceSearch', { location: searchLocation, options: searchOptionsForGoogle });
          venueResult = await this.cache.getOrSet(
            searchCacheKey,
            () => searchPlace(searchLocation, searchOptionsForGoogle),
            2 * 60 * 60 * 1000 // Cache Google Places results for 2 hours
          );
        } catch (error: any) {
          if (error instanceof AppError) throw error;
          throw new GooglePlacesError(`Google Places search failed for general activity "${activityDescription}" at "${searchLocation}"`, error);
        }
        
        if (venueResult && venueResult.primary) {
          const placeDetails = venueResult.primary;
          console.log(`Found place for general activity: ${placeDetails.name}`);
          
          const placeToInsert: InsertPlace = {
            placeId: placeDetails.place_id, // This is the Google Place ID
            name: placeDetails.name,
            address: placeDetails.formatted_address,
            location: placeDetails.geometry.location, // { lat, lng }
            details: { // Store all Google Place details, plus our custom context
              ...placeDetails,
              searchTermUsed: searchOptionsForGoogle.searchTerm,
              activityDescription: activityDescription,
              requirements: activity.requirements || []
            },
            alternatives: venueResult.alternatives || [],
            // scheduledTime is not set here, as it's a general activity, time is flexible
          };
          
          let storedPlace: Place;
          try {
            storedPlace = await this.storage.createPlace(placeToInsert);
          } catch (dbError: any) {
            if (dbError.code === '23505' || (dbError.message && dbError.message.includes('duplicate key'))) {
              console.warn(`Place ${placeDetails.name} (ID: ${placeDetails.place_id}) already exists in DB, fetching existing.`);
              const existingPlace = await this.storage.getPlaceByPlaceId(placeDetails.place_id);
              if (existingPlace) {
                storedPlace = existingPlace;
              } else {
                throw new DatabaseError(`Failed to fetch existing place ${placeDetails.place_id} after duplicate error for general activity.`, dbError);
              }
            } else {
              throw new DatabaseError(`Failed to create place "${placeDetails.name}" for general activity in database.`, dbError);
            }
          }
          
          const compositeKey = `${storedPlace.placeId}:${activityDescription}`;
          if (!scheduledPlaces.has(compositeKey)) {
            itineraryPlaces.push({
              place: storedPlace,
              time: new Date(currentTime), // Assign current iterated time
              isFixed: false, 
            });
            scheduledPlaces.add(compositeKey);
            console.log(`Added general activity to itinerary: ${storedPlace.name} at ${currentTime.toISOString()}`);
            
            currentTime.setHours(currentTime.getHours() + 2); // Increment time for the next general activity
          } else {
            console.log(`Skipping general activity (already scheduled or similar): ${storedPlace.name} for ${activityDescription}`);
          }
        } else {
          console.log(`No places found for general activity: ${activityDescription} at ${searchLocation}`);
        }
      } catch (error: any) {
        if (error instanceof AppError) throw error;
        console.error(`Error processing general activity "${activity.description || 'unknown'}":`, error.message);
        // Continue with other activities
      }
    }
  }

  // Added private method from user prompt
  private async _calculateTravelTimes(itineraryPlaces: ItineraryPlaceItem[]): Promise<void> {
    console.log(`Calculating travel times for ${itineraryPlaces.length} places`);
    
    for (let i = 0; i < itineraryPlaces.length - 1; i++) {
      const currentPlaceItem = itineraryPlaces[i];
      const nextPlaceItem = itineraryPlaces[i + 1];
      
      try {
        // calculateTravelTime expects PlaceDetails, but our ItineraryPlaceItem.place is a Place (from DB)
        // We need to ensure place.details contains the necessary PlaceDetails structure or adapt.
        // Assuming currentPlaceItem.place.details can be cast or conforms to PlaceDetails for now.
        const travelTime = await calculateTravelTime(currentPlaceItem.place.details as PlaceDetails, nextPlaceItem.place.details as PlaceDetails);
        
        currentPlaceItem.travelTimeToNext = travelTime;
        
        console.log(`Travel time from ${currentPlaceItem.place.name} to ${nextPlaceItem.place.name}: ${travelTime} minutes`);
        
      } catch (error) {
        console.error(`Error calculating travel time between places: ${currentPlaceItem.place.name} and ${nextPlaceItem.place.name}`, error);
        currentPlaceItem.travelTimeToNext = 15; // 15 minutes default
      }
    }
  }

  // Added private method from user prompt
  private _generateItineraryTitle(parsed: StructuredRequest, originalQuery: string): string {
    // Use parsed title if available
    // Assuming StructuredRequest might have a title property from NLP
    // @ts-ignore // if parsed.title doesn't exist on StructuredRequest type
    if (parsed.title) {
      // @ts-ignore
      return parsed.title;
    }
    
    const activitiesTexts: string[] = [];
    
    if (parsed.fixedTimes && parsed.fixedTimes.length > 0) {
      // FixedTimeEntry has searchTerm. Using that as the primary source for activity description.
      activitiesTexts.push(...parsed.fixedTimes.map(ft => ft.searchTerm || 'activity'));
    }
    
    if (parsed.activities && parsed.activities.length > 0) {
      // Activity from shared/schema.ts has description.
      activitiesTexts.push(...parsed.activities.map(a => a.description || 'activity'));
    }
    
    // Corrected way to convert Set to Array to avoid downlevelIteration error
    const uniqueActivities = Array.from(new Set(activitiesTexts)).filter(text => text && text !== 'activity');

    if (uniqueActivities.length > 0) {
      const activityList = uniqueActivities.slice(0, 3).join(', ');
      const suffix = uniqueActivities.length > 3 ? '...' : '';
      return `${activityList}${suffix}`;
    }
    
    const shortQuery = originalQuery.length > 50 
      ? originalQuery.substring(0, 50) + '...' 
      : originalQuery;
    
    return `Trip: ${shortQuery}`;
  }

  // Add new private method from user prompt
  private _extractLocationFromQuery(query: string): string | null {
    const queryLower = query.toLowerCase();
    
    // Common NYC area patterns
    const nycAreas = [
      'greenwich village', 'soho', 'tribeca', 'chelsea', 'midtown', 'upper east side',
      'upper west side', 'lower east side', 'east village', 'west village',
      'financial district', 'brooklyn', 'queens', 'manhattan', 'bronx',
      'times square', 'central park', 'battery park', 'wall street'
    ];
    
    // Common London area patterns  
    const londonAreas = [
      'covent garden', 'westminster', 'kensington', 'chelsea', 'shoreditch',
      'brick lane', 'camden', 'notting hill', 'south bank', 'canary wharf',
      'oxford street', 'regent street', 'piccadilly', 'mayfair', 'bloomsbury'
    ];
    
    // Check for area mentions
    for (const area of [...nycAreas, ...londonAreas]) {
      if (queryLower.includes(area)) {
        // Capitalize properly
        return area.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }
    
    // Look for "in [location]" pattern
    const inPattern = /\bin\s+([a-zA-Z\s]+)(?:\s|$)/i;
    const match = query.match(inPattern);
    if (match && match[1]) {
      const location = match[1].trim();
      // Filter out common non-location words
      const nonLocations = ['the', 'morning', 'afternoon', 'evening', 'a', 'an'];
      if (!nonLocations.includes(location.toLowerCase())) {
        return location.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); // Capitalize
      }
    }
    
    return null;
  }

  // Add new private method from user prompt
  private _extractSearchLocation(parsed: StructuredRequest, originalQuery: string): string {
    // Option 1: Explicit start location from NLP
    if (parsed.startLocation) {
      console.log('📍 Using explicit start location from NLP:', parsed.startLocation);
      return parsed.startLocation;
    }
    
    // Option 2: Location from first fixed time entry
    if (parsed.fixedTimes && parsed.fixedTimes.length > 0 && parsed.fixedTimes[0].location) {
      console.log('📍 Using location from first fixed time entry:', parsed.fixedTimes[0].location);
      return parsed.fixedTimes[0].location;
    }
    
    // Option 3: First destination from NLP
    if (parsed.destinations && parsed.destinations.length > 0 && parsed.destinations[0]) {
      console.log('📍 Using first destination from NLP:', parsed.destinations[0]);
      return parsed.destinations[0];
    }
    
    // Option 4: Extract location from activities
    if (parsed.activities && parsed.activities.length > 0) {
      for (const activity of parsed.activities) {
        if (activity.location) {
          console.log('📍 Using location from an activity:', activity.location);
          return activity.location;
        }
      }
    }
    
    // Option 5: Smart parsing from original query text
    const extractedLocationFromQuery = this._extractLocationFromQuery(originalQuery);
    if (extractedLocationFromQuery) {
      console.log('📍 Extracted location from original query text:', extractedLocationFromQuery);
      return extractedLocationFromQuery;
    }
    
    // Option 6: Default fallback
    // Consider making this default configurable, e.g., via service constructor or options
    const defaultLocation = 'New York, NY'; 
    console.warn(`📍 Could not determine a specific search location. Using default: ${defaultLocation}`);
    return defaultLocation;
  }
} 