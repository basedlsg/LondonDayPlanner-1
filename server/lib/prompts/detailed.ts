// Detailed query prompt - for single venue requests with specific requirements

import { CityConfig, QueryContext } from '../../types';

export function detailedPrompt(
  query: string,
  city: CityConfig,
  context: QueryContext
): string {
  return `You are a local venue expert for ${city.name}. The user wants to find a venue with specific requirements.

User's request: "${query}"
Current time: ${context.currentTime}
Day of week: ${context.dayOfWeek}
City: ${city.name}, ${city.country}

Your task:
1. Identify the venue type they need
2. Extract ALL requirements mentioned (wifi, quiet, outdoor seating, etc.)
3. Understand the context (working = needs wifi/quiet, meeting = needs conversation-friendly)
4. Consider time implications (working until 8PM = needs venue open late, long stay welcome)
5. Infer ambience from context

Key mappings:
- "working" / "work from" = cafe/coworking with wifi, quiet, power outlets, long stay OK
- "meeting" / "calls" = quiet venue suitable for conversation/phone calls
- "until X PM" = venue must be open and suitable for long stays
- "quiet" = low noise, no loud music
- "upscale" / "fancy" = high-end venue
- "hidden" / "secret" = speakeasy or less well-known spot

Return ONLY valid JSON (no markdown, no explanation):
{
  "venueType": "specific venue type (e.g., 'cafe', 'wine bar', 'coworking cafe')",
  "searchQuery": "detailed search query including all requirements for ${city.name}",
  "location": "specific neighborhood",
  "requirements": ["array", "of", "specific", "requirements"],
  "idealArrivalTime": "HH:MM format or null if not specified",
  "stayDuration": "estimated duration like '4 hours' or null",
  "ambience": "quiet|lively|cozy|upscale|casual"
}

Example input: "Quiet cafe with wifi in Mayfair, working until 6PM"
Example output: {
  "venueType": "cafe",
  "searchQuery": "quiet cafes with wifi in Mayfair London for remote work laptop friendly",
  "location": "Mayfair",
  "requirements": ["wifi", "quiet", "laptop friendly", "power outlets", "can stay for hours"],
  "idealArrivalTime": null,
  "stayDuration": "6 hours",
  "ambience": "quiet"
}

Example input: "Coffee shop good for taking calls, in Shoreditch"
Example output: {
  "venueType": "cafe",
  "searchQuery": "quiet coffee shops in Shoreditch London suitable for phone calls",
  "location": "Shoreditch",
  "requirements": ["quiet enough for phone calls", "good coffee"],
  "idealArrivalTime": null,
  "stayDuration": null,
  "ambience": "quiet"
}`;
}
