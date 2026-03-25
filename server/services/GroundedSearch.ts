// Grounded Search Service
// Uses Gemini with Google Search grounding to find real, current venue information

import { GeminiClient, getGeminiClient } from '../lib/gemini.js';
import { SearchContext, GroundedResult, GroundedVenue } from '../types/index.js';

export class GroundedSearch {
  private gemini: GeminiClient;

  constructor(gemini?: GeminiClient) {
    this.gemini = gemini || getGeminiClient();
  }

  /**
   * Search for venues using Gemini with Google Search grounding
   * This provides real-time information about actual venues
   */
  async search(
    query: string,
    location: string,
    context: SearchContext
  ): Promise<GroundedResult> {
    const prompt = this.buildSearchPrompt(query, location, context);

    try {
      const response = await this.gemini.generateGroundedContent(prompt, {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingLevel: 'minimal',
        timeoutMs: 12_000,
      });

      return this.parseSearchResponse(response);
    } catch (error) {
      console.error('Grounded search failed:', error);
      // Return empty result on failure
      return {
        venues: [],
        searchInsights: 'Search temporarily unavailable',
      };
    }
  }

  /**
   * Build the search prompt for grounded search
   */
  private buildSearchPrompt(
    query: string,
    location: string,
    context: SearchContext
  ): string {
    return `You are a local expert searching for REAL venues that exist TODAY in ${location}.

Search for: "${query}"

Current context:
- City: ${context.city}
- Location: ${location}
- Day of week: ${context.dayOfWeek}
- Current time: ${context.currentTime}

INSTRUCTIONS:
1. Search for REAL, ACTUALLY EXISTING venues that match this request
2. Focus on venues that are currently operating (not permanently closed)
3. Include only venues with verifiable information
4. Consider current time - prioritize venues likely to be open
5. Include recent information when available (new openings, popular spots)

For each venue, provide:
- The actual venue name (as it appears on Google/TripAdvisor)
- Full street address
- Why this venue matches the request
- Estimated rating (from Google/TripAdvisor)
- Price level ($ to $$$$)
- Whether it's likely open at ${context.currentTime}

Return ONLY valid JSON (no markdown):
{
  "venues": [
    {
      "name": "Exact venue name",
      "address": "Full address including postcode",
      "whyRecommended": "Specific reason this matches the request",
      "estimatedRating": 4.5,
      "priceLevel": "$$",
      "likelyOpenNow": true
    }
  ],
  "searchInsights": "Any relevant current information (new openings, seasonal recommendations, etc.)"
}

IMPORTANT:
- Return 3-5 venues, ordered by relevance
- Only include venues you are confident actually exist
- Include the full address with postcode when available
- Be specific about why each venue matches the request`;
  }

  /**
   * Parse the grounded search response
   */
  private parseSearchResponse(response: string): GroundedResult {
    try {
      const parsed = GeminiClient.parseJsonResponse<GroundedResult>(response);

      // Validate the structure
      if (!parsed.venues || !Array.isArray(parsed.venues)) {
        return { venues: [], searchInsights: 'Invalid response format' };
      }

      // Ensure each venue has required fields
      const validVenues: GroundedVenue[] = parsed.venues
        .filter((v: any) => v.name && v.address)
        .map((v: any) => ({
          name: v.name,
          address: v.address,
          whyRecommended: typeof v.whyRecommended === 'string' && v.whyRecommended.trim()
            ? v.whyRecommended.trim()
            : undefined,
          estimatedRating: typeof v.estimatedRating === 'number' ? v.estimatedRating : undefined,
          priceLevel: v.priceLevel || undefined,
          likelyOpenNow: typeof v.likelyOpenNow === 'boolean' ? v.likelyOpenNow : undefined,
        }));

      return {
        venues: validVenues,
        searchInsights: parsed.searchInsights || undefined,
      };
    } catch (error) {
      console.error('Failed to parse grounded search response:', error);
      return { venues: [], searchInsights: 'Failed to parse search results' };
    }
  }

  /**
   * Search specifically for venues matching activity requirements
   */
  async searchForActivity(
    activity: string,
    venuePreference: string | undefined,
    location: string,
    requirements: string[],
    context: SearchContext
  ): Promise<GroundedResult> {
    // Build a more specific search query
    let searchQuery = venuePreference || activity;

    if (requirements.length > 0) {
      searchQuery += ` with ${requirements.join(', ')}`;
    }

    return this.search(searchQuery, location, context);
  }
}

// Singleton export
let groundedSearch: GroundedSearch | null = null;

export function getGroundedSearch(): GroundedSearch {
  if (!groundedSearch) {
    groundedSearch = new GroundedSearch();
  }
  return groundedSearch;
}
