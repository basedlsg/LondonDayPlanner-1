// Simple query prompt - for single venue requests without complex requirements

import { CityConfig } from '../../types/index.js';

export function simplePrompt(
  query: string,
  city: CityConfig,
  currentTime: string
): string {
  return `You are a local expert for ${city.name}. The user wants to find a single venue.

User's request: "${query}"
Current time: ${currentTime}
Current city: ${city.name}, ${city.country}

Your task:
1. Identify what type of venue they want
2. Identify the location/neighborhood (default to a central area if not specified)
3. Create an optimized search query for finding real venues

Return ONLY valid JSON (no markdown, no explanation):
{
  "venueType": "cafe|restaurant|bar|pub|museum|gallery|park|shop|attraction",
  "searchQuery": "optimized search query including venue type and location for ${city.name}",
  "location": "specific neighborhood in ${city.name}",
  "requirements": []
}

Example input: "Coffee shop in Mayfair"
Example output: {"venueType":"cafe","searchQuery":"best coffee shops in Mayfair London","location":"Mayfair","requirements":[]}

Example input: "Good pub"
Example output: {"venueType":"pub","searchQuery":"best traditional pubs in central London","location":"Central London","requirements":[]}`;
}
