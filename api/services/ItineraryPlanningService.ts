// @ts-nocheck
import { type IStorage } from '../storage'; // Corrected: Use IStorage interface
import { type StructuredRequest } from '../shared/types'; // Corrected: Use StructuredRequest from shared types
import { type Place, type Itinerary, type PlaceDetails, type InsertPlace, type InsertItinerary } from '../shared/schema'; // Corrected: User from @shared/schema, Itinerary is the details type, Added InsertPlace and InsertItinerary
import { CityConfig } from "../config/cities"; // Added CityConfig import
import { CityConfigService } from './CityConfigService'; // Added
import { LocationResolver } from './LocationResolver'; // Added
import { AreaIntelligenceService } from './AreaIntelligenceService'; // Added area intelligence

// Assuming these are still needed from their original paths for now
import { searchPlace } from '../lib/googlePlaces'; 
import { enhancedPlaceSearch } from '../lib/enhancedPlaceSearch'; // Added enhanced search
import { calculateTravelTime } from '../lib/itinerary'; 
import { parseItineraryRequest } from '../lib/nlp-fixed'; 
import { parseTimeString } from '../lib/timeUtils'; // Added import for parseTimeString
import { isVenueOutdoor, getWeatherAwareVenue } from '../lib/weatherService'; // Added weather service imports

// Import custom errors
import {
  AppError, NLPServiceError, ValidationError, GooglePlacesError, DatabaseError, NotFoundError, InternalServerError
} from '../lib/errors';

// Import error recovery
import { errorRecoveryService, withRetry, CircuitBreaker, RecoveryContext } from '../lib/errorRecovery';

// Import performance monitoring
import { performanceMonitor, measurePerformance } from '../lib/performanceMonitor';

import { MemoryCache, generateCacheKey } from '../lib/cache'; // Added cache imports

// Interface for the main planning input
export interface PlanRequestOptions {
  query: string;
  date?: string;
  startTime?: string;
  userId?: string; // Changed from User['id'] to simple string for anonymous identifier
  nlpResult?: StructuredRequest; // Corrected: Use StructuredRequest
  enableGapFilling?: boolean; // Added option for gap filling
  citySlug: string; // Made citySlug mandatory for city-aware planning
  tripDuration?: number; // Number of days for multi-day trips
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
  private cityConfigService: CityConfigService; // Added
  private locationResolver: LocationResolver; // Added
  private areaIntelligence: AreaIntelligenceService; // Added area intelligence
  
  // Circuit breakers for external services
  private nlpCircuitBreaker: CircuitBreaker;
  private placesCircuitBreaker: CircuitBreaker;
  private weatherCircuitBreaker: CircuitBreaker;

  constructor(storage: IStorage, cityConfigService: CityConfigService, locationResolver: LocationResolver) {
    this.storage = storage;
    this.cache = new MemoryCache(); // Instantiate the cache
    this.cityConfigService = cityConfigService; // Added
    this.locationResolver = locationResolver; // Added
    this.areaIntelligence = new AreaIntelligenceService(); // Initialize area intelligence
    
    // Initialize circuit breakers
    this.nlpCircuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s recovery
    this.placesCircuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1m recovery
    this.weatherCircuitBreaker = new CircuitBreaker(5, 120000); // 5 failures, 2m recovery
  }

  // Get cache statistics
  public getCacheStats() {
    const cacheStats = this.cache.getStats();
    return {
      cache: cacheStats,
      circuitBreakers: {
        nlp: this.nlpCircuitBreaker.getState(),
        places: this.placesCircuitBreaker.getState(),
        weather: this.weatherCircuitBreaker.getState()
      }
    };
  }

  public async createPlan(options: PlanRequestOptions, cityConfig: CityConfig): Promise<Itinerary> {
    const planTimer = performanceMonitor.startTiming('ItineraryPlanningService.createPlan')
      .addMetadata('city', cityConfig.slug)
      .addMetadata('query', options.query);
    
    const { query, date, startTime, userId, enableGapFilling = false, citySlug } = options;

    if (citySlug) {
      console.log('🏙️ Creating plan for city:', citySlug);
    }

    console.log('🚀 Creating plan for query:', query);

    let parsed: StructuredRequest;
    try {
      const nlpTimer = performanceMonitor.startTiming('nlp_processing')
        .addMetadata('query', query)
        .addMetadata('city', cityConfig.slug);
      
      const nlpCacheKey = generateCacheKey('nlp', { query, city: cityConfig.slug });
      parsed = options.nlpResult || await this.cache.getOrSet(
        nlpCacheKey,
        () => this.nlpCircuitBreaker.execute(() => parseItineraryRequest(query, cityConfig, date, startTime)),
        30 * 60 * 1000 
      );
      
      nlpTimer.addMetadata('cached', !!options.nlpResult).end(true);
    } catch (error:any) {
      console.error('❌ NLP parsing failed, attempting error recovery:', error);
      
      const recoveryContext: RecoveryContext = {
        operation: 'nlp_parsing',
        retryCount: 0,
        maxRetries: 2,
        originalRequest: { query, date, startTime, city: cityConfig.slug }
      };
      
      const recovery = await errorRecoveryService.attemptRecovery(error, recoveryContext);
      
      if (recovery.recovered && recovery.data?.activities) {
        console.log('✅ NLP recovery successful, using simplified parsing');
        parsed = {
          startLocation: null,
          destinations: recovery.data.activities.map((a: any) => a.location).filter(Boolean),
          activities: recovery.data.activities,
          fixedTimes: [],
          isSimplified: true
        };
      } else {
        if (error instanceof AppError) throw error;
        throw new NLPServiceError('Failed to parse itinerary request', error);
      }
    }
    console.log('📝 Parsed request from cache/fetch:', parsed);

    const searchLocation = this._extractSearchLocation(parsed, query, cityConfig);
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
            type: this._getCitySpecificCategory('restaurant', cityConfig) || 'restaurant', // City-specific category
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
      ? parseTimeString(startTime, baseDate, cityConfig.timezone) 
      : new Date(new Date(baseDate).setHours(9, 0, 0, 0));

    const scheduledPlaces = new Set<string>(); 
    let itineraryPlaces: ItineraryPlaceItem[] = []; 

    // Handle lunch request specifically - use the reliable searchLocation
    let lunchHandled = false;
    if (enableGapFilling && parsed.preferences?.type === 'lunch' && searchLocation) { // Check searchLocation
      console.log("Searching for lunch venue near:", searchLocation, "in", cityConfig.name);
      try {
        const lunchSearchType = this._getCitySpecificCategory('restaurant', cityConfig) || 'restaurant';
        const searchOptions: any = {
          type: lunchSearchType,
          requireOpenNow: true,
          minRating: 4.0,
          searchTerm: 'lunch ' + lunchSearchType,
          keywords: [lunchSearchType, 'lunch', 'dining']
        };
        
        if (parsed.preferences?.requirements && parsed.preferences.requirements.length > 0) {
          searchOptions.keywords = [
            ...searchOptions.keywords,
            ...parsed.preferences.requirements
          ];
        }
        
        const venueResult = await this.placesCircuitBreaker.execute(async () => {
          try {
            return await enhancedPlaceSearch({
              query: searchOptions.searchTerm || `${searchOptions.type} in ${searchLocation}`,
              location: searchLocation,
              keywords: searchOptions.keywords,
              type: searchOptions.type,
              preferences: parsed.preferences,
              cityContext: {
                name: cityConfig.name,
                slug: cityConfig.slug,
                timezone: cityConfig.timezone
              }
            });
          } catch (error) {
            console.error('❌ Venue search failed, attempting recovery:', error);
            
            const recoveryContext: RecoveryContext = {
              operation: 'venue_search',
              retryCount: 0,
              maxRetries: 1,
              originalRequest: {
                query: searchOptions.searchTerm,
                location: searchLocation,
                type: searchOptions.type
              }
            };
            
            const recovery = await errorRecoveryService.attemptRecovery(error, recoveryContext);
            if (recovery.recovered) {
              return recovery.data;
            }
            throw error;
          }
        });
        
        if (venueResult && venueResult.primary) {
          let lunchPlaceDetails = venueResult.primary;

          if (process.env.WEATHER_API_KEY && lunchPlaceDetails.types) {
            try {
              const lunchDateTime = parseTimeString('14:00', baseDate, cityConfig.timezone); // Standard lunch time
              console.log("Checking weather conditions for lunch venue...");
              
              const { venue: recommendedVenue, weatherSuitable } = await getWeatherAwareVenue(
                lunchPlaceDetails,
                venueResult.alternatives || [],
                lunchPlaceDetails.geometry.location.lat,
                lunchPlaceDetails.geometry.location.lng,
                lunchDateTime
              );
              
              if (venueResult.alternatives && venueResult.alternatives.length > 0) {
                venueResult.alternatives.forEach(alt => {
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
            alternativesCount: venueResult.alternatives?.length || 0
          });

          const lunchTimeDate = parseTimeString('14:00', baseDate, cityConfig.timezone);
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
        parsed.fixedTimes, baseDate, query, scheduledPlaces, itineraryPlaces, cityConfig
      );
    }
    
    if (itineraryPlaces.length === 0 && parsed.activities && parsed.activities.length > 0) {
      await this._processGeneralActivities(
        parsed.activities,
        baseDate,
        scheduledPlaces,
        itineraryPlaces,
        searchLocation,
        cityConfig
      );
    }
  
    // Sort by time initially
    itineraryPlaces.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Apply route optimization for London if we have multiple flexible activities
    if (cityConfig.slug === 'london' && itineraryPlaces.length > 2) {
      const optimized = this._optimizeRoute(itineraryPlaces, parsed, cityConfig);
      if (optimized) {
        itineraryPlaces = optimized;
      }
    }
  
    if (itineraryPlaces.length > 1) {
      await this._calculateTravelTimes(itineraryPlaces, cityConfig);
    }

    // Handle multi-day trips
    const tripDuration = options.tripDuration || 1;
    if (tripDuration > 1) {
      return await this._createMultiDayTrip(
        itineraryPlaces,
        parsed,
        query,
        baseDate,
        searchLocation,
        userId,
        cityConfig,
        tripDuration
      );
    }
  
    const title = this._generateItineraryTitle(parsed, query, cityConfig);
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
      description: `Generated for ${cityConfig.name} from: "${query}" (around ${searchLocation})`,
      planDate: baseDate.toISOString(), 
      query: query,
      places: itineraryPlacesForDb, 
      travelTimes: travelTimesForDb, 
    };
  
    try {
      const createdItinerary = await this.storage.createItinerary(itineraryToInsert, userId);
      console.log(`Successfully created itinerary "${title}" for ${cityConfig.name} with ID: ${createdItinerary.id}`);
      planTimer.end(true);
      return createdItinerary;
    } catch (error: any) {
      planTimer.end(false);
      throw new DatabaseError('Failed to save itinerary to database', error);
    }
  }

  public async getItineraryById(id: number, anonymousIdentifier?: string): Promise<Itinerary | null> {
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
  private _detectActivityTypeFromQuery(query: string, activity: string, cityConfig: CityConfig): string {
    const combined = `${query} ${activity}`.toLowerCase();
    
    // Food-related
    if (combined.includes('restaurant') || combined.includes('dining') || 
        combined.includes('food') || combined.includes('eat') || 
        combined.includes('breakfast') || combined.includes('lunch') || 
        combined.includes('dinner') || combined.includes('brunch')) {
      return this._getCitySpecificCategory('restaurant', cityConfig) || 'restaurant';
    }
    
    // Culture
    if (combined.includes('museum') || combined.includes('gallery') || 
        combined.includes('art') || combined.includes('exhibition')) {
      return this._getCitySpecificCategory('museum', cityConfig) || 'museum';
    }
    
    // Entertainment
    if (combined.includes('theater') || combined.includes('theatre') || 
        combined.includes('show') || combined.includes('performance') || 
        combined.includes('concert') || combined.includes('movie')) {
      return this._getCitySpecificCategory('movie_theater', cityConfig) || 'movie_theater';
    }
    
    // Outdoor
    if (combined.includes('park') || combined.includes('garden') || 
        combined.includes('zoo') || combined.includes('outdoor') ||
        combined.includes('walk') || combined.includes('nature')) {
      return this._getCitySpecificCategory('park', cityConfig) || 'park';
    }
    
    // Shopping
    if (combined.includes('shop') || combined.includes('shopping') || 
        combined.includes('store') || combined.includes('market') || 
        combined.includes('boutique')) {
      return this._getCitySpecificCategory('shopping_mall', cityConfig) || 'shopping_mall';
    }
    
    // Nightlife
    if (combined.includes('bar') || combined.includes('pub') || 
        combined.includes('club') || combined.includes('nightclub') || 
        combined.includes('drink') || combined.includes('cocktail')) {
      return this._getCitySpecificCategory('bar', cityConfig) || 'bar';
    }
    
    // Tourism
    if (combined.includes('tour') || combined.includes('landmark') || 
        combined.includes('monument') || combined.includes('historic') || 
        combined.includes('attraction') || combined.includes('sightseeing')) {
      return this._getCitySpecificCategory('tourist_attraction', cityConfig) || 'tourist_attraction';
    }
    
    // TODO: This will eventually move to ActivitySuggestionService
    return this._getCitySpecificCategory('establishment', cityConfig) || 'establishment'; // Generic fallback
  }

  // Added private helper method for processing fixed appointments
  private async _processFixedAppointments(
    fixedTimes: any[], 
    baseDate: Date,
    query: string, 
    scheduledPlaces: Set<string>,
    itineraryPlaces: ItineraryPlaceItem[],
    cityConfig: CityConfig
  ): Promise<void> {
    if (!Array.isArray(fixedTimes)) {
      console.warn("_processFixedAppointments: fixedTimes is not an array, skipping.", fixedTimes);
      return;
    }

    let previousLocation: string | null = null;
    
    for (const timeSlot of fixedTimes) {
      console.log('[SERVICE DEBUG] Raw timeSlot being processed:', JSON.stringify(timeSlot));
      try {
        if (!timeSlot || typeof timeSlot !== 'object' || typeof timeSlot.time !== 'string' || !timeSlot.location) {
          console.warn("Skipping invalid timeSlot (e.g. time or location undefined/wrong type):", timeSlot);
          continue;
        }
        const appointmentTime = parseTimeString(timeSlot.time, baseDate, cityConfig.timezone);
        if (!appointmentTime || !(appointmentTime instanceof Date) || isNaN(appointmentTime.getTime())) {
            console.error(`[SERVICE ERROR] parseTimeString returned invalid Date for time: ${timeSlot.time}. Got:`, appointmentTime);
            throw new ValidationError(`Invalid time format for appointment: ${timeSlot.time}`);
        }
        
        const activityDescription = timeSlot.searchTerm || timeSlot.activity || 'activity'; 
        let activityType = timeSlot.type;
        if (!activityType || activityType === 'activity') {
          activityType = this._detectActivityTypeFromQuery(query, activityDescription, cityConfig);
        }
        
        // Handle meetings and appointments without venue search
        if (activityType === 'skip' || activityDescription.toLowerCase().includes('meeting') || activityDescription.toLowerCase().includes('appointment')) {
          console.log(`Adding meeting/appointment without venue search: ${activityDescription} at ${timeSlot.location}`);
          
          // Create a placeholder place for the meeting
          const meetingPlace: InsertPlace = {
            placeId: `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: activityDescription || 'Meeting',
            address: timeSlot.location || 'To be determined',
            location: { lat: 0, lng: 0 }, // Placeholder coordinates
            details: {
              place_id: `meeting_${Date.now()}`,
              name: activityDescription || 'Meeting',
              formatted_address: timeSlot.location || 'To be determined',
              geometry: { location: { lat: 0, lng: 0 } },
              types: ['meeting', 'appointment'],
              isMeeting: true,
              activityDescription: activityDescription
            } as PlaceDetails,
            scheduledTime: appointmentTime.toISOString(),
          };
          
          try {
            const storedPlace = await this.storage.createPlace(meetingPlace);
            itineraryPlaces.push({ 
              place: storedPlace, 
              time: appointmentTime, 
              isFixed: true 
            });
            scheduledPlaces.add(`meeting:${timeSlot.location}:${activityDescription}`);
            console.log(`Added meeting to itinerary: ${activityDescription} at ${appointmentTime.toISOString()}`);
          } catch (error) {
            console.error(`Failed to add meeting to itinerary: ${error}`);
          }
          
          continue;
        }

        // Handle "nearby" references by using previous location
        let searchLocation = timeSlot.location;
        if (searchLocation && searchLocation.toLowerCase().includes('nearby') && previousLocation) {
          console.log(`📍 [SERVICE] Resolving "nearby" to previous location: ${previousLocation}`);
          searchLocation = previousLocation;
        }
        
        const searchOptionsForGoogle: any = {
          type: activityType,
          requireOpenNow: true,
          keywords: Array.isArray(timeSlot.keywords) ? [...timeSlot.keywords] : [],
          searchTerm: timeSlot.searchTerm || activityDescription,
          minRating: typeof timeSlot.minRating === 'number' ? timeSlot.minRating : 0,
          citySlug: cityConfig.slug // Add city slug for proper filtering
        };
        if (timeSlot.searchPreference) {
            searchOptionsForGoogle.searchPreference = timeSlot.searchPreference;
            if (!searchOptionsForGoogle.keywords.includes(timeSlot.searchPreference)) {
                searchOptionsForGoogle.keywords.push(timeSlot.searchPreference);
            }
        }

        let venueResult;
        try {
          const searchCacheKey = generateCacheKey('googlePlaceSearch', { location: timeSlot.location, options: searchOptionsForGoogle, city: cityConfig.slug });
          
          // Create enhanced preferences with venuePreference
          const enhancedPreferences = {
            ...(timeSlot.searchParameters || timeSlot.preferences || {}),
            venuePreference: timeSlot.searchPreference || timeSlot.searchParameters?.venuePreference
          };
          
          venueResult = await this.cache.getOrSet(
            searchCacheKey,
            () => enhancedPlaceSearch({
              query: searchOptionsForGoogle.searchTerm || `${activityType} in ${searchLocation}`,
              location: searchLocation,
              keywords: searchOptionsForGoogle.keywords,
              type: searchOptionsForGoogle.type,
              preferences: enhancedPreferences,
              scheduledDateTime: appointmentTime, // Add scheduled time for operating hours validation
              cityContext: {
                name: cityConfig.name,
                slug: cityConfig.slug,
                timezone: cityConfig.timezone
              }
            }),
            5 * 60 * 1000 // Cache Google Places results for 5 minutes for variety
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

        // Debug place details before insertion
        console.log(`🔍 [SERVICE] Place details for "${placeDetails.name}":`, {
          hasRating: !!placeDetails.rating,
          rating: placeDetails.rating,
          hasTypes: !!placeDetails.types,
          types: placeDetails.types,
          detailsKeys: Object.keys(placeDetails),
          fullDetails: JSON.stringify(placeDetails, null, 2)
        });
        
        const placeToInsert: InsertPlace = {
          placeId: placeDetails.place_id,
          name: placeDetails.name,
          address: placeDetails.formatted_address,
          location: placeDetails.geometry.location,
          details: placeDetails,
          alternatives: venueResult.alternatives || [],
          scheduledTime: appointmentTime.toISOString(),
        };

        console.log(`🔍 [SERVICE] About to store place with details:`, {
          hasDetails: !!placeDetails,
          rating: placeDetails.rating,
          types: placeDetails.types,
          detailsSize: JSON.stringify(placeDetails).length
        });
        
        console.log(`🔍 [SERVICE] placeToInsert details:`, {
          hasDetails: !!placeToInsert.details,
          detailsType: typeof placeToInsert.details,
          detailsKeys: placeToInsert.details ? Object.keys(placeToInsert.details) : []
        });

        let storedPlace: Place;
        try {
          storedPlace = await this.storage.createPlace(placeToInsert);
          
          // Debug stored place details
          console.log(`🔍 [SERVICE] Stored place "${storedPlace.name}" details:`, {
            hasDetails: !!storedPlace.details,
            detailsType: typeof storedPlace.details,
            detailsKeys: storedPlace.details ? Object.keys(storedPlace.details) : [],
            rating: storedPlace.details?.rating,
            types: storedPlace.details?.types
          });
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
        
        // Update previous location for "nearby" references
        previousLocation = placeDetails.formatted_address || searchLocation;

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
    fallbackStartLocation: string | null,
    cityConfig: CityConfig
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
    
    const maxActivities = activities.length; // Allow all activities, not just 3
    
    // Track previous location for "nearby" references
    let previousLocation: string | null = null;
    if (itineraryPlaces.length > 0) {
      const lastPlace = itineraryPlaces[itineraryPlaces.length - 1].place;
      previousLocation = lastPlace.address || (lastPlace.details as PlaceDetails)?.formatted_address || null;
    }
    
    for (let i = 0; i < maxActivities; i++) {
      const activity = activities[i]; // This is an Activity from shared/schema.ts
      
      try {
        const activityDescription = activity.description || 'general activity';
        console.log(`Processing general activity: ${activityDescription}`);
        
        let activityType = activity.searchParameters?.type;
        if (!activityType) {
          activityType = this._detectActivityTypeFromQuery('', activityDescription, cityConfig);
        }
        
        const searchOptionsForGoogle: any = {
          type: activityType,
          keywords: activity.searchParameters?.keywords || activity.requirements || [],
          searchTerm: activity.searchParameters?.searchTerm || activityDescription,
          minRating: activity.searchParameters?.minRating || 0,
          requireOpenNow: activity.searchParameters?.requireOpenNow !== undefined ? activity.searchParameters.requireOpenNow : true,
          citySlug: cityConfig.slug // Add city slug for proper filtering
        };
        // If location is specified in the activity, use it for searchPlace
        let searchLocation = activity.location || fallbackStartLocation || cityConfig.name;
        
        // Handle "nearby" references
        if (searchLocation && searchLocation.toLowerCase().includes('nearby') && previousLocation) {
          console.log(`📍 [SERVICE] Resolving "nearby" to previous location: ${previousLocation}`);
          searchLocation = previousLocation;
        } 

        console.log(`Search options for general activity at "${searchLocation}":`, searchOptionsForGoogle);
        let venueResult;
        try {
          const searchCacheKey = generateCacheKey('googlePlaceSearch', { location: searchLocation, options: searchOptionsForGoogle, city: cityConfig.slug });
          
          // Create enhanced preferences with venuePreference
          const enhancedPreferences = {
            ...(activity.searchParameters || activity.preferences || {}),
            venuePreference: activity.searchParameters?.venuePreference
          };
          
          venueResult = await this.cache.getOrSet(
            searchCacheKey,
            () => enhancedPlaceSearch({
              query: searchOptionsForGoogle.searchTerm || `${activityType} in ${searchLocation}`,
              location: searchLocation,
              keywords: searchOptionsForGoogle.keywords,
              type: searchOptionsForGoogle.type,
              preferences: enhancedPreferences,
              scheduledDateTime: new Date(currentTime), // Add scheduled time for operating hours validation
              cityContext: {
                name: cityConfig.name,
                slug: cityConfig.slug,
                timezone: cityConfig.timezone
              }
            }),
            5 * 60 * 1000 // Cache Google Places results for 5 minutes for variety
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
            
            // Update previous location for next "nearby" reference
            previousLocation = storedPlace.address || (storedPlace.details as PlaceDetails)?.formatted_address || searchLocation;
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
  private async _calculateTravelTimes(itineraryPlaces: ItineraryPlaceItem[], cityConfig: CityConfig): Promise<void> {
    console.log(`Calculating travel times for ${itineraryPlaces.length} places in ${cityConfig.name}`);
    
    for (let i = 0; i < itineraryPlaces.length - 1; i++) {
      const currentPlaceItem = itineraryPlaces[i];
      const nextPlaceItem = itineraryPlaces[i + 1];
      
      try {
        let travelTime: number;
        
        // Check if we're in London and can use area intelligence
        if (cityConfig.slug === 'london') {
          // Extract area names from addresses or use place names
          const fromArea = this._extractAreaFromPlace(currentPlaceItem.place);
          const toArea = this._extractAreaFromPlace(nextPlaceItem.place);
          
          if (fromArea && toArea) {
            // Use area intelligence for London
            const travelEstimate = this.areaIntelligence.getTravelTime(fromArea, toArea);
            travelTime = travelEstimate.transitMinutes;
            
            console.log(`🚇 London travel from ${fromArea} to ${toArea}: ${travelTime} minutes (${travelEstimate.recommendedMode})`);
          } else {
            // Fallback to basic calculation
            travelTime = await calculateTravelTime(currentPlaceItem.place.details as PlaceDetails, nextPlaceItem.place.details as PlaceDetails);
          }
        } else {
          // Use basic calculation for other cities
          travelTime = await calculateTravelTime(currentPlaceItem.place.details as PlaceDetails, nextPlaceItem.place.details as PlaceDetails);
        }
        
        currentPlaceItem.travelTimeToNext = travelTime;
        
        console.log(`Travel time from ${currentPlaceItem.place.name} to ${nextPlaceItem.place.name}: ${travelTime} minutes`);
        
      } catch (error) {
        console.error(`Error calculating travel time between places: ${currentPlaceItem.place.name} and ${nextPlaceItem.place.name}`, error);
        currentPlaceItem.travelTimeToNext = 15; // 15 minutes default
      }
    }
  }

  // Added private method from user prompt
  private _generateItineraryTitle(parsed: StructuredRequest, originalQuery: string, cityConfig: CityConfig): string {
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
      return `${activityList}${suffix} in ${cityConfig.name}`;
    }
    
    const shortQuery = originalQuery.length > 50 
      ? originalQuery.substring(0, 50) + '...' 
      : originalQuery;
    
    return `Trip: ${shortQuery} in ${cityConfig.name}`;
  }

  // Add new private method from user prompt
  private _extractLocationFromQuery(query: string, cityConfig: CityConfig): string | null {
    // Use LocationResolver for more advanced logic
    const areas = this.locationResolver.extractAreaReferences(query, cityConfig);
    if (areas.length > 0) {
      // Could return the name, or for searchPlace, format as lat,lng string
      return areas[0].name; // For simplicity, return first matched area name
    }
    // TODO: Use locationResolver.resolveColloquialTerms here

    const queryLower = query.toLowerCase();
    // Fallback to existing regex if LocationResolver doesn't find specific areas
    const inPattern = /\bin\s+([a-zA-Z\s,]+)(?:\s|$)/i;
    const match = query.match(inPattern);
    if (match && match[1]) {
      const location = match[1].trim().replace(/,$/, '');
      const nonLocations = ['the', 'morning', 'afternoon', 'evening', 'a', 'an'];
      if (!nonLocations.includes(location.toLowerCase())) {
        return location.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      }
    }
    return null;
  }

  // Add new private method from user prompt
  private _extractSearchLocation(parsed: StructuredRequest, originalQuery: string, cityConfig: CityConfig): string {
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
    const extractedLocationFromQuery = this._extractLocationFromQuery(originalQuery, cityConfig);
    if (extractedLocationFromQuery) {
      console.log('📍 Extracted location from original query text:', extractedLocationFromQuery);
      return extractedLocationFromQuery;
    }
    
    // Option 6: Default fallback
    // Consider making this default configurable, e.g., via service constructor or options
    const defaultLocation = 'New York, NY'; 
    console.warn(`📍 Could not determine a specific search location for ${cityConfig.name}. Using city default: ${defaultLocation}`);
    return defaultLocation;
  }

  private _getCitySpecificCategory(genericCategory: string, cityConfig: CityConfig): string | null {
    const specific = cityConfig.businessCategories?.[genericCategory];
    if (typeof specific === 'string') return specific;
    if (Array.isArray(specific) && specific.length > 0) return specific[0]; // Take the first one for now
    return null;
  }
  
  private _extractAreaFromPlace(place: Place): string | null {
    // First try to extract from the address
    if (place.address) {
      // Common London area patterns
      const areaPatterns = [
        /\b(Canary Wharf|Mayfair|Soho|Shoreditch|Camden|Covent Garden|Notting Hill|Chelsea|Kensington|Bloomsbury|Fitzrovia|Marylebone|Westminster|Islington|Hackney|Brixton|Clapham)\b/i
      ];
      
      for (const pattern of areaPatterns) {
        const match = place.address.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
    
    // Try to extract from place name
    if (place.name) {
      // Sometimes places include area in their name
      const nameMatch = place.name.match(/\b(?:in|at|near)\s+(\w+(?:\s+\w+)?)\b/i);
      if (nameMatch) {
        return nameMatch[1];
      }
    }
    
    return null;
  }
  
  private _optimizeRoute(places: ItineraryPlaceItem[], parsed: StructuredRequest, cityConfig: CityConfig): ItineraryPlaceItem[] | null {
    console.log('🗺️ Optimizing route for', places.length, 'places in', cityConfig.name);
    
    // Separate fixed and flexible activities
    const fixedActivities = places.filter(p => p.isFixed);
    const flexibleActivities = places.filter(p => !p.isFixed);
    
    if (flexibleActivities.length < 2) {
      // Not enough flexible activities to optimize
      return null;
    }
    
    // Extract locations for optimization
    const locations = flexibleActivities.map(p => {
      const area = this._extractAreaFromPlace(p.place);
      return area || p.place.name;
    });
    
    // Get start and end locations
    const startLocation = parsed.startLocation || (places[0] ? this._extractAreaFromPlace(places[0].place) : null) || 'Central London';
    const endLocation = parsed.destinations?.[parsed.destinations.length - 1] || startLocation;
    
    // Use area intelligence to optimize
    const optimizedLocations = this.areaIntelligence.optimizeRoute(locations, startLocation, endLocation);
    
    // Reorder flexible activities based on optimization
    const optimizedFlexible = optimizedLocations.map(loc => 
      flexibleActivities.find(p => {
        const area = this._extractAreaFromPlace(p.place);
        return (area && area.toLowerCase() === loc.toLowerCase()) || 
               p.place.name.toLowerCase().includes(loc.toLowerCase());
      })
    ).filter(p => p !== undefined) as ItineraryPlaceItem[];
    
    // Merge fixed and optimized flexible activities
    const result: ItineraryPlaceItem[] = [];
    let flexIndex = 0;
    
    for (const place of places) {
      if (place.isFixed) {
        result.push(place);
      } else if (flexIndex < optimizedFlexible.length) {
        result.push(optimizedFlexible[flexIndex++]);
      }
    }
    
    console.log('✅ Route optimized to minimize travel time');
    return result;
  }

  private async _createMultiDayTrip(
    itineraryPlaces: ItineraryPlaceItem[],
    parsed: StructuredRequest,
    query: string,
    baseDate: Date,
    searchLocation: string,
    userId: string | undefined,
    cityConfig: CityConfig,
    tripDuration: number
  ): Promise<Itinerary> {
    console.log(`🗓️ Creating ${tripDuration}-day trip for ${cityConfig.name}`);
    
    // Create a single itinerary with all activities but structured for multiple days
    const tripTitle = `${tripDuration}-Day ${this._generateItineraryTitle(parsed, query, cityConfig)}`;
    
    // Group activities by day
    const activitiesPerDay = Math.ceil(itineraryPlaces.length / tripDuration);
    const dayGroups: { [key: number]: ItineraryPlaceItem[] } = {};
    
    for (let dayNum = 0; dayNum < tripDuration; dayNum++) {
      const startIdx = dayNum * activitiesPerDay;
      const endIdx = Math.min(startIdx + activitiesPerDay, itineraryPlaces.length);
      dayGroups[dayNum] = itineraryPlaces.slice(startIdx, endIdx);
      
      // Adjust times for each day
      const dayDate = new Date(baseDate);
      dayDate.setDate(dayDate.getDate() + dayNum);
      const dayStartTime = new Date(dayDate);
      dayStartTime.setHours(9, 0, 0, 0);
      
      let currentTime = new Date(dayStartTime);
      dayGroups[dayNum].forEach((activity) => {
        activity.time = new Date(currentTime);
        currentTime.setHours(currentTime.getHours() + 2);
      });
    }
    
    // Flatten all activities back into a single array
    const allActivities = Object.values(dayGroups).flat();
    
    // Recalculate travel times
    if (allActivities.length > 1) {
      await this._calculateTravelTimes(allActivities, cityConfig);
    }
    
    // Create itinerary with all activities
    const itineraryPlacesForDb = allActivities.map(item => ({
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
    
    const travelTimesForDb = allActivities
      .filter(item => item.travelTimeToNext !== undefined && item.travelTimeToNext > 0)
      .map((item, index) => {
        if (index < allActivities.length - 1) {
          return {
            fromPlaceId: item.place.placeId,
            toPlaceId: allActivities[index + 1].place.placeId,
            durationMinutes: item.travelTimeToNext
          };
        }
        return null;
      })
      .filter(tt => tt !== null);
    
    const itineraryToInsert: InsertItinerary = {
      title: tripTitle,
      description: `${tripDuration}-day trip to ${cityConfig.name}`,
      planDate: baseDate.toISOString(),
      query: query,
      places: itineraryPlacesForDb,
      travelTimes: travelTimesForDb,
    };
    
    const createdItinerary = await this.storage.createItinerary(itineraryToInsert, userId);
    
    // Add multi-day metadata
    (createdItinerary as any).isMultiDay = true;
    (createdItinerary as any).tripDuration = tripDuration;
    (createdItinerary as any).dayGroups = Object.entries(dayGroups).map(([dayNum, activities]) => ({
      day: parseInt(dayNum) + 1,
      date: new Date(baseDate.getTime() + parseInt(dayNum) * 24 * 60 * 60 * 1000).toISOString(),
      activitiesCount: activities.length,
      startIndex: parseInt(dayNum) * activitiesPerDay,
      endIndex: Math.min((parseInt(dayNum) + 1) * activitiesPerDay, itineraryPlaces.length)
    }));
    
    console.log(`✅ Successfully created ${tripDuration}-day trip itinerary`);
    planTimer.end(true);
    return createdItinerary;
  }
} 