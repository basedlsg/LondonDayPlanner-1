// @ts-nocheck
import { z } from "zod";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { PlaceDetails } from "@shared/schema";
import { StructuredRequest } from "@shared/types";
import { nycAreas } from "../data/new-york-areas";
import { 
  findLocation, 
  parseActivity, 
  parseTimeExpression, 
  getDefaultTime,
  expandRelativeTime,
  LocationContext,
  ActivityContext 
} from "./languageProcessing";
import { getApiKey, isFeatureEnabled, validateApiKey } from "../config";
import { processWithGemini, StructuredRequest as GeminiStructuredRequest } from './geminiProcessor';
import { validateAndNormalizeLocation, processLocationWithAIAndMaps } from './mapGeocoding';
import { parseAndNormalizeTime } from './timeUtils';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { CityConfig } from "../config/cities"; // Corrected import path

// Configure Gemini model with safety settings
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

// Initialize AI lazily - moved to a function to avoid module load timing issues
function initializeAI() {
  // Check if AI processing is enabled (this will be called after config is loaded)
  console.log("🤖 [nlp-fixed] Checking AI_PROCESSING feature flag status:", isFeatureEnabled("AI_PROCESSING"));

  if (isFeatureEnabled("AI_PROCESSING")) {
    try {
      // Check if Gemini API key is valid
      const geminiApiKey = getApiKey("GEMINI_API_KEY");
      console.log("🔑 [nlp-fixed] GEMINI_API_KEY validation:", validateApiKey("GEMINI_API_KEY"));
      
      if (!geminiApiKey) {
        console.error("❌ [nlp-fixed] Gemini API Key is missing or empty");
        return false;
      } else if (!validateApiKey("GEMINI_API_KEY")) {
        console.error("❌ [nlp-fixed] Gemini API Key failed validation pattern");
        return false;
      } else {
        console.log("✅ [nlp-fixed] Initializing Gemini API with valid API key");
        
        // Initialize Google Generative AI with centralized config
        genAI = new GoogleGenerativeAI(geminiApiKey);
        
        // Configure Gemini model with safety settings
        model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro-latest",
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        });
        
        console.log("✅ [nlp-fixed] Gemini API successfully initialized");
        return true;
      }
    } catch (err) {
      console.error("❌ [nlp-fixed] Failed to initialize Gemini API:", err);
      // Leave genAI and model as null to trigger fallback handling
      return false;
    }
  }
  
  console.log("⚠️ [nlp-fixed] AI_PROCESSING feature disabled, skipping AI initialization");
  return false;
}

// Using the imported StructuredRequest interface from shared/types.ts

// Define fixed time entry type for use in parsing
type FixedTimeEntry = {
  location: string;
  time: string;
  type?: string;
  // Additional search parameters for richer venue search
  searchTerm?: string;
  keywords?: string[];
  minRating?: number;
  displayTime?: string; // New property for formatted display time in NYC timezone
  searchPreference?: string; // Specific user preference for the venue (e.g., "sandwich place")
};

/**
 * Helper function to correctly convert a time string into timezone-aware values
 * 
 * @param timeString Time string in 24-hour format (HH:MM)
 * @param timezone The timezone to use (e.g., 'America/New_York', 'America/Chicago')
 * @returns Object containing the ISO timestamp and formatted display time
 */
function convertTimeStringToTimezone(timeString: string, timezone: string, dateStr?: string): { isoTimestamp: string, displayTime: string } {
  const timeZone = timezone;
  
  // Get today's date components IN the target timezone to avoid DST issues at midnight
  const nowInTargetTz = toZonedTime(new Date(), timeZone);
  const year = nowInTargetTz.getFullYear();
  const month = String(nowInTargetTz.getMonth() + 1).padStart(2, '0');
  const day = String(nowInTargetTz.getDate()).padStart(2, '0');
  
  // Construct the date string *representing the intended time in the target timezone*
  const dateTimeStringInTargetTz = `${year}-${month}-${day}T${timeString}:00`;
  
  // Parse this string *as if it's in the target timezone* and get the correct UTC Date object
  const utcDate = fromZonedTime(dateTimeStringInTargetTz, timeZone);
  
  // Generate the correct ISO string representing this moment in UTC
  const correctIsoTimestamp = utcDate.toISOString();
  
  // Generate the correct display string by formatting the UTC time *back* to target timezone
  const correctDisplayTime = formatInTimeZone(utcDate, timeZone, 'p'); // 'p' = 'h:mm aa' format
  
  // Add this log for verification:
  console.log(`Correctly interpreted time "${timeString}" as ${timeZone} time: ${correctDisplayTime} (${correctIsoTimestamp})`);
  
  return { isoTimestamp: correctIsoTimestamp, displayTime: correctDisplayTime };
}

/**
 * Convert Gemini structured request to the application's expected format
 */
function convertGeminiToAppFormat(geminiResult: GeminiStructuredRequest | null, dateStr?: string, cityConfig?: any): StructuredRequest | null {
  console.log("Converting Gemini result to app format:", JSON.stringify(geminiResult, null, 2));
  if (!geminiResult) return null;
  
  const appFormatRequest: StructuredRequest = {
    startLocation: geminiResult.startLocation || null, // Keep null if Gemini doesn't provide
    destinations: [],
    fixedTimes: [],
    preferences: {
      type: undefined, // Ensure undefined for string | undefined type
      requirements: []
    }
  };
  
  // Inspect the venuePreference data in the Gemini response
  if (geminiResult.fixedTimeEntries && geminiResult.fixedTimeEntries.length > 0) {
    geminiResult.fixedTimeEntries.forEach(entry => {
      if (entry.searchParameters?.venuePreference) {
        console.log(`Found raw venuePreference in Gemini fixed time entry: "${entry.searchParameters.venuePreference}" for activity "${entry.activity}"`);
      }
    });
  }
  
  // Create a map to track unique activities by location and similar activity text
  // This will help us avoid duplicates from both fixedTimeEntries and flexibleTimeEntries
  const activityMap = new Map<string, FixedTimeEntry>();
  
  // Helper function to determine the most specific activity type
  const determineActivityType = (activityText: string): string => {
    const activityLower = activityText.toLowerCase();
    if (activityLower.includes('museum') || activityLower.includes('gallery')) return "museum";
    if (activityLower.includes('lunch') || activityLower.includes('dinner') || activityLower.includes('breakfast') || activityLower.includes('brunch') || activityLower.includes('restaurant')) return "restaurant";
    if (activityLower.includes('coffee') || activityLower.includes('cafe') || activityLower.includes('work')) return "cafe";
    if (activityLower.includes('bar') || activityLower.includes('drinks') || activityLower.includes('cocktail') || activityLower.includes('lounge')) return "bar";
    if (activityLower.includes('park') || activityLower.includes('garden') || activityLower.includes('walk')) return "park";
    if (activityLower.includes('shop') || activityLower.includes('store')) return "shopping_mall";
    if (activityLower.includes('meeting') || activityLower.includes('appointment')) return "skip"; // Special marker for meetings
    return "attraction";
  };
  
  // Helper function to create a unique key for an activity at a location
  const createActivityKey = (location: string, activityText: string, time?: string): string => {
    return `${location.toLowerCase()}|${determineActivityType(activityText.toLowerCase())}|${time || 'no-time'}`;
  };
  
  // Process time blocks first (extended activities like "work from 10 AM - 3 PM")
  if (geminiResult.timeBlocks && Array.isArray(geminiResult.timeBlocks)) {
    console.log("Raw time blocks from Gemini:", JSON.stringify(geminiResult.timeBlocks, null, 2));
    
    for (const block of geminiResult.timeBlocks) {
      if (block && typeof block === 'object' && block.location && block.startTime) {
        // Convert start time
        const originalStartTime = block.startTime;
        const normalizedStartTime = parseAndNormalizeTime(block.startTime);
        const timezone = (cityConfig && cityConfig.timezone) || 'America/New_York';
        const { isoTimestamp: startIso, displayTime: startDisplay } = convertTimeStringToTimezone(normalizedStartTime, timezone, dateStr);
        
        console.log(`Time block: ${block.activity} from ${startDisplay} in ${block.location}`);
        
        // Add as a fixed time entry with special venue requirements
        const activityKey = createActivityKey(block.location, block.activity, startIso);
        activityMap.set(activityKey, {
          location: block.location,
          time: startIso,
          type: 'cafe', // Default to cafe for work sessions
          searchTerm: block.activity,
          keywords: block.venueRequirements || block.searchParameters?.specificRequirements || [],
          minRating: 4.0,
          displayTime: startDisplay,
          searchPreference: 'quiet workspace' // Default for work blocks
        });
      }
    }
  }
  
  // Process fixed appointments (meetings, reservations with specific times)
  if (geminiResult.fixedAppointments && Array.isArray(geminiResult.fixedAppointments)) {
    console.log("Raw fixed appointments from Gemini:", JSON.stringify(geminiResult.fixedAppointments, null, 2));
    
    for (const appt of geminiResult.fixedAppointments) {
      if (appt && typeof appt === 'object' && appt.location && appt.time) {
        // Convert appointment time
        const normalizedTime = parseAndNormalizeTime(appt.time);
        const timezone = (cityConfig && cityConfig.timezone) || 'America/New_York';
        const { isoTimestamp, displayTime } = convertTimeStringToTimezone(normalizedTime, timezone, dateStr);
        
        console.log(`Fixed appointment: ${appt.activity} at ${displayTime} in ${appt.location}`);
        
        // Add as a fixed time entry but mark as appointment (no venue search needed)
        const activityKey = createActivityKey(appt.location, appt.activity, isoTimestamp);
        activityMap.set(activityKey, {
          location: appt.location,
          time: isoTimestamp,
          type: 'skip', // Skip venue search for appointments
          searchTerm: appt.activity,
          displayTime: displayTime,
        });
      }
    }
  }
  
  // Process fixed time entries if present
  if (geminiResult.fixedTimeEntries && Array.isArray(geminiResult.fixedTimeEntries)) {
    console.log("Raw fixed time entries from Gemini:", JSON.stringify(geminiResult.fixedTimeEntries, null, 2));
    for (const entry of geminiResult.fixedTimeEntries) {
      if (entry && typeof entry === 'object' && entry.location && entry.time) {
        // Parse time expressions using our enhanced timeUtils
        let timeValue = entry.time;
        let displayTime = '';
        
        // Process time values with our improved parser
        if (typeof timeValue === 'string') {
          // Parse times like "noon", "around 3 PM", etc.
          const originalTime = timeValue;
          timeValue = parseAndNormalizeTime(timeValue);
          console.log(`Fixed time entry: Normalized time from "${originalTime}" to "${timeValue}"`);
          
          // Convert the normalized time string (HH:MM) to timezone-aware values
          const timezone = (cityConfig && cityConfig.timezone) || 'America/New_York';
          const { isoTimestamp, displayTime: formattedTime } = convertTimeStringToTimezone(timeValue, timezone, dateStr);
          
          // Store the ISO timestamp for backend processing
          timeValue = isoTimestamp;
          displayTime = formattedTime;
          
          console.log(`Correctly interpreted time "${originalTime}" as ${(cityConfig && cityConfig.name) || 'city'} time: ${displayTime} (${timeValue})`);
        }
        
        // Determine the most appropriate activity type
        const activityType = entry.searchParameters?.venueType || determineActivityType(entry.activity);
        
        // Create a key for this activity
        const activityKey = createActivityKey(entry.location, entry.activity, timeValue);
        
        // Safely access venuePreference, assuming it might be in searchParameters
        const searchPreference = entry.searchParameters?.venuePreference || (entry as any).venuePreference;
        if (searchPreference) {
            console.log(`Found venue preference: "${searchPreference}" for activity: ${entry.activity}`);
        }
        
        // Store in our map, potentially overwriting less specific entries
        activityMap.set(activityKey, {
          location: entry.location,
          time: timeValue,
          type: activityType,
          searchTerm: entry.activity,
          keywords: entry.searchParameters?.specificRequirements || undefined,
          minRating: 4.0, // Default to high quality
          displayTime: displayTime, // Add the display time for the frontend
          searchPreference: searchPreference // Add user's specific venue preference
        });
        
        console.log(`Processed fixed time entry: ${entry.activity} at ${entry.location}, time: ${timeValue}, type: ${activityType}`);
      }
    }
  }
  
  // Process flexible time entries - THIS IS THE KEY FIX for the correct timezone handling
  if (geminiResult.flexibleTimeEntries && Array.isArray(geminiResult.flexibleTimeEntries)) {
    console.log("Raw flexible time entries from Gemini:", JSON.stringify(geminiResult.flexibleTimeEntries, null, 2));
    
    for (const entry of geminiResult.flexibleTimeEntries) {
      if (entry && typeof entry === 'object' && entry.location) {
        // Convert time formats
        let timeValue = entry.time || "12:00";
        let displayTime = '';
        
        // Handle time periods using the timeUtils functions
        if (typeof timeValue === 'string') {
          // This will handle "morning", "afternoon", "evening", "night"
          // as well as "around noon", "around 3 PM", etc.
          const originalTime = timeValue;
          timeValue = parseAndNormalizeTime(timeValue);
          console.log(`Normalized time from "${originalTime}" to "${timeValue}"`);
          
          // Convert the normalized time string (HH:MM) to timezone-aware values
          const timezone = (cityConfig && cityConfig.timezone) || 'America/New_York';
          const { isoTimestamp, displayTime: formattedTime } = convertTimeStringToTimezone(timeValue, timezone, dateStr);
          
          // Store the ISO timestamp for backend processing
          timeValue = isoTimestamp;
          displayTime = formattedTime;
          
          console.log(`Correctly interpreted time "${originalTime}" as ${(cityConfig && cityConfig.name) || 'city'} time: ${displayTime} (${timeValue})`);
        }
        
        // Determine the most appropriate activity type
        const activityType = determineActivityType(entry.activity);
        
        // Create a key for this activity
        const activityKey = createActivityKey(entry.location, entry.activity, timeValue);
        
        // Safely access venuePreference, assuming it might be in searchParameters
        const searchPreference = entry.searchParameters?.venuePreference || (entry as any).venuePreference;
        if (searchPreference) {
            console.log(`Found venue preference (flexible): "${searchPreference}" for activity: ${entry.activity}`);
        }
        
        // Only add if we don't already have this activity, or if we're adding a more specific type
        if (!activityMap.has(activityKey)) {
          activityMap.set(activityKey, {
            location: entry.location,
            time: timeValue,
            type: activityType,
            searchTerm: entry.activity,
            minRating: 4.0, // Default to high quality
            displayTime: displayTime, // Add the display time for the frontend
            searchPreference: searchPreference // Add user's specific venue preference
          });
          
          console.log(`Processed flexible time entry: ${entry.activity} at ${entry.location}, time: ${timeValue}, type: ${activityType}`);
        }
      }
    }
  }
  
  // Convert our map of unique activities to the fixedTimes array
  appFormatRequest.fixedTimes = Array.from(activityMap.values());
  console.log(`Final de-duplicated activities count: ${appFormatRequest.fixedTimes.length}`);
  
  // If we have no start location but have activities, use the first activity location
  if (!appFormatRequest.startLocation && appFormatRequest.fixedTimes.length > 0) {
    appFormatRequest.startLocation = appFormatRequest.fixedTimes[0].location;
    console.log(`No startLocation provided, using first activity location: ${appFormatRequest.startLocation}`);
  }
  
  // Process other preferences if available
  if (geminiResult.preferences) {
    // Extract budget preferences if available
    if (geminiResult.preferences.budget) {
      appFormatRequest.preferences.type = geminiResult.preferences.budget;
    }
    
    // Extract requirements/restrictions if available
    if (Array.isArray(geminiResult.specialRequests)) {
      appFormatRequest.preferences.requirements = geminiResult.specialRequests;
    }
  }
  
  // Sort fixed times chronologically
  appFormatRequest.fixedTimes.sort((a, b) => {
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });
  
  // Create destinations array from fixed time locations
  const uniqueLocations = new Set<string>();
  // Get generic location exclusions based on city
  const genericLocations = cityConfig ? [cityConfig.name, cityConfig.slug.toUpperCase()] : ["New York", "NYC"];
  const defaultLocationName = (cityConfig && cityConfig.name && cityConfig.name.includes('York')) ? 'Midtown' : 'Downtown';
  genericLocations.push(defaultLocationName);
  
  appFormatRequest.fixedTimes.forEach(entry => {
    if (entry.location && !genericLocations.includes(entry.location)) uniqueLocations.add(entry.location);
  });
  
  appFormatRequest.destinations = Array.from(uniqueLocations);
  
  console.log("Converted app format request:", JSON.stringify(appFormatRequest, null, 2));
  return appFormatRequest;
}

// Get city-specific street patterns
function getCityStreetPatterns(citySlug?: string): RegExp {
  const streetPatterns: Record<string, string> = {
    nyc: 'wall\\s*st|fifth\\s*ave|5th\\s*avenue|broadway|times\\s*square|madison\\s*ave|lexington\\s*ave|park\\s*ave|canal\\s*st|mott\\s*st|mulberry\\s*st|bowery|houston\\s*st|bleecker\\s*st|christopher\\s*st|west\\s*4th|42nd\\s*st|34th\\s*st|14th\\s*st|grand\\s*st|delancey\\s*st',
    boston: 'newbury\\s*st|boylston\\s*st|commonwealth\\s*ave|charles\\s*st|beacon\\s*st|state\\s*st|congress\\s*st|atlantic\\s*ave|hanover\\s*st|cambridge\\s*st|tremont\\s*st',
    austin: '6th\\s*st|congress\\s*ave|guadalupe\\s*st|lamar\\s*blvd|south\\s*congress|rainey\\s*st|red\\s*river|cesar\\s*chavez|barton\\s*springs|4th\\s*st',
    london: 'oxford\\s*st|regent\\s*st|bond\\s*st|piccadilly|strand|fleet\\s*st|kings\\s*rd|portobello\\s*rd|brick\\s*ln|shoreditch\\s*high\\s*st'
  };
  
  const pattern = streetPatterns[citySlug || 'nyc'] || streetPatterns.nyc;
  return new RegExp(`\\b(${pattern})\\b`, 'i');
}

// Extract locations with confidence scores
function extractLocations(text: string, citySlug?: string): LocationContext[] {
  const locations: LocationContext[] = [];

  // Split text into potential location phrases
  const phrases = text.split(/[,.]|\s+(?:then|and|to|at)\s+/);

  for (const phrase of phrases) {
    // Look for common street name patterns based on city
    const streetPattern = getCityStreetPatterns(citySlug);
    const streetMatch = phrase.match(streetPattern);
    if (streetMatch?.[1]) {
      const streetName = streetMatch[1].trim();
      console.log(`Found street reference: "${streetName}"`);
      
      // Map common street abbreviations to full names
      const normalizedStreet = streetName.toLowerCase()
        .replace(/wall\s*st/, "Wall Street")
        .replace(/5th\s*ave/, "Fifth Avenue")
        .replace(/fifth\s*ave/, "Fifth Avenue")
        .replace(/madison\s*ave/, "Madison Avenue")
        .replace(/lexington\s*ave/, "Lexington Avenue")
        .replace(/park\s*ave/, "Park Avenue")
        .replace(/canal\s*st/, "Canal Street")
        .replace(/mott\s*st/, "Mott Street")
        .replace(/mulberry\s*st/, "Mulberry Street")
        .replace(/houston\s*st/, "Houston Street")
        .replace(/bleecker\s*st/, "Bleecker Street")
        .replace(/christopher\s*st/, "Christopher Street")
        .replace(/west\s*4th/, "West 4th Street")
        .replace(/42nd\s*st/, "42nd Street")
        .replace(/34th\s*st/, "34th Street")
        .replace(/14th\s*st/, "14th Street")
        .replace(/grand\s*st/, "Grand Street")
        .replace(/delancey\s*st/, "Delancey Street");
      
      locations.push({
        name: normalizedStreet,
        confidence: 0.9,
        type: "street"
      });
      continue;
    }
    
    // Look for location indicators with prepositions (in, at, near, from)
    const locationMatch = phrase.match(/(?:in|at|near|from)\s+([A-Z][a-zA-Z\s]+)/);
    if (locationMatch?.[1]) {
      const location = findLocation(locationMatch[1]);
      if (location) {
        locations.push(location);
      }
    }
  }

  return locations;
}

// Extract activities with their context
function extractActivities(text: string): ActivityContext[] {
  const activities: ActivityContext[] = [];

  // Split text into activity segments - expanded to catch more transition words
  const segments = text.split(/[,.]|\s+(?:then|and|afterwards|later|after that|following that|next)\s+/);

  for (const segment of segments) {
    // Expanded regex to capture more vague activity indicators
    if (segment.match(/(?:want|like|need|do|have|get|see|visit|explore|enjoy|experience|something|activity)\s+(.+)/) ||
        segment.match(/(?:around|at|by|from|until|before|after)\s+\d{1,2}(?::\d{2})?(?:\s*[ap]m)?/) || // Time indicators
        segment.match(/(?:in the|during the|for)\s+(?:morning|afternoon|evening|night)/)) { // Period indicators
      const activity = parseActivity(segment);
      activities.push(activity);
    }
  }

  return activities;
}

/**
 * Parse a natural language itinerary request into structured data
 * 
 * @param query User's natural language request
 * @param cityConfig Optional city configuration for context-aware parsing
 * @returns StructuredRequest object with parsed locations, activities and preferences
 */
export async function parseItineraryRequest(query: string, cityConfig?: CityConfig, dateStr?: string, startTime?: string): Promise<StructuredRequest> {
  const defaultStartLocation = cityConfig ? `${cityConfig.defaultLocation.lat},${cityConfig.defaultLocation.lng}` : "Midtown";
  
  const fallbackStructure: StructuredRequest = {
    startLocation: defaultStartLocation,
    destinations: extractLocations(query, cityConfig?.slug).map(loc => loc.name), // Pass city slug for city-aware extraction
    fixedTimes: [], // Simplified for brevity, populate as needed
    preferences: { type: undefined, requirements: [] } // Ensure type is undefined
  };

  if (cityConfig) console.log(`[NLP] Processing query with context for city: ${cityConfig.name}`);

  try {
    // Initialize AI lazily if not already done
    if (!model && isFeatureEnabled("AI_PROCESSING")) {
      console.log("🔄 [nlp-fixed] Attempting lazy AI initialization for new Gemini processor...");
      initializeAI();
    }
    
    // First attempt: Use the new Gemini processor
    console.log("🚀 [nlp-fixed] Attempting to process query with new Gemini processor");
    console.log("🚀 [nlp-fixed] Query:", query);
    console.log("🚀 [nlp-fixed] CityContext:", cityConfig ? { name: cityConfig.name, slug: cityConfig.slug, timezone: cityConfig.timezone } : undefined);
    const cityContextForGemini = cityConfig ? { name: cityConfig.name, slug: cityConfig.slug, timezone: cityConfig.timezone } : undefined;
    
    let rawGeminiResult;
    try {
      rawGeminiResult = await processWithGemini(query, dateStr, startTime, cityContextForGemini);
      console.log("✅ [nlp-fixed] processWithGemini completed successfully, result:", rawGeminiResult ? "VALID" : "NULL");
    } catch (error) {
      console.error("❌ [nlp-fixed] processWithGemini threw error:", error);
      throw error;
    }
    
    if (rawGeminiResult) {
      console.log("Successfully processed query with new Gemini processor");
      console.log("Raw Gemini API response:", JSON.stringify(rawGeminiResult, null, 2));
      
      // Convert from Gemini processor format to application format
      const geminiResult = convertGeminiToAppFormat(rawGeminiResult, dateStr, cityConfig);
      
      if (geminiResult) {
        // We don't need to process flexible time entries here again.
        // The convertGeminiToAppFormat function we just updated already 
        // handles both fixedTimeEntries and flexibleTimeEntries with proper de-duplication.
        console.log("Using optimized Gemini result that was converted by convertGeminiToAppFormat function");
        console.log(`Gemini result contains ${geminiResult.fixedTimes.length} de-duplicated activities`);
        
        // Sort fixed times chronologically if they exist
        if (geminiResult.fixedTimes) {
          geminiResult.fixedTimes.sort((a, b) => {
            if (!a.time) return -1;
            if (!b.time) return 1;
            return a.time.localeCompare(b.time);
          });
        }
        
        // Apply location validation and normalization when possible
        try {
          // Using imported functions directly
          for (const destination of geminiResult.destinations) {
            const cityContextForValidation = cityConfig ? { name: cityConfig.name } : undefined;
            const validatedLocation = await validateAndNormalizeLocation(destination, cityContextForValidation);
            // If validation succeeds, replace the original location with the validated one
            if (validatedLocation) {
              console.log(`Validated "${destination}" as neighborhood: "${validatedLocation}"`);
              // Update it in-place
              const index = geminiResult.destinations.indexOf(destination);
              if (index !== -1) {
                geminiResult.destinations[index] = validatedLocation;
              }
            }
          }
          
          // Validate fixed time locations
          if (geminiResult.fixedTimes) {
            for (const fixedTime of geminiResult.fixedTimes) {
              if (fixedTime.location) {
                // Try more advanced mapping with AI first if it's a vague location
                if (fixedTime.location.toLowerCase() === 'central manhattan' || 
                    fixedTime.location.toLowerCase() === 'central nyc' || 
                    fixedTime.location.toLowerCase() === 'central new york') {
                  
                  const cityContextForEnhancement = cityConfig ? { name: cityConfig.name } : undefined;
                  const enhancedLocation = await processLocationWithAIAndMaps(fixedTime.location, fixedTime.searchTerm, cityContextForEnhancement);
                  if (enhancedLocation && enhancedLocation !== cityConfig?.name) {
                    fixedTime.location = enhancedLocation;
                    console.log(`Enhanced fixed time location from generic to "${enhancedLocation}"`);
                  }
                } else if (fixedTime.location) {
                  const cityContextForValidation = cityConfig ? { name: cityConfig.name } : undefined;
                  const validatedLocation = await validateAndNormalizeLocation(fixedTime.location, cityContextForValidation);
                  if (validatedLocation) {
                    fixedTime.location = validatedLocation;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn("Location enhancement skipped due to error:", error);
        }
        
        // Debug the final processed output
        console.log("Final processed Gemini result:", JSON.stringify(geminiResult, null, 2));
        return geminiResult;
      }
    }
    
    // If the new Gemini processor isn't available or fails, fall back to the original method
    console.log("New Gemini processor unavailable or failed, falling back to original method");
    
    // Initialize AI lazily if not already done
    if (!model && isFeatureEnabled("AI_PROCESSING")) {
      console.log("🔄 [nlp-fixed] Attempting lazy AI initialization...");
      initializeAI();
    }
    
    // Skip Gemini processing if the feature is disabled or model initialization failed
    if (!isFeatureEnabled("AI_PROCESSING") || !model) {
      console.log("⚠️ [nlp-fixed] AI processing skipped - using basic fallback structure");
      console.log("⚠️ [nlp-fixed] AI_PROCESSING enabled:", isFeatureEnabled("AI_PROCESSING"), "Model available:", !!model);
      fallbackStructure.startLocation = defaultStartLocation; // Ensure fallback uses city default
      // ... (validate locations in fallbackStructure using cityConfig context if possible) ...
      return fallbackStructure;
    }

    // If Gemini result is used, ensure its locations are also contextualized or validated with cityConfig if needed.
    const geminiResultToReturn = convertGeminiToAppFormat(rawGeminiResult, undefined, cityConfig);
    if (geminiResultToReturn) {
      if (!geminiResultToReturn.startLocation) geminiResultToReturn.startLocation = defaultStartLocation;
      // TODO: Further refine geminiResultToReturn using cityConfig if needed.
      return geminiResultToReturn;
    }

    return fallbackStructure; // Final fallback

  } catch (error) {
    console.error("Error during NLP processing:", error);
    fallbackStructure.startLocation = defaultStartLocation; // Ensure fallback uses city default on error
    return fallbackStructure;
  }
}

// Re-export everything from this file
export * from './nlp';