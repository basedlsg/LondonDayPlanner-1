import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { searchPlace } from "./lib/googlePlaces";
import { calculateTravelTime } from "./lib/itinerary";
import { StructuredRequest } from "@shared/types";
import { insertPlaceSchema, insertItinerarySchema, Place, PlaceDetails } from "@shared/schema";
import { z } from "zod";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { findAreasByCharacteristics, findQuietAreas, getAreaCrowdLevel, NYCArea, nycAreas } from "./data/new-york-areas";
import { getWeatherForecast, isVenueOutdoor, isWeatherSuitableForOutdoor, getWeatherAwareVenue } from "./lib/weatherService";

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

export async function registerRoutes(app: Express, planningService: ItineraryPlanningService) {
  // const httpServer = createServer(app); // httpServer is created in index.ts now
  // const planningService = new ItineraryPlanningService(storage); // Service is now passed in
  
  app.post("/api/plan", async (req, res, next) => {
    try {
      const requestSchema = z.object({
        query: z.string(),
        date: z.string().optional(),
        startTime: z.string().optional()
      });

      const { query, date, startTime } = requestSchema.parse(req.body);

      // DEVELOPMENT BYPASS: Mock user session for testing
      let userId = req.session?.userId;
      
      if (!userId && process.env.NODE_ENV === 'development') {
        console.log('🔓 Development mode: Bypassing auth, using mock user ID for /api/plan');
        userId = 'dev-user-123'; // Mock user ID for development
        
        // Optionally set it in session for consistency if session object exists
        if (req.session) {
          req.session.userId = userId;
              } else {
          // If no session object exists at all (e.g. session middleware issue or first request)
          // This bypass won't be able to set req.session.userId, but userId variable will be set.
          console.warn('🔓 Development mode bypass: req.session object not found. userId will be mocked locally for this request only.');
        }
      }

      // Check authentication (but allow development bypass)
      if (!userId) {
        // This will now only trigger if not in development or if session init failed AND dev bypass didn't set userId
        return res.status(401).json({ message: 'Authentication required' });
      }

      const planOptions: PlanRequestOptions = {
        query,
        date,
        startTime,
        userId, // This will be the mock userId in development if original was missing
        enableGapFilling: false
      };

      const itinerary = await planningService.createPlan(planOptions);
      res.json(itinerary);

    } catch (error: any) {
      next(error);
    }
  });

  app.get("/api/itinerary/:id", async (req, res, next) => { // Added next for error handling consistency
    try {
    const id = parseInt(req.params.id);
      const itinerary = await planningService.getItineraryById(id, req.session.userId);
    if (!itinerary) {
        // Consider throwing NotFoundError from ./lib/errors here
        return res.status(404).json({ message: "Itinerary not found" });
      }
      res.json(itinerary);
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