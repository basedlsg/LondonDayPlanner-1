// Query Classification Service
// Classifies user queries into tiers (simple, detailed, complex) and selects appropriate AI model

import { QueryTier, Classification } from '../types';

export class QueryClassifier {
  /**
   * Classify a user query into a tier and determine the appropriate model
   */
  classify(query: string): Classification {
    const normalizedQuery = query.toLowerCase().trim();

    const activityCount = this.countActivities(normalizedQuery);
    const hasTimeConstraints = this.detectTimeConstraints(normalizedQuery);
    const hasPreferences = this.detectPreferences(normalizedQuery);
    const hasMultipleLocations = this.detectMultipleLocations(normalizedQuery);

    let tier: QueryTier;

    // Complex: 3+ activities OR multi-stop indicators OR multiple distinct locations
    if (activityCount >= 3 || this.isMultiStop(normalizedQuery) || hasMultipleLocations) {
      tier = 'complex';
    }
    // Detailed: has time constraints OR venue preferences
    else if (hasTimeConstraints || hasPreferences) {
      tier = 'detailed';
    }
    // Simple: basic venue request
    else {
      tier = 'simple';
    }

    // Select model based on tier (updated to Gemini 2.5 series)
    // - Simple: gemini-2.5-flash-lite (fastest, most cost-effective)
    // - Detailed: gemini-2.5-flash (balanced)
    // - Complex: gemini-2.5-pro (best reasoning)
    let model: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro';
    switch (tier) {
      case 'simple':
        model = 'gemini-2.5-flash-lite';
        break;
      case 'detailed':
        model = 'gemini-2.5-flash';
        break;
      case 'complex':
        model = 'gemini-2.5-pro';
        break;
    }

    return {
      tier,
      activityCount,
      hasTimeConstraints,
      hasPreferences,
      model
    };
  }

  /**
   * Count the number of distinct activities in the query
   */
  private countActivities(query: string): number {
    // Count activity separators
    const separatorPatterns = [
      /--/g,                          // Double dash separator
      /\bthen\b/gi,                   // "then"
      /\bafter\s+that\b/gi,           // "after that"
      /\bfollowed\s+by\b/gi,          // "followed by"
      /\bnext\b/gi,                   // "next"
      /\bafterwards?\b/gi,            // "afterwards" / "afterward"
      /\blater\b/gi,                  // "later"
      /\bfinally\b/gi,                // "finally"
      /\b(?:and|&)\s+then\b/gi,       // "and then"
    ];

    let separatorCount = 0;
    for (const pattern of separatorPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        separatorCount += matches.length;
      }
    }

    // Also count distinct meal/activity mentions
    const activityKeywords = [
      /\b(breakfast|brunch|lunch|dinner|supper)\b/gi,
      /\b(coffee|cafe|tea)\b/gi,
      /\b(drinks?|cocktails?|bar|pub)\b/gi,
      /\b(meeting|appointment|reservation)\b/gi,
      /\b(work(?:ing)?|cowork(?:ing)?)\b/gi,
      /\b(shopping|shop)\b/gi,
      /\b(museum|gallery|exhibit)\b/gi,
    ];

    const uniqueActivities = new Set<string>();
    for (const pattern of activityKeywords) {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(m => uniqueActivities.add(m.toLowerCase()));
      }
    }

    // Return the higher count (separators imply activities, unique activities are explicit)
    return Math.max(separatorCount + 1, uniqueActivities.size);
  }

  /**
   * Detect if the query is a multi-stop itinerary
   */
  private isMultiStop(query: string): boolean {
    const multiStopIndicators = [
      /--/,                           // Double dash separator (common in complex queries)
      /\bthen\b/i,                    // Sequential indicator
      /\bafter\b/i,                   // After indicator
      /\bfollowed\s+by\b/i,           // Sequence indicator
      /\b(?:from|starting)\s+.*?\b(?:to|ending)\b/i,  // Range indicator
      /\bmorning\b.*\b(?:afternoon|evening|night)\b/i, // Time span
      /\bfirst\b.*\bthen\b/i,         // Sequence
    ];

    return multiStopIndicators.some(pattern => pattern.test(query));
  }

  /**
   * Detect time-related constraints in the query
   */
  private detectTimeConstraints(query: string): boolean {
    const timePatterns = [
      /\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)/,  // Explicit time: 12pm, 3:30PM
      /\bat\s+\d{1,2}/,                         // "at 3", "at 12"
      /\buntil\s+\d{1,2}/,                      // "until 8"
      /\bby\s+\d{1,2}/,                         // "by 6"
      /\bfrom\s+\d{1,2}/,                       // "from 9"
      /\baround\s+\d{1,2}/,                     // "around 2"
      /\b(?:until|til|till|by)\s+(?:the\s+)?(?:evening|night|afternoon|morning)/i,  // Until evening
      /\bfor\s+\d+\s*(?:hours?|hrs?)/i,         // "for 3 hours"
      /\bworking\s+(?:until|til|till|from)/i,   // Working until/from
      /\bopen\s+(?:until|late|past)/i,          // Open requirements
      /\bhours?\b/i,                            // Duration mention
    ];

    return timePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Detect venue preferences and requirements in the query
   */
  private detectPreferences(query: string): boolean {
    const preferencePatterns = [
      // Atmosphere preferences
      /\b(?:quiet|peaceful|calm|relaxed|chill)\b/i,
      /\b(?:lively|busy|buzzy|vibrant|energetic)\b/i,
      /\b(?:cozy|cosy|intimate|romantic)\b/i,
      /\b(?:upscale|fancy|posh|luxurious|elegant|high[- ]end)\b/i,
      /\b(?:casual|laid[- ]?back|informal|relaxed)\b/i,
      /\b(?:hidden|secret|speakeasy|underground)\b/i,
      /\b(?:trendy|hip|cool|hipster)\b/i,

      // Functional requirements
      /\bwifi\b/i,
      /\b(?:good\s+for|suitable\s+for|great\s+for)\b/i,
      /\b(?:laptop[- ]?friendly|work[- ]?friendly)\b/i,
      /\b(?:power\s+outlets?|charging)\b/i,
      /\b(?:outdoor|outside|terrace|patio|rooftop)\b/i,
      /\b(?:take\s+a?\s*calls?|phone\s+calls?|meetings?)\b/i,

      // Quality indicators
      /\b(?:authentic|traditional|classic|local|genuine)\b/i,
      /\b(?:best|top|famous|renowned|popular)\b/i,
      /\b(?:good|great|excellent|amazing)\s+(?:food|coffee|drinks?|wine)\b/i,

      // Specific cuisine/type preferences
      /\b(?:michelin|starred|award[- ]winning)\b/i,
      /\bwith\s+(?:good|great|excellent)\s+(?:cheese|wine|cocktails?|coffee)\b/i,
    ];

    return preferencePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Detect if the query mentions multiple distinct locations
   */
  private detectMultipleLocations(query: string): boolean {
    // Common London neighborhoods
    const londonNeighborhoods = [
      'mayfair', 'shoreditch', 'soho', 'covent garden', 'chelsea',
      'notting hill', 'camden', 'kensington', 'westminster', 'fitzrovia',
      'marylebone', 'clerkenwell', 'hackney', 'brixton', 'islington',
      'canary wharf', 'southbank', 'borough', 'bermondsey', 'peckham',
      'hammersmith', 'fulham', 'clapham', 'battersea', 'greenwich'
    ];

    // Count how many distinct neighborhoods are mentioned
    const mentionedNeighborhoods = londonNeighborhoods.filter(
      hood => query.includes(hood)
    );

    return mentionedNeighborhoods.length >= 2;
  }
}

// Singleton export
export const queryClassifier = new QueryClassifier();
