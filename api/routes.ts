// @ts-nocheck
import type { Express, Request } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { searchPlace } from "./lib/googlePlaces";
import { calculateTravelTime } from "./lib/itinerary";
import { StructuredRequest } from "../shared/types";
import { insertPlaceSchema, insertItinerarySchema, Place, PlaceDetails } from "../shared/schema";
import { z } from "zod";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { findAreasByCharacteristics, findQuietAreas, getAreaCrowdLevel, NYCArea, nycAreas } from "./data/new-york-areas";
import { getWeatherForecast, isVenueOutdoor, isWeatherSuitableForOutdoor, getWeatherAwareVenue } from "./lib/weatherService";
import { getAnalytics } from "./lib/analytics";
import { analyzeQueryComplexity, generateSimplificationSuggestions, isHighComplexityQuery } from "./lib/queryComplexity";
import { rateLimiters, planningRateLimiter } from "./middleware/rateLimiter";
import { performanceMonitor } from "./lib/performanceMonitor";
import { dbOptimizer } from "./lib/dbOptimizer";

// Import the timeUtils module
import { 
  parseAndNormalizeTime, 
  NYC_TIMEZONE, 
  formatISOToNYCTime, 
  timeStringToNYCISOString,
  parseTimeString,
  getDayPart
} from './lib/timeUtils';

// Import the new service
import { ItineraryPlanningService, PlanRequestOptions } from "./services/ItineraryPlanningService";
import { CityConfigService } from "./services/CityConfigService";
import { getAllCities, CityConfig } from "./config/cities";
import { validateCitySlugParams, attachCityConfig } from "./middleware/cityMiddleware";

export function findInterestingActivities(
  currentLocation: string,
  availableHours: number,
  preferences: any,
  dayPart: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon'
): any[] {
  console.log("Finding activities based on preferences:", preferences);
  
  const possibleArea = nycAreas.find((a: NYCArea) => 
    a.name.toLowerCase().includes(currentLocation.toLowerCase())
  );
  
  const areaParam = possibleArea ? possibleArea.name : undefined;
  const results = [];
  let matchedAreas: NYCArea[] = [];
  
  if (preferences?.requirements && preferences.requirements.length > 0) {
    matchedAreas = findAreasByCharacteristics(
      preferences.requirements,
      possibleArea ? [possibleArea.name] : undefined
    );
  } 
  else if (preferences?.type) {
    const typeToCharacteristics: Record<string, string[]> = {
      'cafe': ['quiet', 'relaxed'], 'park': ['outdoor', 'nature'], 'restaurant': ['dining', 'food'],
      'bar': ['lively', 'nightlife'], 'shopping': ['shopping', 'busy'], 'museum': ['culture', 'quiet'],
      'art': ['culture', 'creative'], 'activity': ['interesting', 'popular'],
      'tourist_attraction': ['popular', 'must-see']
    };
    const characteristics = typeToCharacteristics[preferences.type] || ['interesting'];
    matchedAreas = findAreasByCharacteristics(
      characteristics,
      possibleArea ? [possibleArea.name] : undefined
    );
  }
  
  if (matchedAreas.length > 0) {
    matchedAreas = matchedAreas.slice(0, 3);
    for (const area of matchedAreas) {
      const activityLength = Math.min(1.5, availableHours / matchedAreas.length);
      let placeType = 'tourist_attraction';
      if (preferences.type === 'cafe' || preferences.type === 'restaurant' || 
          preferences.type === 'bar' || preferences.type === 'shop') {
        placeType = preferences.type;
      } else {
        if (dayPart === 'morning') placeType = 'cafe';
        else if (dayPart === 'afternoon') placeType = 'tourist_attraction';
        else if (dayPart === 'evening' || dayPart === 'night') placeType = 'bar';
      }
      results.push({
        activity: `Explore ${area.name}`,
        location: area.name,
        duration: Math.round(activityLength * 60),
        type: placeType,
        description: `Interesting area to explore. Known for ${area.popularFor.join(', ')}.`
      });
    }
  }
  
  if (results.length === 0) {
    results.push({
      activity: "See interesting sights",
      location: possibleArea ? possibleArea.name : "NYC",
      duration: Math.round(Math.min(2, availableHours) * 60),
      type: "tourist_attraction",
      description: "Explore interesting attractions and sights in the area."
    });
  }
  return results;
}

export async function registerRoutes(app: Express, planningService: ItineraryPlanningService, cityConfigService: CityConfigService) {
  // Health check routes
  app.get('/api/health', async (req, res, next) => {
    try {
      const { performHealthCheck, quickHealthCheck } = await import('./lib/healthCheck');
      
      // Use quick health check for basic requests
      const includeDebug = req.query.debug === 'true';
      const detailed = req.query.detailed === 'true';
      
      if (detailed || includeDebug) {
        // Comprehensive health check
        const healthStatus = await performHealthCheck(includeDebug);
        
        // Set appropriate HTTP status code
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(healthStatus);
      } else {
        // Quick health check for load balancers
        const quickStatus = await quickHealthCheck();
        const statusCode = quickStatus.status === 'ok' ? 200 : 503;
        
        res.status(statusCode).json(quickStatus);
      }
    } catch (error) {
      console.error('❌ [Health] Health check failed:', error);
      res.status(503).json({
        status: 'error',
        message: 'Health check service unavailable',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Liveness probe endpoint (always returns 200 if service is running)
  app.get('/api/health/live', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Readiness probe endpoint (checks if service is ready to handle requests)
  app.get('/api/health/ready', async (req, res, next) => {
    try {
      const { quickHealthCheck } = await import('./lib/healthCheck');
      const status = await quickHealthCheck();
      
      const statusCode = status.status === 'ok' ? 200 : 503;
      res.status(statusCode).json({
        ...status,
        ready: status.status === 'ok',
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  // const httpServer = createServer(app); // httpServer is created in index.ts now
  // const planningService = new ItineraryPlanningService(storage); // Service is now passed in
  const analytics = getAnalytics(storage);
  
  // Debug endpoint to clear in-memory storage (development only)
  app.post('/api/debug/clear-memory', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    // Clear the in-memory storage from storage.ts
    const { inMemoryStorage } = require('./storage');
    if (inMemoryStorage) {
      inMemoryStorage.places.clear();
      inMemoryStorage.itineraries.clear();
      inMemoryStorage.userItineraries.clear();
      inMemoryStorage.nextPlaceId = 1;
      inMemoryStorage.nextItineraryId = 1;
    }
    
    res.json({ message: 'Memory storage cleared' });
  });

  // Cache stats endpoint (development only)
  app.get("/api/debug/cache-stats", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    const stats = planningService.getCacheStats();
    res.json(stats);
  });

  // Performance metrics endpoint (development only)
  app.get("/api/debug/performance", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : undefined;
    const summary = performanceMonitor.getPerformanceSummary(timeRange);
    res.json(summary);
  });

  // Performance metrics for specific operation
  app.get("/api/debug/performance/:operation", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    const operation = req.params.operation;
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : undefined;
    const metrics = performanceMonitor.getOperationMetrics(operation, timeRange);
    res.json(metrics);
  });

  // Database optimization metrics endpoint (development only)
  app.get("/api/debug/db-performance", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : undefined;
    const performance = dbOptimizer.getQueryPerformance(timeRange);
    const recommendations = dbOptimizer.getOptimizationRecommendations();
    
    res.json({
      performance,
      recommendations
    });
  });

  // Analytics endpoint
  app.get("/api/analytics", rateLimiters.public, async (req: Request, res, next) => {
    try {
      const city = req.query.city as string | undefined;
      const data = await analytics.getDashboardData(city);
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch analytics',
        details: error.message 
      });
    }
  });
  
  // Weather test endpoint
  app.get("/api/weather/test", async (req: Request, res, next) => {
    try {
      const { testWeatherAPI } = await import('./lib/weatherService');
      const success = await testWeatherAPI();
      res.json({ success, message: success ? 'Weather API working' : 'Weather API failed, using fallback' });
    } catch (error: any) {
      res.json({ success: false, message: 'Weather API test failed', error: error.message });
    }
  });
  
  // Generic /api/plan route (defaults to London for backwards compatibility)
  app.post("/api/plan", planningRateLimiter, async (req: Request, res, next) => {
    try {
      console.log('📝 [/api/plan] Generic plan request received');
      console.log('Query:', req.body.query);
      console.log('Raw request body:', req.body);
      
      // Analyze query complexity
      const complexityAnalysis = analyzeQueryComplexity(req.body.query);
      console.log(`🔍 [Complexity] Query analysis:`, {
        level: complexityAnalysis.level,
        score: complexityAnalysis.score,
        estimatedTime: complexityAnalysis.recommendations.estimatedResponseTime,
        factors: complexityAnalysis.factors
      });
      
      const requestSchema = z.object({
        query: z.string(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        city: z.string().optional(), // Legacy support
        citySlug: z.string().optional(), // New parameter name
        tripDuration: z.number().optional().default(1)
      });

      const { query, date, startTime, city, citySlug, tripDuration } = requestSchema.parse(req.body);

      // Get city config - prefer citySlug over city
      const cityIdentifier = citySlug || city || 'london';
      console.log('🌍 [/api/plan] Parsed parameters:', { city, citySlug, cityIdentifier });
      let cityConfigInstance: CityConfig;
      try {
        cityConfigInstance = cityConfigService.getCityConfigWithDetails(cityIdentifier);
      } catch (error) {
        console.warn(`⚠️ [/api/plan] City '${cityIdentifier}' not found, defaulting to London`);
        cityConfigInstance = cityConfigService.getCityConfigWithDetails('london');
      }

      const planOptions: PlanRequestOptions = {
        query, date, startTime,
        userId: undefined, // Anonymous users don't have userId
        enableGapFilling: false, 
        citySlug: cityConfigInstance.slug,
        tripDuration
      };

      console.log('🚀 [/api/plan] Creating plan for', cityConfigInstance.name);
      const itinerary = await planningService.createPlan(planOptions, cityConfigInstance);
      
      // Transform the response to match frontend expectations
      let weatherData = null;
      if (process.env.WEATHER_API_KEY && itinerary.places && itinerary.places.length > 0) {
        try {
          const firstPlace = itinerary.places[0];
          if (firstPlace.location && firstPlace.location.lat && firstPlace.location.lng) {
            weatherData = await getWeatherForecast(firstPlace.location.lat, firstPlace.location.lng);
            console.log('🌤️ [/api/plan] Retrieved weather data for itinerary');
          }
        } catch (weatherError) {
          console.warn('⚠️ [/api/plan] Weather data retrieval failed:', weatherError);
        }
      }

      // Generate shareable URL
      const shareableUrl = `${req.protocol}://${req.get('host')}/${cityConfigInstance.slug}/itinerary/${itinerary.id}`;
      
      const transformedItinerary = {
        ...itinerary,
        shareableUrl,
        venues: (itinerary.places || []).map((place: any) => {
          const formattedTime = formatInTimeZone(new Date(place.scheduledTime), cityConfigInstance.timezone, 'h:mm a');
          
          // Check if venue is outdoor and add weather info
          const isOutdoor = place.details?.types ? isVenueOutdoor(place.details.types) : false;
          let venueWeather = null;
          
          if (weatherData && isOutdoor) {
            const venueTime = new Date(place.scheduledTime);
            const venueTimestamp = Math.floor(venueTime.getTime() / 1000);
            
            let closestForecast = weatherData.list[0];
            let minTimeDiff = Math.abs(venueTimestamp - closestForecast.dt);
            
            for (const forecast of weatherData.list) {
              const timeDiff = Math.abs(venueTimestamp - forecast.dt);
              if (timeDiff < minTimeDiff) {
                closestForecast = forecast;
                minTimeDiff = timeDiff;
              }
            }
            
            venueWeather = {
              main: closestForecast.main,
              weather: closestForecast.weather,
              dt: closestForecast.dt,
              isOutdoor: true,
              suitable: isWeatherSuitableForOutdoor(weatherData, venueTime)
            };
          }
          
          // Debug place details
          console.log(`🔍 [/api/plan] Place "${place.name}" details:`, {
            hasDetails: !!place.details,
            detailsKeys: place.details ? Object.keys(place.details) : [],
            rating: place.details?.rating,
            types: place.details?.types
          });
          
          // Process venue alternatives
          console.log(`🔍 [/api/plan] Processing alternatives for "${place.name}":`, {
            hasAlternatives: !!place.alternatives,
            alternativesCount: place.alternatives ? place.alternatives.length : 0,
            alternativesPreview: place.alternatives ? place.alternatives.slice(0, 2).map(a => ({ name: a.name, rating: a.rating })) : null
          });
          
          const alternatives = place.alternatives ? place.alternatives.slice(0, 3).map((alt: any) => ({
            name: alt.name,
            address: alt.formatted_address || alt.address,
            rating: alt.rating || 0,
            categories: alt.types || [],
            distance: alt.distance || null, // If available from search
            priceLevel: alt.price_level || null,
            reason: alt.reason || 'Alternative option' // Why this is suggested as alternative
          })) : [];

          return {
            name: place.name,
            time: formattedTime,
            address: place.address,
            rating: place.details?.rating || 0,
            categories: place.details?.types || [],
            weather: venueWeather,
            isOutdoor,
            location: place.location, // Include coordinates for map
            alternatives: alternatives, // Add venue alternatives
            hasAlternatives: alternatives.length > 0
          };
        }),
        travelInfo: (itinerary.travelTimes || []).map((travel: any, index: number) => {
          // Find the destination place name from the places array
          const places = itinerary.places || [];
          const destinationPlace = places[index + 1]; // Travel info corresponds to next place
          const destinationName = destinationPlace ? destinationPlace.name : '';
          
          return {
            duration: String(travel.durationMinutes || travel.duration || 0),
            destination: destinationName
          };
        }),
        city: cityConfigInstance.slug,
        timezone: cityConfigInstance.timezone,
        cityName: cityConfigInstance.name,
        // Add complexity analysis metadata
        meta: {
          complexity: {
            level: complexityAnalysis.level,
            score: complexityAnalysis.score,
            processingTime: complexityAnalysis.recommendations.estimatedResponseTime,
            simplificationSuggestions: complexityAnalysis.recommendations.suggestSimplification 
              ? generateSimplificationSuggestions(complexityAnalysis)
              : []
          }
        }
      };
      
      // Track analytics
      analytics.trackQuery(query, city);
      transformedItinerary.venues?.forEach(venue => {
        analytics.trackVenueSelection(
          venue.placeId || '',
          venue.name,
          venue.categories?.[0] || 'general',
          city,
          venue.rating
        );
      });
      
      console.log('📤 [/api/plan] Sending response with', transformedItinerary.venues?.length || 0, 'venues');
      res.json(transformedItinerary);

    } catch (error: any) {
      console.error('❌ [/api/plan] Error in route handler:', error);
      next(error); 
    }
  });
  
  // NEW City-specific plan route (NO AUTH)
  app.post("/api/:city/plan", 
    planningRateLimiter,
    // validateCitySlugParams, // This can be handled by getCityConfigWithDetails which throws
    // attachCityConfig,     // Middleware will use getCityConfigWithDetails
    async (req: Request, res, next) => { 
    try {
      const citySlug = req.params.city;
      let cityConfigInstance: CityConfig;
      try {
        // Use CityConfigService to get config with detailed areas loaded
        cityConfigInstance = cityConfigService.getCityConfigWithDetails(citySlug);
      } catch (error) {
        // If getCityConfigWithDetails throws (e.g., NotFoundError), pass to error handler
        return next(error);
      }
      // Attach to request for any subsequent middleware/handlers if they expect it, though we use it directly here
      // req.cityConfig = cityConfigInstance; 

      console.log('📝 [/:city/plan] City-specific plan request for:', cityConfigInstance.name);
      console.log('Query:', req.body.query);
      
      // Analyze query complexity
      const complexityAnalysis = analyzeQueryComplexity(req.body.query);
      console.log(`🔍 [Complexity] Query analysis for ${cityConfigInstance.name}:`, {
        level: complexityAnalysis.level,
        score: complexityAnalysis.score,
        estimatedTime: complexityAnalysis.recommendations.estimatedResponseTime,
        factors: complexityAnalysis.factors
      });
      
      const requestSchema = z.object({
        query: z.string(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        tripDuration: z.number().optional().default(1)
      });

      const { query, date, startTime, tripDuration } = requestSchema.parse(req.body);

      const planOptions: PlanRequestOptions = {
        query, date, startTime,
        userId: undefined, // Anonymous users don't have userId
        enableGapFilling: false, 
        citySlug,
        tripDuration
      };

      console.log('🚀 [/:city/plan] Creating city-aware plan for', cityConfigInstance.name);
      const itinerary = await planningService.createPlan(planOptions, cityConfigInstance);
      
      // Transform the response to match frontend expectations and add weather data
      let weatherData = null;
      if (process.env.WEATHER_API_KEY && itinerary.places && itinerary.places.length > 0) {
        try {
          // Get weather for the first venue's location
          const firstPlace = itinerary.places[0];
          if (firstPlace.location && firstPlace.location.lat && firstPlace.location.lng) {
            weatherData = await getWeatherForecast(firstPlace.location.lat, firstPlace.location.lng);
            console.log('🌤️ [/:city/plan] Retrieved weather data for itinerary');
          }
        } catch (weatherError) {
          console.warn('⚠️ [/:city/plan] Weather data retrieval failed:', weatherError);
        }
      }

      // Generate shareable URL
      const shareableUrl = `${req.protocol}://${req.get('host')}/${citySlug}/itinerary/${itinerary.id}`;
      
      const transformedItinerary = {
        ...itinerary,
        shareableUrl,
        venues: (itinerary.places || []).map((place: any) => {
          console.log('🕒 [/:city/plan] Place scheduledTime:', place.scheduledTime);
          console.log('🌍 [/:city/plan] Using timezone:', cityConfigInstance.timezone);
          const formattedTime = formatInTimeZone(new Date(place.scheduledTime), cityConfigInstance.timezone, 'h:mm a');
          console.log('🕒 [/:city/plan] Formatted time:', formattedTime);
          
          // Check if venue is outdoor and add weather info
          const isOutdoor = place.details?.types ? isVenueOutdoor(place.details.types) : false;
          let venueWeather = null;
          
          if (weatherData && isOutdoor) {
            // Find weather forecast closest to venue time
            const venueTime = new Date(place.scheduledTime);
            const venueTimestamp = Math.floor(venueTime.getTime() / 1000);
            
            let closestForecast = weatherData.list[0];
            let minTimeDiff = Math.abs(venueTimestamp - closestForecast.dt);
            
            for (const forecast of weatherData.list) {
              const timeDiff = Math.abs(venueTimestamp - forecast.dt);
              if (timeDiff < minTimeDiff) {
                closestForecast = forecast;
                minTimeDiff = timeDiff;
              }
            }
            
            venueWeather = {
              main: closestForecast.main,
              weather: closestForecast.weather,
              dt: closestForecast.dt,
              isOutdoor: true,
              suitable: isWeatherSuitableForOutdoor(weatherData, venueTime)
            };
          }
          
          // Debug place details
          console.log(`🔍 [/:city/plan] Place "${place.name}" details:`, {
            hasDetails: !!place.details,
            detailsKeys: place.details ? Object.keys(place.details) : [],
            rating: place.details?.rating,
            types: place.details?.types,
            detailsRaw: JSON.stringify(place.details, null, 2),
            hasAlternatives: !!place.alternatives,
            alternativesCount: place.alternatives ? place.alternatives.length : 0,
            alternativesPreview: place.alternatives ? place.alternatives.slice(0, 2) : null
          });
          
          // Extract rating and categories from the Google Places details
          // If place.details is missing, check the alternatives array for the primary venue
          let rating = place.details?.rating || 0;
          let categories = place.details?.types || [];
          
          // If details are missing but we have alternatives, try to find the rating there
          if (rating === 0 && place.alternatives && Array.isArray(place.alternatives)) {
            // The primary venue might be in the alternatives array
            const primaryVenue = place.alternatives.find(alt => alt.name === place.name);
            if (primaryVenue && primaryVenue.rating) {
              rating = primaryVenue.rating;
              categories = primaryVenue.types || [];
              console.log(`🔄 [ROUTES] Recovered rating ${rating} for "${place.name}" from alternatives`);
            }
          }
          
          // Process venue alternatives
          console.log(`🔍 [/api/plan] Processing alternatives for "${place.name}":`, {
            hasAlternatives: !!place.alternatives,
            alternativesCount: place.alternatives ? place.alternatives.length : 0,
            alternativesPreview: place.alternatives ? place.alternatives.slice(0, 2).map(a => ({ name: a.name, rating: a.rating })) : null
          });
          
          const alternatives = place.alternatives ? place.alternatives.slice(0, 3).map((alt: any) => ({
            name: alt.name,
            address: alt.formatted_address || alt.address,
            rating: alt.rating || 0,
            categories: alt.types || [],
            distance: alt.distance || null, // If available from search
            priceLevel: alt.price_level || null,
            reason: alt.reason || 'Alternative option' // Why this is suggested as alternative
          })) : [];

          return {
            name: place.name,
            time: formattedTime, // Format the time for the city's timezone
            address: place.address,
            rating: rating,
            categories: categories,
            weather: venueWeather,
            isOutdoor,
            location: place.location, // Include coordinates for map
            alternatives: alternatives, // Add venue alternatives
            hasAlternatives: alternatives.length > 0
          };
        }),
        travelInfo: (itinerary.travelTimes || []).map((travel: any, index: number) => {
          // Find the destination place name from the places array
          const places = itinerary.places || [];
          const destinationPlace = places[index + 1]; // Travel info corresponds to next place
          const destinationName = destinationPlace ? destinationPlace.name : '';
          
          return {
            duration: String(travel.durationMinutes || travel.duration || 0),
            destination: destinationName
          };
        }),
        city: citySlug,
        timezone: cityConfigInstance.timezone,
        cityName: cityConfigInstance.name,
        // Add complexity analysis metadata
        meta: {
          complexity: {
            level: complexityAnalysis.level,
            score: complexityAnalysis.score,
            processingTime: complexityAnalysis.recommendations.estimatedResponseTime,
            simplificationSuggestions: complexityAnalysis.recommendations.suggestSimplification 
              ? generateSimplificationSuggestions(complexityAnalysis)
              : []
          }
        }
      };
      
      // Track analytics
      analytics.trackQuery(query, citySlug);
      transformedItinerary.venues?.forEach(venue => {
        analytics.trackVenueSelection(
          venue.placeId || '',
          venue.name,
          venue.categories?.[0] || 'general',
          citySlug,
          venue.rating
        );
      });
      // Track time preferences
      if (req.body.startTime) {
        const hour = parseInt(req.body.startTime.split(':')[0]);
        const dayOfWeek = date ? new Date(date).getDay() : new Date().getDay();
        analytics.trackTimePreference(hour, dayOfWeek);
      }
      
      console.log('📤 [/:city/plan] Sending response with', transformedItinerary.venues?.length || 0, 'venues');
      res.json(transformedItinerary);

    } catch (error: any) {
      console.error('❌ [/:city/plan] Error in route handler:', error);
      next(error); 
    }
  });

  // ADDED: Endpoint to get all city configurations
  app.get('/api/cities', (req, res) => {
    const cities = getAllCities();
    res.json(cities);
  });

  app.get("/api/itinerary/:id", async (req, res, next) => { // Added next for error handling consistency
    try {
      const id = parseInt(req.params.id);
      // NO AUTHENTICATION - Use static test user or undefined if your service handles it
      const userId = 'test-user-itinerary-view'; // Or simply pass undefined if service allows
      const itinerary = await planningService.getItineraryById(id, userId);
      if (!itinerary) {
        // Consider throwing NotFoundError from ./lib/errors here
        return res.status(404).json({ message: "Itinerary not found" });
      }
      
      // Determine timezone from itinerary's city or default to NYC for backwards compatibility
      let timezone = 'America/New_York'; // Default fallback
      try {
        if (itinerary.city) {
          const cityConfigInstance = cityConfigService.getCityConfigWithDetails(itinerary.city);
          timezone = cityConfigInstance.timezone;
        }
      } catch (error) {
        console.warn(`⚠️ [/itinerary/:id] Could not determine timezone for city '${itinerary.city}', using NYC timezone`);
      }
      
      // Transform the response to match frontend expectations
      const transformedItinerary = {
        ...itinerary,
        venues: (itinerary.places || []).map((place: any) => {
          console.log('🕒 [/itinerary/:id] Place scheduledTime:', place.scheduledTime);
          console.log('🌍 [/itinerary/:id] Using timezone:', timezone);
          const formattedTime = formatInTimeZone(new Date(place.scheduledTime), timezone, 'h:mm a');
          console.log('🕒 [/itinerary/:id] Formatted time:', formattedTime);
          return {
            name: place.name,
            time: formattedTime, // Format the time for display
            address: place.address,
            rating: place.details?.rating || 0,
            categories: place.details?.types || []
          };
        }),
        travelInfo: (itinerary.travelTimes || []).map((travel: any, index: number) => {
          // Find the destination place name from the places array
          const places = itinerary.places || [];
          const destinationPlace = places[index + 1]; // Travel info corresponds to next place
          const destinationName = destinationPlace ? destinationPlace.name : '';
          
          return {
            duration: String(travel.durationMinutes || travel.duration || 0),
            destination: destinationName
          };
        })
      };
      
      res.json(transformedItinerary);
    } catch (error: any) {
      next(error);
    }
  });

  app.get("/api/weather", async (req, res, next) => { // Added next
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Valid latitude and longitude are required" });
      }
      
      if (!process.env.WEATHER_API_KEY) {
        return res.status(503).json({ message: "Weather service is not configured" });
      }
      
      const forecast = await getWeatherForecast(lat, lng);
      res.json({
        current: forecast.current,
        hourly: forecast.hourly?.slice(0, 24),
        location: { lat, lng }
      });
    } catch (error: any) {
      // console.error("Weather API error:", error.message); // Global handler will log
      // Consider throwing new WeatherServiceError(message, cause) here
      next(error);
    }
  });
  
  app.get("/api/test-timezone", (req, res) => {
    const testTimes = [
      "3pm", "15:00", "morning", "noon", "evening", "at 6", "around 3 PM"
    ];
    const results = testTimes.map(timeStr => {
      const normalizedTime = parseAndNormalizeTime(timeStr);
      const isoTime = timeStringToNYCISOString(timeStr);
      const displayTime = formatISOToNYCTime(isoTime);
      return { original: timeStr, normalized: normalizedTime, iso: isoTime, display: displayTime };
    });
    res.status(200).json({
      message: "NYC timezone test results",
      currentNYCTime: formatInTimeZone(new Date(), NYC_TIMEZONE, 'yyyy-MM-dd h:mm:ss a zzz'),
      results
    });
  });

  // return httpServer; // httpServer is managed in index.ts
}