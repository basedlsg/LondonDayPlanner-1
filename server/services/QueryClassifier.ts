// Query Classification Service
// Classifies user queries into tiers (simple, detailed, complex) and selects appropriate AI model

import { QueryTier, Classification } from '../types/index.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from '../lib/gemini.js';

const ACTIVITY_KEYWORD_SOURCE = [
  'breakfast', 'brunch', 'lunch', 'dinner', 'supper',
  'coffee', 'cafe', 'tea',
  'drinks?', 'cocktails?', 'bar', 'pub',
  'meeting', 'appointment', 'reservation',
  'work(?:ing)?', 'cowork(?:ing)?',
  'shopping', 'shop',
  'museum', 'gallery', 'exhibit',
  'walk', 'stroll', 'dessert',
  'sightseeing', 'tour', 'visit', 'explore'
].join('|');

type ActivityMention = {
  index: number;
  raw: string;
  canonical: string;
};

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

    // Complex: 2+ sequential activities OR multi-stop indicators OR multiple distinct locations
    if (activityCount >= 2 || this.isMultiStop(normalizedQuery) || hasMultipleLocations) {
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

    // Default to the stable Gemini 2.5 Flash path for production reliability.
    const model: 'gemini-2.5-flash' = DEFAULT_GEMINI_FLASH_MODEL;

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
    const activityMentions = this.getActivityMentions(query);
    const sequentialActivityCount = activityMentions.reduce((count, match, index) => {
      const mentionIndex = match.index;
      if (index === 0 || this.hasSequentialPrefix(query, mentionIndex)) {
        return count + 1;
      }
      return count;
    }, 0);

    const separatorCount = this.countActivitySeparators(query);

    if (sequentialActivityCount > 1 || separatorCount > 0) {
      return Math.max(sequentialActivityCount, separatorCount + 1);
    }

    const implicitDistinctActivityCount = this.countImplicitDistinctActivities(query, activityMentions);
    if (implicitDistinctActivityCount > 0) {
      return implicitDistinctActivityCount;
    }

    return activityMentions.length > 0 ? 1 : 0;
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
      /\r?\n+\s*(?=(?:\b(?:breakfast|brunch|lunch|dinner|supper|coffee|cafe|tea|drinks?|cocktails?|bar|pub|meeting|appointment|reservation|work(?:ing)?|cowork(?:ing)?|shopping|shop|museum|gallery|exhibit|walk|stroll|dessert|sightseeing|tour|visit|explore)\b))/i,
      new RegExp(`,\\s*(?=(?:${ACTIVITY_KEYWORD_SOURCE})\\b)`, 'i'),
      new RegExp(`\\band\\s+(?=(?:${ACTIVITY_KEYWORD_SOURCE})\\b)`, 'i'),
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
      'holborn', 'bloomsbury',
      'hammersmith', 'fulham', 'clapham', 'battersea', 'greenwich'
    ];

    // Count how many distinct neighborhoods are mentioned
    const mentionedNeighborhoods = londonNeighborhoods.filter(
      hood => query.includes(hood)
    );

    return mentionedNeighborhoods.length >= 2;
  }

  private countActivitySeparators(query: string): number {
    const separatorPatterns = [
      /--/g,
      /\bthen\b/gi,
      /\bafter\s+that\b/gi,
      /\bfollowed\s+by\b/gi,
      /\bnext\b/gi,
      /\bafterwards?\b/gi,
      /\blater\b/gi,
      /\bfinally\b/gi,
      /\b(?:and|&)\s+then\b/gi,
      /\r?\n+\s*(?=(?:\b(?:breakfast|brunch|lunch|dinner|supper|coffee|cafe|tea|drinks?|cocktails?|bar|pub|meeting|appointment|reservation|work(?:ing)?|cowork(?:ing)?|shopping|shop|museum|gallery|exhibit|walk|stroll|dessert|sightseeing|tour|visit|explore)\b))/gi,
      new RegExp(`,\\s*(?=(?:${ACTIVITY_KEYWORD_SOURCE})\\b)`, 'gi'),
      new RegExp(`\\band\\s+(?=(?:${ACTIVITY_KEYWORD_SOURCE})\\b)`, 'gi'),
    ];

    return separatorPatterns.reduce((count, pattern) => {
      const matches = query.match(pattern);
      return count + (matches?.length || 0);
    }, 0);
  }

  private hasSequentialPrefix(query: string, activityIndex: number): boolean {
    const prefix = query.slice(Math.max(0, activityIndex - 32), activityIndex);
    return /(?:--|,|;|\/|\bthen\b|\bafter(?:\s+that)?\b|\bfollowed\s+by\b|\bnext\b|\blater\b|\bfinally\b|\band\b|&|\r?\n)\s*$/i.test(prefix);
  }

  private getActivityMentions(query: string): ActivityMention[] {
    return Array.from(
      query.matchAll(new RegExp(`\\b(${ACTIVITY_KEYWORD_SOURCE})\\b`, 'gi'))
    ).map((match) => ({
      index: match.index ?? 0,
      raw: match[0].toLowerCase(),
      canonical: this.canonicalizeActivity(match[0]),
    }));
  }

  private countImplicitDistinctActivities(query: string, activityMentions: ActivityMention[]): number {
    if (activityMentions.length === 0) {
      return 0;
    }

    let count = 1;
    let previousMention = activityMentions[0];

    for (let index = 1; index < activityMentions.length; index += 1) {
      const currentMention = activityMentions[index];
      const previousEnd = previousMention.index + previousMention.raw.length;
      const betweenMentions = query.slice(previousEnd, currentMention.index);
      const normalizedGap = betweenMentions.replace(/\s+/g, ' ').trim();

      if (
        currentMention.canonical !== previousMention.canonical
        && (normalizedGap.length >= 6 || /[\r\n.!?]/.test(betweenMentions))
      ) {
        count += 1;
        previousMention = currentMention;
      }
    }

    return count;
  }

  private canonicalizeActivity(activity: string): string {
    switch (activity.toLowerCase()) {
      case 'cafe':
      case 'tea':
        return 'coffee';
      case 'cocktail':
      case 'cocktails':
      case 'drinks':
      case 'bar':
      case 'pub':
        return 'drinks';
      case 'shop':
        return 'shopping';
      case 'gallery':
      case 'exhibit':
        return 'museum';
      case 'stroll':
        return 'walk';
      case 'tour':
      case 'visit':
      case 'sightseeing':
        return 'explore';
      default:
        return activity.toLowerCase();
    }
  }
}

// Singleton export
export const queryClassifier = new QueryClassifier();
