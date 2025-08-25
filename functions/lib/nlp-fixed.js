"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseItineraryRequest = parseItineraryRequest;
const generative_ai_1 = require("@google/generative-ai");
const languageProcessing_1 = require("./languageProcessing");
const config_1 = require("../config");
const geminiProcessor_1 = require("./geminiProcessor");
const mapGeocoding_1 = require("./mapGeocoding");
const timeUtils_1 = require("./timeUtils");
const date_fns_tz_1 = require("date-fns-tz");
// Configure Gemini model with safety settings
let genAI = null;
let model = null;
// Initialize AI only if API key is available
// Check if AI processing is enabled
console.log("AI_PROCESSING feature flag status:", (0, config_1.isFeatureEnabled)("AI_PROCESSING"));
if ((0, config_1.isFeatureEnabled)("AI_PROCESSING")) {
    try {
        // Check if Gemini API key is valid
        const geminiApiKey = (0, config_1.getApiKey)("GEMINI_API_KEY");
        console.log("GEMINI_API_KEY validation:", (0, config_1.validateApiKey)("GEMINI_API_KEY"));
        if (!geminiApiKey) {
            console.error("Gemini API Key is missing or empty");
        }
        else if (!(0, config_1.validateApiKey)("GEMINI_API_KEY")) {
            console.error("Gemini API Key failed validation pattern");
        }
        else {
            console.log("Initializing Gemini API with valid API key");
            // Initialize Google Generative AI with centralized config
            genAI = new generative_ai_1.GoogleGenerativeAI(geminiApiKey);
            // Configure Gemini model with safety settings
            model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro-latest",
                safetySettings: [
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                ],
            });
            console.log("Gemini API successfully initialized");
        }
    }
    catch (err) {
        console.error("Failed to initialize Gemini API:", err);
        // Leave genAI and model as null to trigger fallback handling
    }
}
/**
 * Helper function to correctly convert a time string into NYC timezone-aware values
 *
 * @param timeString Time string in 24-hour format (HH:MM)
 * @returns Object containing the ISO timestamp and formatted display time
 */
function convertTimeStringToNYC(timeString) {
    const timeZone = 'America/New_York';
    const [hours, minutes] = timeString.split(':').map(Number);
    // Get current date in NYC time zone to ensure proper DST handling
    const now = new Date();
    const nycTime = (0, date_fns_tz_1.toZonedTime)(now, timeZone);
    // Extract date components from NYC time
    const year = nycTime.getFullYear();
    const month = nycTime.getMonth(); // 0-indexed in JavaScript
    const day = nycTime.getDate();
    // Create a new date with the parsed time components but NYC date
    const localDate = new Date(year, month, day, hours, minutes);
    // Calculate UTC equivalent by accounting for timezone offset
    const utcDate = new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
    // Format for output
    const isoTimestamp = utcDate.toISOString();
    const displayTime = (0, date_fns_tz_1.formatInTimeZone)(localDate, timeZone, 'h:mm a');
    return { isoTimestamp, displayTime };
}
/**
 * Convert Gemini structured request to the application's expected format
 */
function convertGeminiToAppFormat(geminiResult) {
    var _a, _b, _c, _d, _e, _f;
    console.log("Converting Gemini result to app format:", JSON.stringify(geminiResult, null, 2));
    if (!geminiResult) {
        return null;
    }
    // Initialize the result structure
    const appFormatRequest = {
        startLocation: geminiResult.startLocation || "Midtown", // Default to Midtown Manhattan
        destinations: [],
        fixedTimes: [],
        preferences: {
            type: undefined,
            requirements: []
        }
    };
    // Inspect the venuePreference data in the Gemini response
    if (geminiResult.fixedTimeEntries && geminiResult.fixedTimeEntries.length > 0) {
        geminiResult.fixedTimeEntries.forEach(entry => {
            var _a;
            if ((_a = entry.searchParameters) === null || _a === void 0 ? void 0 : _a.venuePreference) {
                console.log(`Found raw venuePreference in Gemini fixed time entry: "${entry.searchParameters.venuePreference}" for activity "${entry.activity}"`);
            }
        });
    }
    // Create a map to track unique activities by location and similar activity text
    // This will help us avoid duplicates from both fixedTimeEntries and flexibleTimeEntries
    const activityMap = new Map();
    // Helper function to determine the most specific activity type
    const determineActivityType = (activityText) => {
        const activityLower = activityText.toLowerCase();
        if (activityLower.includes('museum') || activityLower.includes('gallery') || activityLower.includes('exhibition')) {
            return "museum";
        }
        else if (activityLower.includes('lunch') || activityLower.includes('dinner') ||
            activityLower.includes('breakfast') || activityLower.includes('eat') ||
            activityLower.includes('restaurant') || activityLower.includes('food')) {
            return "restaurant";
        }
        else if (activityLower.includes('coffee') || activityLower.includes('cafe')) {
            return "cafe";
        }
        else if (activityLower.includes('park') || activityLower.includes('garden')) {
            return "park";
        }
        else if (activityLower.includes('shop') || activityLower.includes('store') || activityLower.includes('mall')) {
            return "shopping_mall";
        }
        else {
            return "attraction";
        }
    };
    // Helper function to create a unique key for an activity at a location
    const createActivityKey = (location, activityText) => {
        // Normalize the location and activity text to avoid case-sensitive duplicates
        const normalizedLocation = location.toLowerCase();
        const normalizedActivity = activityText.toLowerCase();
        return `${normalizedLocation}|${determineActivityType(normalizedActivity)}`;
    };
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
                    timeValue = (0, timeUtils_1.parseAndNormalizeTime)(timeValue);
                    console.log(`Fixed time entry: Normalized time from "${originalTime}" to "${timeValue}"`);
                    // Convert the normalized time string (HH:MM) to NYC timezone-aware values
                    const { isoTimestamp, displayTime: formattedTime } = convertTimeStringToNYC(timeValue);
                    // Store the ISO timestamp for backend processing
                    timeValue = isoTimestamp;
                    displayTime = formattedTime;
                    console.log(`Correctly interpreted time "${originalTime}" as NYC time: ${displayTime} (${timeValue})`);
                }
                // Determine the most appropriate activity type
                const activityType = ((_a = entry.searchParameters) === null || _a === void 0 ? void 0 : _a.venueType) || determineActivityType(entry.activity);
                // Create a key for this activity
                const activityKey = createActivityKey(entry.location, entry.activity);
                // Check if there's a specific search preference from multiple possible locations
                let searchPreference = undefined;
                // First check for the venue preference at the top level of the Gemini response object
                // Then check for the entry-specific venuePreference field directly
                if ((_b = entry.searchParameters) === null || _b === void 0 ? void 0 : _b.venuePreference) {
                    searchPreference = entry.searchParameters.venuePreference;
                    console.log(`Found entry-level venue preference: "${searchPreference}" for activity: ${entry.activity}`);
                }
                // Then check if searchParameters.venuePreference exists
                else if ((_c = entry.searchParameters) === null || _c === void 0 ? void 0 : _c.venuePreference) {
                    searchPreference = entry.searchParameters.venuePreference;
                    console.log(`Found venue preference in searchParameters: "${searchPreference}" for activity: ${entry.activity}`);
                }
                // Log whether we found a preference or not, for debugging
                if (!searchPreference) {
                    console.log(`No venue preference found in Gemini data for activity: ${entry.activity}`);
                }
                // Store in our map, potentially overwriting less specific entries
                activityMap.set(activityKey, {
                    location: entry.location,
                    time: timeValue,
                    type: activityType,
                    searchTerm: entry.activity,
                    keywords: ((_d = entry.searchParameters) === null || _d === void 0 ? void 0 : _d.specificRequirements) || undefined,
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
                    timeValue = (0, timeUtils_1.parseAndNormalizeTime)(timeValue);
                    console.log(`Normalized time from "${originalTime}" to "${timeValue}"`);
                    // Convert the normalized time string (HH:MM) to NYC timezone-aware values
                    const { isoTimestamp, displayTime: formattedTime } = convertTimeStringToNYC(timeValue);
                    // Store the ISO timestamp for backend processing
                    timeValue = isoTimestamp;
                    displayTime = formattedTime;
                    console.log(`Correctly interpreted time "${originalTime}" as NYC time: ${displayTime} (${timeValue})`);
                }
                // Determine the most appropriate activity type
                const activityType = determineActivityType(entry.activity);
                // Create a key for this activity
                const activityKey = createActivityKey(entry.location, entry.activity);
                // Check if there's a specific search preference from multiple possible locations
                let searchPreference = undefined;
                // First check for the venue preference at the top level of the Gemini response object
                // Then check for the entry-specific venuePreference field directly
                if ((_e = entry.searchParameters) === null || _e === void 0 ? void 0 : _e.venuePreference) {
                    searchPreference = entry.searchParameters.venuePreference;
                    console.log(`Found entry-level venue preference (flexible): "${searchPreference}" for activity: ${entry.activity}`);
                }
                // Then check if searchParameters.venuePreference exists
                else if ((_f = entry.searchParameters) === null || _f === void 0 ? void 0 : _f.venuePreference) {
                    searchPreference = entry.searchParameters.venuePreference;
                    console.log(`Found venue preference in searchParameters (flexible): "${searchPreference}" for activity: ${entry.activity}`);
                }
                // Log whether we found a preference or not, for debugging
                if (!searchPreference) {
                    console.log(`No venue preference found in Gemini data for flexible activity: ${entry.activity}`);
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
        if (!a.time)
            return -1;
        if (!b.time)
            return 1;
        return a.time.localeCompare(b.time);
    });
    // Create destinations array from fixed time locations
    const uniqueLocations = new Set();
    appFormatRequest.fixedTimes.forEach(entry => {
        if (entry.location && entry.location !== "New York" && entry.location !== "NYC" && entry.location !== "Midtown") {
            uniqueLocations.add(entry.location);
        }
    });
    appFormatRequest.destinations = Array.from(uniqueLocations);
    console.log("Converted app format request:", JSON.stringify(appFormatRequest, null, 2));
    return appFormatRequest;
}
// Extract locations with confidence scores
function extractLocations(text) {
    const locations = [];
    // Split text into potential location phrases
    const phrases = text.split(/[,.]|\s+(?:then|and|to|at)\s+/);
    for (const phrase of phrases) {
        // Look for common NYC street name patterns like "Wall St" or "5th Ave"
        const streetMatch = phrase.match(/\b(wall\s*st|fifth\s*ave|5th\s*avenue|broadway|times\s*square|madison\s*ave|lexington\s*ave|park\s*ave|canal\s*st|mott\s*st|mulberry\s*st|bowery|houston\s*st|bleecker\s*st|christopher\s*st|west\s*4th|42nd\s*st|34th\s*st|14th\s*st|canal\s*st|grand\s*st|delancey\s*st)\b/i);
        if (streetMatch === null || streetMatch === void 0 ? void 0 : streetMatch[1]) {
            const streetName = streetMatch[1].trim();
            console.log(`Found NYC street reference: "${streetName}"`);
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
        if (locationMatch === null || locationMatch === void 0 ? void 0 : locationMatch[1]) {
            const location = (0, languageProcessing_1.findLocation)(locationMatch[1]);
            if (location) {
                locations.push(location);
            }
        }
    }
    return locations;
}
// Extract activities with their context
function extractActivities(text) {
    const activities = [];
    // Split text into activity segments - expanded to catch more transition words
    const segments = text.split(/[,.]|\s+(?:then|and|afterwards|later|after that|following that|next)\s+/);
    for (const segment of segments) {
        // Expanded regex to capture more vague activity indicators
        if (segment.match(/(?:want|like|need|do|have|get|see|visit|explore|enjoy|experience|something|activity)\s+(.+)/) ||
            segment.match(/(?:around|at|by|from|until|before|after)\s+\d{1,2}(?::\d{2})?(?:\s*[ap]m)?/) || // Time indicators
            segment.match(/(?:in the|during the|for)\s+(?:morning|afternoon|evening|night)/)) { // Period indicators
            const activity = (0, languageProcessing_1.parseActivity)(segment);
            activities.push(activity);
        }
    }
    return activities;
}
/**
 * Parse a natural language itinerary request into structured data
 *
 * @param query User's natural language request
 * @returns StructuredRequest object with parsed locations, activities and preferences
 */
async function parseItineraryRequest(query, city) {
    // We've already imported processWithGemini from './geminiProcessor'
    var _a;
    // Initialize basic fallback structure with direct extraction methods
    const extractedLocations = extractLocations(query);
    const extractedActivities = extractActivities(query);
    // Extract time from the query directly for 6PM, 9AM style inputs
    const timeRegex = /(\d{1,2})\s*(am|pm)/i;
    const timeMatch = query.match(timeRegex);
    let timeFromQuery = null;
    if (timeMatch) {
        const [_, hour, meridian] = timeMatch;
        const parsedHour = parseInt(hour);
        const hourIn24 = meridian.toLowerCase() === 'pm' && parsedHour < 12 ? parsedHour + 12 : parsedHour;
        timeFromQuery = `${hourIn24.toString().padStart(2, '0')}:00`;
    }
    // Create fallback structure that will be used if AI processing fails
    const fallbackStructure = {
        startLocation: null,
        destinations: extractedLocations.map(loc => loc.name),
        fixedTimes: extractedActivities.length > 0 ?
            extractedActivities.map(activity => {
                var _a, _b;
                const location = ((_a = extractedLocations[0]) === null || _a === void 0 ? void 0 : _a.name) || "Midtown";
                // Try to extract time from the query directly if it's a simple time reference
                const time = timeFromQuery || ((_b = activity.timeContext) === null || _b === void 0 ? void 0 : _b.preferredTime) ||
                    (activity.type === 'breakfast' ? '09:00' :
                        activity.type === 'lunch' ? '13:00' :
                            activity.type === 'dinner' ? '19:00' : '12:00');
                return {
                    location,
                    time,
                    type: activity.venueType || activity.type,
                    searchTerm: activity.naturalDescription
                };
            }) :
            // If no activities extracted but we found a time, create an entry with that time
            timeFromQuery ? [{
                    location: ((_a = extractedLocations[0]) === null || _a === void 0 ? void 0 : _a.name) || "Midtown",
                    time: timeFromQuery,
                    type: 'activity',
                    searchTerm: query
                }] : [],
        preferences: {
            type: undefined,
            requirements: []
        }
    };
    try {
        // First attempt: Use the new Gemini processor
        console.log("Attempting to process query with new Gemini processor");
        const rawGeminiResult = await (0, geminiProcessor_1.processWithGemini)(query, city);
        if (rawGeminiResult) {
            console.log("Successfully processed query with new Gemini processor");
            console.log("Raw Gemini API response:", JSON.stringify(rawGeminiResult, null, 2));
            // Convert from Gemini processor format to application format
            const geminiResult = convertGeminiToAppFormat(rawGeminiResult);
            if (geminiResult) {
                // We don't need to process flexible time entries here again.
                // The convertGeminiToAppFormat function we just updated already 
                // handles both fixedTimeEntries and flexibleTimeEntries with proper de-duplication.
                console.log("Using optimized Gemini result that was converted by convertGeminiToAppFormat function");
                console.log(`Gemini result contains ${geminiResult.fixedTimes.length} de-duplicated activities`);
                // Sort fixed times chronologically if they exist
                if (geminiResult.fixedTimes) {
                    geminiResult.fixedTimes.sort((a, b) => {
                        if (!a.time)
                            return -1;
                        if (!b.time)
                            return 1;
                        return a.time.localeCompare(b.time);
                    });
                }
                // Apply location validation and normalization when possible
                try {
                    // Using imported functions directly
                    for (const destination of geminiResult.destinations) {
                        const validatedLocation = await (0, mapGeocoding_1.validateAndNormalizeLocation)(destination);
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
                                    const enhancedLocation = await (0, mapGeocoding_1.processLocationWithAIAndMaps)(fixedTime.location, fixedTime.searchTerm);
                                    if (enhancedLocation && enhancedLocation !== "New York" && enhancedLocation !== "NYC" && enhancedLocation !== "Midtown") {
                                        fixedTime.location = enhancedLocation;
                                        console.log(`Enhanced fixed time location from generic to "${enhancedLocation}"`);
                                    }
                                }
                                else if (fixedTime.location) {
                                    const validatedLocation = await (0, mapGeocoding_1.validateAndNormalizeLocation)(fixedTime.location);
                                    if (validatedLocation) {
                                        fixedTime.location = validatedLocation;
                                    }
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.warn("Location enhancement skipped due to error:", error);
                }
                // Debug the final processed output
                console.log("Final processed Gemini result:", JSON.stringify(geminiResult, null, 2));
                return geminiResult;
            }
        }
        // If the new Gemini processor isn't available or fails, fall back to the original method
        console.log("New Gemini processor unavailable or failed, falling back to original method");
        // Skip Gemini processing if the feature is disabled or model initialization failed
        if (!(0, config_1.isFeatureEnabled)("AI_PROCESSING") || !model) {
            console.log("AI processing skipped - using basic fallback structure");
            // Even though we're using the fallback structure, let's improve it with Google Maps verification
            // This will help improve the location data quality even without Gemini
            for (let i = 0; i < fallbackStructure.destinations.length; i++) {
                const destination = fallbackStructure.destinations[i];
                const validated = await (0, mapGeocoding_1.validateAndNormalizeLocation)(destination);
                if (validated) {
                    fallbackStructure.destinations[i] = validated;
                }
            }
            // Also validate fixed time locations
            for (const fixedTime of fallbackStructure.fixedTimes) {
                const validated = await (0, mapGeocoding_1.validateAndNormalizeLocation)(fixedTime.location);
                if (validated) {
                    fixedTime.location = validated;
                }
            }
            return fallbackStructure;
        }
        // Still here? Use the fallback structure
        return fallbackStructure;
    }
    catch (error) {
        console.error("Error during NLP processing:", error);
        return fallbackStructure;
    }
}
// Re-export everything from this file
__exportStar(require("./nlp"), exports);
