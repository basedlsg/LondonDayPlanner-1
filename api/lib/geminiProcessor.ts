// @ts-nocheck
/**
 * Gemini Natural Language Processing
 * 
 * This module implements a robust, error-tolerant processing system using
 * Google's Gemini AI models to understand and structure itinerary requests.
 */

import { z } from 'zod';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logAiInteraction, generateSessionId } from './aiLogging';
import { getApiKey, isFeatureEnabled } from '../config';

// Define time block schema for extended activities
const TimeBlockSchema = z.object({
  startTime: z.string().describe("Start time in 24-hour format (e.g., '10:00')"),
  endTime: z.string().describe("End time in 24-hour format (e.g., '15:00')"),
  activity: z.string().describe("The activity during this time block"),
  location: z.string().describe("The location for this time block"),
  venue: z.string().optional().describe("A specific venue name if mentioned"),
  venueRequirements: z.array(z.string()).optional().describe("Requirements for the venue (e.g., 'quiet', 'good wifi', 'suitable for calls')"),
  searchParameters: z.object({
    venueType: z.string().optional().nullable().describe("Type of venue needed for this time block"),
    specificRequirements: z.array(z.string()).optional().nullable().describe("Must-have features for the venue"),
    ambience: z.string().optional().nullable().describe("Preferred atmosphere (e.g., 'quiet', 'lively')"),
  }).optional()
});

// Define fixed appointment schema for non-negotiable commitments
const FixedAppointmentSchema = z.object({
  time: z.string().describe("The exact time for this appointment in 24-hour format"),
  duration: z.number().optional().describe("Duration in minutes (default: 60)"),
  activity: z.string().describe("The appointment description"),
  location: z.string().describe("The specific location"),
  bufferBefore: z.number().optional().describe("Minutes of buffer time needed before (e.g., for travel)"),
  bufferAfter: z.number().optional().describe("Minutes of buffer time needed after"),
  isFixed: z.boolean().default(true).describe("Indicates this cannot be moved")
});

// Enhanced fixed time entry schema
const FixedTimeEntrySchema = z.object({
  time: z.string().describe("The time for this activity (e.g., '9:00', '15:30')"),
  activity: z.string().describe("The activity description"),
  location: z.string().describe("The specific location or area in the city"),
  venue: z.string().optional().describe("A specific venue name if mentioned"),
  // Also extract venue preference directly from the schema for simpler access
  venuePreference: z.string().optional().describe("EXTRACT THIS FROM THE QUERY: Specific venue type preference (e.g., 'authentic Jewish deli', 'hipster coffee shop', 'traditional Italian restaurant')"),
  venueRequirements: z.array(z.string()).optional().describe("Specific requirements (e.g., 'quiet', 'good coffee', 'non-crowded', 'outdoor seating')"),
  searchParameters: z.object({
    cuisine: z.string().optional().nullable().describe("Type of cuisine if food-related"),
    priceLevel: z.enum(["budget", "moderate", "expensive"]).optional().nullable().describe("Price level preference"),
    ambience: z.string().optional().nullable().describe("Preferred ambience/vibe"),
    venueType: z.string().optional().nullable().describe("Type of venue (pub, restaurant, etc.)"),
    specificRequirements: z.array(z.string()).optional().nullable().describe("Any specific requirements"),
    venuePreference: z.string().optional().nullable().describe("DUPLICATE THIS FROM venuePreference FIELD ABOVE: Specific venue preference (e.g., 'sandwich place', 'sports bar')"),
  }).optional().describe("IMPORTANT: Use venuePreference for specific venue types like 'hipster coffee shop' or 'authentic Jewish deli'")
});

// Define flexible time entry schema - this is for less specific time periods
const FlexibleTimeEntrySchema = z.object({
  time: z.string().describe("The time period for this activity (e.g., 'morning', 'afternoon')"),
  activity: z.string().describe("The activity description"),
  location: z.string().describe("The specific location or area in the city"),
  venue: z.string().optional().describe("A specific venue name if mentioned"),
  day: z.string().optional().describe("The day for this activity if different from the main date"),
  venueRequirements: z.array(z.string()).optional().describe("Specific requirements for the venue"),
  searchParameters: z.object({
    cuisine: z.string().optional().nullable().describe("Type of cuisine if food-related"),
    priceLevel: z.enum(["budget", "moderate", "expensive"]).optional().nullable().describe("Price level preference"),
    venueType: z.string().optional().nullable().describe("Type of venue (pub, restaurant, etc.)"),
    specificRequirements: z.array(z.string()).optional().nullable().describe("Any specific requirements"),
    venuePreference: z.string().optional().nullable().describe("Specific venue preference (e.g., 'sandwich place', 'sports bar')"),
  }).optional().describe("IMPORTANT: Use venuePreference for specific venue types like 'hipster art gallery' or 'authentic Jewish deli'")
});

const StructuredRequestSchema = z.object({
  date: z.string().optional().describe("The date for the itinerary"),
  startLocation: z.string().optional().describe("Where the day starts"),
  endLocation: z.string().optional().describe("Where the day ends"),
  timeBlocks: z.array(TimeBlockSchema).optional().describe("Extended time blocks (e.g., 'work from 10 AM - 3 PM')"),
  fixedAppointments: z.array(FixedAppointmentSchema).optional().describe("Non-negotiable appointments with specific times"),
  fixedTimeEntries: z.array(FixedTimeEntrySchema).describe("Activities with specific times"),
  flexibleTimeEntries: z.array(FlexibleTimeEntrySchema).optional().describe("Activities with flexible time periods"),
  preferences: z.object({
    cuisine: z.array(z.string()).optional().describe("Preferred cuisines"),
    budget: z.enum(["budget", "moderate", "expensive"]).optional().describe("Overall budget level"),
    pace: z.enum(["relaxed", "moderate", "busy"]).optional().describe("Preferred pace of the day"),
    interests: z.array(z.string()).optional().describe("General interests"),
    accessibility: z.array(z.string()).optional().describe("Accessibility requirements"),
    transportMode: z.array(z.enum(["walking", "tube", "bus", "taxi"])).optional().describe("Preferred transport modes"),
  }).optional(),
  travelGroup: z.object({
    adults: z.number().optional().describe("Number of adults"),
    children: z.number().optional().describe("Number of children"),
    seniors: z.number().optional().describe("Number of seniors"),
  }).optional(),
  specialRequests: z.array(z.string()).optional().describe("Any special requests or considerations"),
});

export type TimeBlock = z.infer<typeof TimeBlockSchema>;
export type FixedAppointment = z.infer<typeof FixedAppointmentSchema>;
export type FixedTimeEntry = z.infer<typeof FixedTimeEntrySchema>;
export type FlexibleTimeEntry = z.infer<typeof FlexibleTimeEntrySchema>;
export type StructuredRequest = z.infer<typeof StructuredRequestSchema>;

/**
 * Clean null values from Gemini response to match schema expectations
 */
function cleanNullValues(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanNullValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null) {
        cleaned[key] = cleanNullValues(value);
      } else {
        // Convert nulls to appropriate defaults based on field name
        if (key === 'venuePreference') cleaned[key] = undefined;
        else if (key === 'cuisine') cleaned[key] = undefined;
        else if (key === 'priceLevel') cleaned[key] = undefined;
        else if (key === 'budget') cleaned[key] = 'moderate';
        else if (key === 'adults') cleaned[key] = 1;
        else if (key === 'children') cleaned[key] = 0;
        else if (key === 'specificRequirements') cleaned[key] = [];
        // Skip other null values
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Process a user query using Gemini's natural language understanding
 */
export async function processWithGemini(query: string, dateStr?: string, startTime?: string, cityContext?: { name: string; slug: string; timezone?: string }): Promise<StructuredRequest | null> {
  // Generate session ID for tracking all attempts in this processing chain
  const sessionId = generateSessionId();
  
  // Check if Gemini feature is enabled
  if (!isFeatureEnabled('USE_GEMINI')) {
    await logAiInteraction({
      sessionId,
      userQuery: query,
      modelName: 'gemini-1.5-pro',
      status: 'warning',
      errorDetails: 'Gemini processing disabled by feature flag'
    });
    return null;
  }
  
  // Check API key
  const apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    await logAiInteraction({
      sessionId,
      userQuery: query,
      modelName: 'gemini-1.5-pro',
      status: 'error',
      errorDetails: 'Missing Gemini API key'
    });
    throw new Error('Missing Gemini API key');
  }
  
  // Try multiple attempts with increasing temperatures for more flexibility
  const temperatures = [0.2, 0.4, 0.7];
  let lastError = null;
  
  for (const temperature of temperatures) {
    try {
      const result = await attemptGeminiProcessing(query, temperature, sessionId, dateStr, startTime, cityContext);
      if (result) return result;
    } catch (error) {
      lastError = error;
      console.error(`Gemini processing attempt failed at temperature ${temperature}:`, error);
      // Continue to next temperature
    }
  }
  
  // All attempts failed
  await logAiInteraction({
    sessionId,
    userQuery: query,
    modelName: 'gemini-1.5-pro',
    status: 'error',
    errorDetails: lastError ? String(lastError) : 'All processing attempts failed'
  });
  
  return null;
}

/**
 * Single attempt at processing with Gemini at a specific temperature
 */
async function attemptGeminiProcessing(query: string, temperature: number, sessionId?: string, dateStr?: string, startTime?: string, cityContext?: { name: string; slug: string; timezone?: string }): Promise<StructuredRequest | null> {
  const processingStartTime = Date.now();
  const apiKey = getApiKey('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('Missing Gemini API key');
  }
  
  const sessionIdForLogging = sessionId || generateSessionId();
  const genAI = new GoogleGenerativeAI(apiKey);
  // The newest Gemini model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
  
  try {
    // Determine city context
    const cityName = cityContext?.name || 'New York City';
    const citySlug = cityContext?.slug || 'nyc';
    
    // City-specific location examples
    const locationExamples: Record<string, string> = {
      'nyc': '"SoHo", "Greenwich Village", "Upper East Side", "Midtown"',
      'boston': '"Back Bay", "North End", "Cambridge", "Beacon Hill", "South End"',
      'austin': '"Downtown", "South Congress", "East 6th", "Rainey Street", "Domain", "Barton Springs", "4th Street"',
      'london': '"Shoreditch", "Notting Hill", "Covent Garden", "Camden"'
    };
    
    const landmarks: Record<string, string> = {
      'nyc': 'MoMA, Met, Natural History Museum',
      'boston': 'Freedom Trail, Museum of Fine Arts, Boston Common',
      'austin': 'State Capitol, Zilker Park, 6th Street',
      'london': 'British Museum, Tower of London, Hyde Park'
    };
    
    const defaultLocation: Record<string, string> = {
      'nyc': 'Midtown',
      'boston': 'Downtown',
      'austin': 'Downtown',
      'london': 'Central London'
    };
    
    // Prepare the prompt with schema details and examples
    const prompt = `
    You are an expert travel planning assistant for ${cityName}. Extract structured information from this itinerary request with extreme attention to detail.
    
    CRITICAL PARSING RULES:
    
    1. JSON FORMAT: Return ONLY valid JSON matching the schema - no markdown, no extra text
    
    2. TIME EXTRACTION:
       - Use 24-hour format (e.g., "09:00", "15:30")
       - "at 6" without context = "18:00" (assume evening for dinner/drinks)
       - "at 6" with morning context = "06:00"
       - Default meal times: breakfast="09:00", lunch="12:00", dinner="19:00"
       - "morning"="09:00", "afternoon"="14:00", "evening"="18:00", "night"="21:00"
       - "early morning"="07:00", "late morning"="11:00", "late afternoon"="16:00"
       - "sunset" = "18:30", "sunrise" = "06:30"
       - RELATIVE TIME HANDLING (CRITICAL):
         * "in X hours" = add X hours to the start time or previous activity time
         * "X hours later" = add X hours to the previous activity time
         * Example: If start is 10:00, "in 1 hour" = "11:00", "in 3 hours" = "13:00"
         * Example: If last activity is 12:00, "2 hours later" = "14:00"
       - REVERSE PLANNING (CRITICAL):
         * "before that" = calculate earlier time from the reference activity
         * "end with X at Y time" = X happens at Y time, earlier activities before
         * "working backwards from X" = X is the last/latest activity
         * Example: "meeting at 3 PM, lunch before that" = lunch at 12:00-13:00
         * Example: "flight at 8 PM, dinner before" = dinner at 18:00-19:00
         * ALWAYS include ALL mentioned activities, even reference points like meetings/flights
    
    3. TIME BLOCKS & APPOINTMENTS - NEW CRITICAL PARSING:
       - TIME BLOCKS: "work from X to Y", "spend X hours at", "need X hours for"
         * Example: "work from 10 AM to 3 PM" → timeBlocks entry with startTime: "10:00", endTime: "15:00"
         * Example: "need a quiet place to work for 5 hours" → timeBlocks entry with duration reflected in end time
         * Extract venue requirements: "quiet", "good wifi", "suitable for calls"
       - FIXED APPOINTMENTS: "meeting at X", "appointment at Y", "reservation at Z"
         * Example: "meeting in Mayfair at 5" → fixedAppointments entry with time: "17:00", location: "Mayfair"
         * Add buffers: meeting = 30 min before, dinner = 15 min before
       - REGULAR ACTIVITIES: Everything else goes in fixedTimeEntries
    
    4. ACTIVITY SEQUENCE - CRITICAL:
       - Preserve the EXACT order mentioned by the user
       - "then", "after that", "after", "followed by", "next", "afterwards" indicate sequence
       - Count ALL activities mentioned (coffee, lunch, drinks, etc.)
       - If no times given, space activities 1.5-2 hours apart
       - Parse compound sentences carefully: "I have a meeting... and would like to go to a restaurant" = 2 activities
    
    5. VENUE PREFERENCES - CRITICAL:
       - ALWAYS extract venue descriptors to venuePreference field
       - SPECIFIC FOOD MENTIONS must be captured exactly:
         * "fish and chips" → venuePreference: "fish and chips restaurant"
         * "pizza" → venuePreference: "pizza restaurant"
         * "sushi" → venuePreference: "sushi restaurant"
         * "tacos" → venuePreference: "taco restaurant"
         * "burgers" → venuePreference: "burger restaurant"
         * "chinese food" → venuePreference: "chinese restaurant"
         * "italian" → venuePreference: "italian restaurant"
         * "breakfast tacos" → venuePreference: "breakfast taco restaurant"
       - STYLE DESCRIPTORS:
         * "hipster cafe" → venuePreference: "hipster cafe"
         * "authentic Jewish deli" → venuePreference: "authentic Jewish deli"
         * "trendy brunch spot" → venuePreference: "trendy brunch spot"
         * "hole-in-the-wall" → venuePreference: "hole-in-the-wall"
         * "michelin star" → venuePreference: "michelin star restaurant"
         * "rooftop bar" → venuePreference: "rooftop bar"
         * "sports bar" → venuePreference: "sports bar"
         * "family-friendly" → venuePreference: "family-friendly restaurant"
       - REQUIREMENTS (NOT preferences):
         * "outdoor seating" → specificRequirements: ["outdoor seating"]
         * "with a view" → specificRequirements: ["with a view"]
         * "good wifi" → specificRequirements: ["wifi"]
    
    6. LOCATION INTELLIGENCE - CRITICAL:
       - PRESERVE ALL LOCATION MENTIONS from the user's query!
       - Common ${cityName} locations: ${locationExamples[citySlug] || locationExamples['nyc']}
       - If user mentions a specific place (e.g., "Barton Springs", "4th st"), USE IT EXACTLY
       - LANDMARK RECOGNITION (CRITICAL):
         * Famous landmarks MUST be preserved exactly as mentioned
         * ${cityName} landmarks include: ${landmarks[citySlug] || landmarks['nyc']}
         * "Big Ben" → location: "Big Ben", type: "tourist_attraction"
         * "Tower of London" → location: "Tower of London", type: "tourist_attraction"  
         * "Statue of Liberty" → location: "Statue of Liberty", type: "tourist_attraction"
         * For "lunch near [landmark]" → location: "[landmark area]" (e.g., "Tower Bridge area")
         * NEVER change landmark names to generic locations
       - "that famous museum" → Try to infer (${landmarks[citySlug] || landmarks['nyc']})
       - "nearby" → Use previous activity's location
       - "somewhere nice" or generic location → "${defaultLocation[citySlug] || 'Downtown'}"
       - No location → "${defaultLocation[citySlug] || 'Downtown'}"
       - NEVER replace specific location mentions with generic ones
    
    6. SPECIAL REQUIREMENTS:
       - Budget mentions: "cheap"/"budget" → budget: "budget", "upscale"/"fancy" → budget: "expensive"
       - Group size: "family", "group of X" → travelGroup numbers
       - Dietary: "kosher", "vegan", "halal" → specificRequirements
       - Accessibility: "wheelchair", "accessible" → accessibility requirements
       - Weather: "if nice weather" → note in specialRequests
    
    7. ACTIVITY TYPES:
       - Meals: breakfast/brunch/lunch/dinner → restaurant
       - Coffee/work at cafe → cafe
       - Drinks/cocktails/lounge → bar (NOT attraction)
       - Shopping → shopping
       - Museums/galleries → museum
       - Parks/outdoor/walk → park
       - Shows/entertainment → entertainment
       - Meeting/appointment → MUST include in fixedAppointments or fixedTimeEntries with type: "skip"
       - LANDMARKS (CRITICAL):
         * Famous landmarks → tourist_attraction
         * "visit [landmark]", "see [landmark]" → tourist_attraction
         * Activities near landmarks should reference the landmark in location
    
    8. EDGE CASES:
       - Conflicting requirements: Choose most logical interpretation
       - Vague queries: Make reasonable ${cityName}-appropriate suggestions
       - Multi-day: Note day changes in flexibleTimeEntries
    
    SCHEMA STRUCTURE:
    {
      "timeBlocks": [
        {
          "startTime": "10:00",
          "endTime": "15:00",
          "activity": "work session",
          "location": "Canary Wharf",
          "venueRequirements": ["quiet", "good wifi", "suitable for calls"],
          "searchParameters": {
            "venueType": "cafe",
            "specificRequirements": ["quiet", "wifi", "power outlets"],
            "ambience": "quiet"
          }
        }
      ],
      "fixedAppointments": [
        {
          "time": "17:00",
          "duration": 60,
          "activity": "meeting",
          "location": "Mayfair",
          "bufferBefore": 30,
          "bufferAfter": 15,
          "isFixed": true
        }
      ],
      "fixedTimeEntries": [
        {
          "time": "HH:MM",
          "activity": "Brief description",
          "location": "${cityName} location",
          "venuePreference": "specific venue type if mentioned",
          "venueRequirements": ["quiet", "non-crowded"],
          "searchParameters": {
            "venuePreference": "DUPLICATE venue preference here",
            "specificRequirements": ["array of requirements"],
            "cuisine": "if food related",
            "priceLevel": "budget/moderate/expensive"
          }
        }
      ],
      "flexibleTimeEntries": [...same structure...],
      "preferences": {
        "budget": "overall budget level",
        "pace": "relaxed/moderate/busy",
        "interests": ["user interests"]
      },
      "travelGroup": {
        "adults": number,
        "children": number
      },
      "specialRequests": ["any special notes"]
    }

    ${startTime ? `Start time: ${startTime}` : ''}
    ${dateStr ? `Date: ${dateStr}` : ''}
    
    IMPORTANT: Count ALL activities in this request and ensure each one appears in the output.
    
    Here's the request to analyze:
    ${query}
    
    CRITICAL REMINDER: Extract EVERY SINGLE activity mentioned above. Do not skip any activities even if there are many. Each distinct activity should have its own entry in fixedTimeEntries.
    `;
    
    // Send to Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 2048, // Increased for complex multi-step queries
      },
    });
    
    const response = result.response;
    const responseText = response.text();
    
    // Extract the JSON from the response
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                   responseText.match(/```\n([\s\S]*?)\n```/) ||
                   responseText.match(/\{[\s\S]*\}/);
                   
    let jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
    
    // Clean up any trailing commas which can break JSON parsing
    jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');
    
    try {
      const parsedData = JSON.parse(jsonText);
      
      // Clean null values before validation
      const cleanedData = cleanNullValues(parsedData);
      
      // Validate against our schema
      const validationResult = StructuredRequestSchema.safeParse(cleanedData);
      
      if (validationResult.success) {
        // Successfully validated
        const structuredData = validationResult.data;
        
        // Additional logging to see the raw response
        console.log(`Raw Gemini structured data:`, JSON.stringify(structuredData, null, 2));
        
        // Log the successful interaction
        await logAiInteraction({
          sessionId: sessionIdForLogging,
          userQuery: query,
          modelName: 'gemini-1.5-pro',
          rawRequest: { prompt, temperature },
          rawResponse: responseText,
          parsedResponse: structuredData,
          processingTimeMs: Date.now() - processingStartTime,
          status: 'success'
        });
        
        // Apply additional processing and return the structured data
        const citySlug = cityContext?.slug || 'london';
        return processGeminiResponse(query, structuredData, responseText, citySlug);
      } else {
        // Validation failed
        await logAiInteraction({
          sessionId: sessionIdForLogging,
          userQuery: query,
          modelName: 'gemini-1.5-pro',
          rawRequest: { prompt, temperature },
          rawResponse: responseText,
          status: 'error',
          processingTimeMs: Date.now() - processingStartTime,
          errorDetails: `Schema validation error: ${JSON.stringify(validationResult.error)}`,
          parsedResponse: parsedData  // Include the invalid parsed data for debugging
        });
        
        throw new Error(`Schema validation error: ${validationResult.error.message}`);
      }
    } catch (parseError) {
      // JSON parsing failed
      await logAiInteraction({
        sessionId: sessionIdForLogging,
        userQuery: query,
        modelName: 'gemini-1.5-pro',
        rawRequest: { prompt, temperature },
        rawResponse: responseText,
        status: 'error',
        processingTimeMs: Date.now() - processingStartTime,
        errorDetails: `JSON parsing error: ${parseError}`
      });
      
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError}`);
    }
  } catch (error) {
    // API or processing error
    await logAiInteraction({
      sessionId: sessionIdForLogging,
      userQuery: query,
      modelName: 'gemini-1.5-pro',
      rawRequest: { temperature },
      status: 'error',
      processingTimeMs: Date.now() - processingStartTime,
      errorDetails: `API or processing error: ${error}`
    });
    
    throw error;
  }
}

/**
 * Process the validated Gemini response into a StructuredRequest
 */
function processGeminiResponse(
  query: string,
  validatedData: StructuredRequest,
  rawResponse: string,
  citySlug: string = 'london'
): StructuredRequest {
  // Create a Set to track unique activity signatures to avoid duplicates
  const uniqueActivities = new Set<string>();
  
  // Make a copy to avoid modifying the original
  const structuredData: StructuredRequest = {
    ...validatedData,
    fixedTimeEntries: [], // We'll rebuild this with de-duplication
    flexibleTimeEntries: [...(validatedData.flexibleTimeEntries || [])],
    preferences: validatedData.preferences ? { ...validatedData.preferences } : undefined,
    travelGroup: validatedData.travelGroup ? { ...validatedData.travelGroup } : undefined,
    specialRequests: validatedData.specialRequests ? [...validatedData.specialRequests] : undefined
  };

  console.log("Processing Gemini response with raw data:", JSON.stringify(validatedData, null, 2));

  // Set default start location if not provided
  if (!structuredData.startLocation) {
    const defaultLocationMap: Record<string, string> = {
      'nyc': 'Midtown',
      'boston': 'Downtown',
      'austin': 'Downtown',
      'london': 'Central London'
    };
    const cityDefaultLocation = defaultLocationMap[citySlug] || 'Downtown';
    structuredData.startLocation = cityDefaultLocation;
  }
  
  // First process fixed time entries with duplicate detection
  if (validatedData.fixedTimeEntries && validatedData.fixedTimeEntries.length > 0) {
    console.log(`Processing ${validatedData.fixedTimeEntries.length} fixed time entries with duplicate detection`);
    
    for (const entry of validatedData.fixedTimeEntries) {
      if (entry && entry.location && entry.time && entry.activity) {
        // Create a unique signature for this activity
        const activitySignature = `${entry.location}|${entry.time}|${entry.activity}`;
        
        // Only add if we haven't seen this exact activity before
        if (!uniqueActivities.has(activitySignature)) {
          uniqueActivities.add(activitySignature);
          structuredData.fixedTimeEntries.push(entry);
          console.log(`Added fixed time entry: ${entry.activity} at ${entry.location}, ${entry.time}`);
        } else {
          console.log(`Skipped duplicate fixed time entry: ${entry.activity} at ${entry.location}, ${entry.time}`);
        }
      }
    }
  }
  
  // Process flexible time entries and convert them to fixed time entries
  if (structuredData.flexibleTimeEntries && structuredData.flexibleTimeEntries.length > 0) {
    console.log(`Found ${structuredData.flexibleTimeEntries.length} flexible time entries to process`);
    
    // Process each flexible entry with duplicate detection
    for (const entry of structuredData.flexibleTimeEntries) {
      // Convert time period names to specific times
      const convertedTime = convertTo24Hour(entry.time);
      
      // Create converted entry
      const convertedEntry = {
        ...entry,
        time: convertedTime
      };
      
      // Create a unique signature for this activity
      const activitySignature = `${convertedEntry.location}|${convertedEntry.time}|${convertedEntry.activity}`;
      
      // Only add if we haven't seen this exact activity before
      if (!uniqueActivities.has(activitySignature)) {
        uniqueActivities.add(activitySignature);
        structuredData.fixedTimeEntries.push(convertedEntry);
        console.log(`Added flexible time entry to fixedTimes: ${convertedEntry.activity} at ${convertedEntry.location}, ${convertedEntry.time}`);
      } else {
        console.log(`Skipped duplicate flexible time entry: ${convertedEntry.activity} at ${convertedEntry.location}, ${convertedEntry.time}`);
      }
    }
  }
  
  // Sort fixed time entries chronologically
  if (structuredData.fixedTimeEntries && structuredData.fixedTimeEntries.length > 0) {
    structuredData.fixedTimeEntries.sort((a, b) => {
      // Convert times to 24-hour format for comparison
      const timeA = convertTo24Hour(a.time);
      const timeB = convertTo24Hour(b.time);
      return timeA.localeCompare(timeB);
    });
  }
  
  // Ensure each fixed time entry has search parameters
  structuredData.fixedTimeEntries = structuredData.fixedTimeEntries.map(entry => {
    // SIMPLIFIED: Location defaulting removed - Gemini prompt now ensures valid locations
    // Original code removed:
    // if (!entry.location) {
    //   entry.location = "Central London";
    // }
    // const vagueLocations = ['somewhere', 'anywhere', 'london', 'nearby'];
    // if (vagueLocations.includes(entry.location.toLowerCase())) {
    //   entry.location = "Central London";
    // }
    
    // Ensure search parameters object exists
    if (!entry.searchParameters) {
      entry.searchParameters = {};
    }
    
    // Apply global preferences to individual entries when appropriate
    if (structuredData.preferences) {
      if (structuredData.preferences.budget && !entry.searchParameters.priceLevel) {
        entry.searchParameters.priceLevel = structuredData.preferences.budget;
      }
      
      // Apply cuisine preferences for food-related activities
      const foodKeywords = ['lunch', 'dinner', 'breakfast', 'brunch', 'coffee', 'eat', 'dining', 'restaurant', 'cafe', 'food'];
      const hasCuisinePreferences = structuredData.preferences.cuisine && 
                                  Array.isArray(structuredData.preferences.cuisine) && 
                                  structuredData.preferences.cuisine.length > 0;
      
      if (
        hasCuisinePreferences && 
        foodKeywords.some(keyword => entry.activity.toLowerCase().includes(keyword)) &&
        !entry.searchParameters.cuisine
      ) {
        // Safe to access at index 0 since we've checked array length above
        entry.searchParameters.cuisine = structuredData.preferences.cuisine![0];
      }
    }
    
    return entry;
  });
  
  console.log("Final processed result:", JSON.stringify(structuredData, null, 2));
  return structuredData;
}

/**
 * Convert time strings to 24-hour format for consistent comparison
 */
function convertTo24Hour(timeStr: string): string {
  // If already in 24-hour format (e.g., "14:30"), return as is
  if (/^\d{1,2}:\d{2}$/.test(timeStr) && !timeStr.includes('am') && !timeStr.includes('pm')) {
    // Add leading zero if needed
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  // Handle "3pm", "3 pm", "3PM", etc.
  const pmMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(?:pm|PM|p\.m\.|P\.M\.)/);
  if (pmMatch) {
    const hours = parseInt(pmMatch[1]);
    const minutes = pmMatch[2] ? parseInt(pmMatch[2]) : 0;
    const adjustedHours = hours === 12 ? 12 : hours + 12;
    return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle "3am", "3 am", "3AM", etc.
  const amMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|AM|a\.m\.|A\.M\.)/);
  if (amMatch) {
    const hours = parseInt(amMatch[1]);
    const minutes = amMatch[2] ? parseInt(amMatch[2]) : 0;
    const adjustedHours = hours === 12 ? 0 : hours;
    return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // For vague times like "morning", "afternoon", etc., assign reasonable defaults
  const timeMapping: Record<string, string> = {
    'morning': '09:00',
    'early morning': '07:00',
    'late morning': '11:00',
    'noon': '12:00',
    'midday': '12:00',
    'afternoon': '14:00',
    'early afternoon': '13:00',
    'late afternoon': '16:00',
    'evening': '18:00',
    'early evening': '17:00',
    'late evening': '21:00',
    'night': '20:00',
    'midnight': '00:00'
  };
  
  const lowerTimeStr = timeStr.toLowerCase();
  for (const [key, value] of Object.entries(timeMapping)) {
    if (lowerTimeStr.includes(key)) {
      return value;
    }
  }
  
  // For numeric times without am/pm, make educated guesses
  const numericMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (numericMatch) {
    const hours = parseInt(numericMatch[1]);
    const minutes = numericMatch[2] ? parseInt(numericMatch[2]) : 0;
    
    // Assume times 0-6 are early morning (in 24h format)
    // Assume times 7-11 are morning (in 12h format, so 7AM-11AM)
    // Assume times 12 is noon (12PM)
    // Assume times 1-6 are afternoon/evening (in 12h format, so 1PM-6PM)
    let adjustedHours = hours;
    if (hours >= 1 && hours <= 6) {
      adjustedHours = hours + 12; // Convert to PM
    }
    
    return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // If all else fails, return a default time
  return '12:00';
}