// Complex itinerary prompt - for multi-stop day planning

import { CityConfig, QueryContext } from '../../types';

export function complexPrompt(
  query: string,
  city: CityConfig,
  context: QueryContext
): string {
  return `You are an expert day planner for ${city.name}. Parse this multi-stop itinerary request and extract every activity.

User's request: "${query}"
Date: ${context.date || 'Today'}
Start time: ${context.startTime || '09:00'}
Day of week: ${context.dayOfWeek}
City: ${city.name}, ${city.country}

CRITICAL PARSING RULES:

1. EXTRACT EVERY ACTIVITY - Do not skip any activities mentioned
   - Each "--" or "then" or "after" indicates a new activity
   - Count activities carefully: 4 dashes means 5 activities

2. FIXED vs FLEXIBLE
   - FIXED: Has specific time ("meeting at 12", "dinner at 7", "lunch at 1pm")
   - FLEXIBLE: Has time window ("morning coffee", "after lunch", "evening drinks")

3. TIME CALCULATIONS
   - "morning" = 08:00-11:00
   - "after lunch" / "afternoon" = 14:00-17:00
   - "evening" / "after work" = 18:00-21:00
   - Allow ~30 min travel between different neighborhoods

4. VENUE TYPE INFERENCE
   - "quiet for calls" = cafe with quiet atmosphere
   - "good cheese" / "nice to sit and talk" = upscale restaurant
   - "hidden bar" / "secret" / "speakeasy" = speakeasy bar
   - "working" / "work from" = laptop-friendly cafe or coworking
   - "upscale" + "bar" = high-end cocktail bar

5. LOCATION HANDLING
   - Preserve exact locations mentioned ("Mayfair", "Chelsea")
   - "near previous" = same area as previous activity
   - If only end location given, work backwards

Return ONLY valid JSON (no markdown):
{
  "fixedAppointments": [
    {
      "time": "HH:MM (24-hour format)",
      "activity": "brief description",
      "location": "specific area in ${city.name}",
      "venuePreference": "specific venue type or requirements (e.g., 'restaurant with good cheese selection')"
    }
  ],
  "flexibleActivities": [
    {
      "timeWindow": {
        "earliest": "HH:MM",
        "latest": "HH:MM"
      },
      "activity": "brief description",
      "location": "area or 'near previous'",
      "venuePreference": "specific requirements (e.g., 'quiet cafe suitable for phone calls')",
      "requirements": ["array", "of", "specific", "needs"]
    }
  ],
  "preferences": {
    "pace": "relaxed|moderate|busy",
    "budget": "budget|moderate|expensive"
  }
}

EXAMPLE:

Input: "Morning coffee at a place quiet enough to take a call -- have a lunch meeting in Mayfair around 12 -- would like a place nice to sit and talk with good cheese. Will be working in the area until about 6, then heading over to Chelsea for a drink, would like an upscale bar that's hidden and cool"

Output:
{
  "fixedAppointments": [
    {
      "time": "12:00",
      "activity": "lunch meeting",
      "location": "Mayfair",
      "venuePreference": "upscale restaurant with good cheese selection, suitable for conversation"
    }
  ],
  "flexibleActivities": [
    {
      "timeWindow": {"earliest": "08:00", "latest": "11:00"},
      "activity": "morning coffee and call",
      "location": "near Mayfair",
      "venuePreference": "quiet cafe",
      "requirements": ["quiet enough for phone calls", "good coffee"]
    },
    {
      "timeWindow": {"earliest": "14:00", "latest": "18:00"},
      "activity": "work session",
      "location": "Mayfair area",
      "venuePreference": "cafe or coworking space",
      "requirements": ["wifi", "can stay for several hours", "laptop friendly"]
    },
    {
      "timeWindow": {"earliest": "18:30", "latest": "20:00"},
      "activity": "evening drinks",
      "location": "Chelsea",
      "venuePreference": "hidden upscale speakeasy bar",
      "requirements": ["upscale", "hidden or secret entrance", "cool atmosphere", "good cocktails"]
    }
  ],
  "preferences": {
    "pace": "moderate",
    "budget": "expensive"
  }
}

ANOTHER EXAMPLE:

Input: "Coffee in Shoreditch then lunch then drinks in Soho"

Output:
{
  "fixedAppointments": [],
  "flexibleActivities": [
    {
      "timeWindow": {"earliest": "09:00", "latest": "11:00"},
      "activity": "coffee",
      "location": "Shoreditch",
      "venuePreference": "coffee shop",
      "requirements": ["good coffee"]
    },
    {
      "timeWindow": {"earliest": "12:00", "latest": "14:00"},
      "activity": "lunch",
      "location": "Shoreditch",
      "venuePreference": "restaurant",
      "requirements": []
    },
    {
      "timeWindow": {"earliest": "17:00", "latest": "20:00"},
      "activity": "drinks",
      "location": "Soho",
      "venuePreference": "bar",
      "requirements": []
    }
  ],
  "preferences": {
    "pace": "relaxed",
    "budget": "moderate"
  }
}`;
}
