// Itinerary Planner Service
// Main orchestration service for creating day plans

import { QueryClassifier, queryClassifier } from './QueryClassifier.js';
import { VenueDiscovery, getVenueDiscovery } from './VenueDiscovery.js';
import { GeminiClient, getGeminiClient } from '../lib/gemini.js';
import { simplePrompt } from '../lib/prompts/simple.js';
import { detailedPrompt } from '../lib/prompts/detailed.js';
import { complexPrompt } from '../lib/prompts/complex.js';
import {
  addMinutesToTime,
  getDayOfWeek,
  formatTime12h,
  parseTimeToMinutes,
  getArrivalTimeInWindow,
} from '../lib/utils/time.js';
import {
  PlanRequest,
  CityConfig,
  Classification,
  QueryTier,
  QueryContext,
  SearchContext,
  ParsedSimpleQuery,
  ParsedDetailedQuery,
  ParsedComplexQuery,
  ParsedActivity,
  DiscoveryResult,
  Itinerary,
  ItineraryPlace,
  TravelTime,
} from '../types/index.js';

const FALLBACK_ACTIVITY_KEYWORD_SOURCE = [
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

const FALLBACK_ACTIVITY_REGEX = new RegExp(`\\b(${FALLBACK_ACTIVITY_KEYWORD_SOURCE})\\b`, 'gi');
const FALLBACK_SEGMENT_SPLIT_REGEX = new RegExp(
  `\\s*(?:--|;|\\bafter\\s+that\\b|\\bfollowed\\s+by\\b|\\band\\s+then\\b|\\bthen\\b|\\bafterwards?\\b|\\blater\\b|,\\s*(?=(?:${FALLBACK_ACTIVITY_KEYWORD_SOURCE})\\b)|\\band\\s+(?=(?:${FALLBACK_ACTIVITY_KEYWORD_SOURCE})\\b))\\s*`,
  'i'
);

type ParsedFallbackSegment = {
  activity: string;
  location: string;
  venuePreference: string;
  requirements: string[];
  scheduledTime?: string;
  timeWindow?: {
    earliest: string;
    latest: string;
  };
};

export class ItineraryPlanner {
  private classifier: QueryClassifier;
  private venueDiscovery: VenueDiscovery;
  private gemini: GeminiClient;

  constructor(
    classifier?: QueryClassifier,
    venueDiscovery?: VenueDiscovery,
    gemini?: GeminiClient
  ) {
    this.classifier = classifier || queryClassifier;
    this.venueDiscovery = venueDiscovery || getVenueDiscovery();
    this.gemini = gemini || getGeminiClient();
  }

  /**
   * Create an itinerary from a user request
   */
  async createPlan(request: PlanRequest, cityConfig: CityConfig): Promise<Itinerary> {
    console.log(`[ItineraryPlanner] Creating plan for query: "${request.query}"`);
    console.log(`[ItineraryPlanner] City: ${cityConfig.name}`);

    // Step 1: Classify the query
    const classification = this.classifier.classify(request.query);

    // Premium users get Flash (Pro is too slow for serverless timeouts)
    if (request.isPremium) {
      console.log(`[ItineraryPlanner] Premium user detected - Using gemini-2.5-flash`);
      classification.model = 'gemini-2.5-flash';
    }

    console.log(`[ItineraryPlanner] Classification:`, classification);

    // Step 2: Parse with tier-appropriate model and prompt
    let parsed: any;
    try {
      parsed = await this.parseQuery(request, classification, cityConfig);
      console.log(`[ItineraryPlanner] Parsed query:`, JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.warn(`[ItineraryPlanner] AI Parsing failed, using curated fallback:`, error);
      parsed = this.getFallbackParsedQuery(request, cityConfig, classification.tier);
      console.log(`[ItineraryPlanner] Fallback parsed query:`, JSON.stringify(parsed, null, 2));
    }

    // Step 3: Convert parsed data to activities
    const activities = this.extractActivities(parsed, classification.tier, request.startTime);
    console.log(`[ItineraryPlanner] Extracted ${activities.length} activities`);

    // Step 4: Discover venues for each activity
    const searchContext = this.buildSearchContext(request, cityConfig);
    const venueResults = await this.discoverVenuesForActivities(
      activities,
      searchContext,
      classification.tier
    );

    // Step 5: Build the final itinerary with all required fields for iOS decoding
    const itineraryData = this.buildItinerary(activities, venueResults, cityConfig, request.date);

    const itinerary: Itinerary = {
      id: Date.now(),
      title: `${cityConfig.name} Day Plan`,
      description: null,
      planDate: request.date,
      query: request.query,
      venues: itineraryData.venues,  // iOS expects 'venues' key in JSON
      travelTimes: itineraryData.travelTimes,
      created: new Date().toISOString(),
      weather: null,
      city: cityConfig.name,
      searchInsights: itineraryData.searchInsights,
    };

    console.log(`[ItineraryPlanner] Built itinerary with ${itinerary.venues.length} venues`);

    return itinerary;
  }

  /**
   * Parse the query using the appropriate prompt
   */
  private async parseQuery(
    request: PlanRequest,
    classification: Classification,
    city: CityConfig
  ): Promise<ParsedSimpleQuery | ParsedDetailedQuery | ParsedComplexQuery> {
    const context: QueryContext = {
      currentTime: request.startTime,
      dayOfWeek: getDayOfWeek(),
      date: request.date,
      startTime: request.startTime,
    };

    let prompt: string;
    switch (classification.tier) {
      case 'simple':
        prompt = simplePrompt(request.query, city, request.startTime);
        break;
      case 'detailed':
        prompt = detailedPrompt(request.query, city, context);
        break;
      case 'complex':
        prompt = complexPrompt(request.query, city, context);
        break;
    }

    const response = await this.gemini.generateContent(
      prompt,
      classification.model,
      { temperature: 0.2 }
    );

    return GeminiClient.parseJsonResponse(response);
  }

  /**
   * Extract activities from parsed query based on tier
   */
  private extractActivities(
    parsed: ParsedSimpleQuery | ParsedDetailedQuery | ParsedComplexQuery,
    tier: string,
    startTime: string
  ): ParsedActivity[] {
    const activities: ParsedActivity[] = [];

    if (tier === 'simple' || tier === 'detailed') {
      // Simple and detailed queries have a single activity
      const query = parsed as ParsedSimpleQuery | ParsedDetailedQuery;
      activities.push({
        activity: query.venueType,
        location: query.location,
        venuePreference: query.searchQuery,
        requirements: query.requirements,
        scheduledTime: (query as ParsedDetailedQuery).idealArrivalTime || startTime,
      });
    } else {
      // Complex queries have multiple activities
      const query = parsed as ParsedComplexQuery;

      // Add fixed appointments
      for (const appointment of query.fixedAppointments || []) {
        activities.push({
          activity: appointment.activity,
          location: appointment.location,
          venuePreference: appointment.venuePreference,
          scheduledTime: appointment.time,
          isFixed: true,
        });
      }

      // Add flexible activities
      for (const flexible of query.flexibleActivities || []) {
        activities.push({
          activity: flexible.activity,
          location: flexible.location,
          venuePreference: flexible.venuePreference,
          requirements: flexible.requirements,
          timeWindow: flexible.timeWindow,
          isFixed: false,
        });
      }

      // Sort by time (fixed appointments have exact times, flexible have windows)
      activities.sort((a, b) => {
        const timeA = a.scheduledTime || a.timeWindow?.earliest || '00:00';
        const timeB = b.scheduledTime || b.timeWindow?.earliest || '00:00';
        return timeA.localeCompare(timeB);
      });
    }

    return activities;
  }

  /**
   * Build search context from request and city
   */
  private buildSearchContext(request: PlanRequest, city: CityConfig): SearchContext {
    return {
      city: city.name,
      citySlug: city.slug,
      timezone: city.timezone,
      currentTime: request.startTime,
      dayOfWeek: getDayOfWeek(),
      date: request.date,
      startTime: request.startTime,
    };
  }

  /**
   * Discover venues for all activities in parallel
   */
  private async discoverVenuesForActivities(
    activities: ParsedActivity[],
    context: SearchContext,
    tier: string
  ): Promise<DiscoveryResult[]> {
    const results = await Promise.all(
      activities.map((activity) =>
        this.venueDiscovery.discover(activity, context, tier as any)
      )
    );
    return results;
  }

  /**
   * Build the final itinerary from activities and discovered venues
   * Output format matches iOS Itinerary structure exactly
   */
  private buildItinerary(
    activities: ParsedActivity[],
    venueResults: DiscoveryResult[],
    city: CityConfig,
    planDate: string
  ): { venues: ItineraryPlace[]; travelTimes: TravelTime[]; searchInsights?: string[] } {
    const venues: ItineraryPlace[] = [];
    const travelTimes: TravelTime[] = [];
    const searchInsights: string[] = [];

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const venueResult = venueResults[i];

      // Determine scheduled time
      let scheduledTime = activity.scheduledTime;
      if (!scheduledTime && activity.timeWindow) {
        scheduledTime = getArrivalTimeInWindow(
          activity.timeWindow.earliest,
          activity.timeWindow.latest
        );
      }
      scheduledTime = scheduledTime || '09:00';

      // Build place entry matching iOS ScheduledPlace structure
      if (venueResult.primary) {
        const venue = venueResult.primary;
        const alternatives = venueResult.alternatives.map((alternative) => ({
          ...alternative,
          photoUrl: this.buildPhotoUrl(alternative.photos?.[0]),
        }));

        venues.push({
          placeId: venue.placeId,
          name: venue.name,
          address: venue.formattedAddress || venue.address,
          location: venue.location || city.coordinates,
          time: scheduledTime,  // iOS expects 'time' key
          duration: 60, // Default 1 hour
          categories: this.buildCategories(activity, venue),
          rating: venue.rating,
          alternatives,
          activityDescription: venue.whyRecommended,
          photoUrl: this.buildPhotoUrl(venue.photos?.[0]),
          statusText: this.buildStatusText(venue, scheduledTime, planDate),
          isOpenNow: venue.isOpenNow,
          phoneNumber: venue.phoneNumber,
        });
      } else {
        // No venue found - create placeholder
        venues.push({
          name: `${activity.activity} in ${activity.location}`,
          address: `${activity.location}, ${city.name}`,
          location: city.coordinates,
          time: scheduledTime,
          duration: 60,
          categories: this.buildFallbackCategories(activity),
          activityDescription: 'No specific venue found - explore the area',
          alternatives: [],
        });
      }

      // Collect search insights
      if (venueResult.searchInsights) {
        searchInsights.push(venueResult.searchInsights);
      }

      // Calculate travel time to next activity - match iOS TravelTime structure
      if (i < activities.length - 1) {
        const currentLocation = activity.location;
        const nextActivity = activities[i + 1];
        const durationMinutes = this.estimateTravelTime(
          currentLocation,
          nextActivity.location
        );
        travelTimes.push({
          from: currentLocation,
          to: nextActivity.location,
          durationMinutes: durationMinutes,
          durationText: `${durationMinutes} min`,
          mode: 'transit',
        });
      }
    }

    return {
      venues,
      travelTimes,
      searchInsights: searchInsights.length > 0 ? searchInsights : undefined,
    };
  }

  /**
   * Return a curated "Best of City" parsed query when AI fails
   */
  private getFallbackParsedQuery(
    request: PlanRequest,
    city: CityConfig,
    tier: QueryTier
  ): ParsedSimpleQuery | ParsedDetailedQuery | ParsedComplexQuery {
    if (tier === 'complex') {
      const complexFallback = this.getFallbackComplexQuery(request.query, city, request.startTime);
      const activityCount = complexFallback.fixedAppointments.length + complexFallback.flexibleActivities.length;
      if (activityCount > 1) {
        return complexFallback;
      }
    }

    return {
      venueType: "Best of " + city.name,
      location: city.name,
      searchQuery: "top points of interest and landmarks",
      requirements: ["curated highlights", "must-see landmarks"]
    };
  }

  private getFallbackComplexQuery(
    query: string,
    city: CityConfig,
    startTime: string
  ): ParsedComplexQuery {
    const segments = this.splitFallbackSegments(query);
    const parsedSegments = segments
      .map((segment, index) => this.parseFallbackSegment(segment, city, startTime, index))
      .filter((segment): segment is ParsedFallbackSegment => segment !== null);

    return {
      fixedAppointments: parsedSegments
        .filter((segment) => segment.scheduledTime)
        .map((segment) => ({
          time: segment.scheduledTime!,
          activity: segment.activity,
          location: segment.location,
          venuePreference: segment.venuePreference,
        })),
      flexibleActivities: parsedSegments
        .filter((segment) => segment.timeWindow)
        .map((segment) => ({
          timeWindow: segment.timeWindow!,
          activity: segment.activity,
          location: segment.location,
          venuePreference: segment.venuePreference,
          requirements: segment.requirements,
        })),
      preferences: {
        pace: parsedSegments.length >= 4 ? 'busy' : 'moderate',
        budget: this.inferFallbackBudget(query),
      },
    };
  }

  /**
   * Estimate travel time between locations (simplified)
   */
  private estimateTravelTime(from: string, to: string): number {
    // Same location
    if (from.toLowerCase() === to.toLowerCase()) {
      return 5;
    }

    // Different neighborhoods
    if (from.toLowerCase() !== to.toLowerCase()) {
      return 25; // Average tube/walk time between neighborhoods
    }

    return 15;
  }

  private buildPhotoUrl(photo?: { name?: string }): string | undefined {
    if (!photo?.name) {
      return undefined;
    }

    const params = new URLSearchParams({
      name: photo.name,
      maxWidthPx: '1200',
    });

    return `/api/place-photo?${params.toString()}`;
  }

  private buildCategories(activity: ParsedActivity, venue: DiscoveryResult['primary']): string[] {
    const categories = venue?.types
      ?.map((type) => this.humanizeCategory(type))
      .filter(Boolean) as string[] | undefined;

    if (categories && categories.length > 0) {
      return categories.slice(0, 2);
    }

    return this.buildFallbackCategories(activity);
  }

  private buildFallbackCategories(activity: ParsedActivity): string[] {
    return [this.humanizeCategory(activity.activity)];
  }

  private humanizeCategory(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\bpoi\b/gi, 'POI')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private buildStatusText(
    venue: DiscoveryResult['primary'],
    scheduledTime: string,
    planDate: string
  ): string | undefined {
    if (!venue) {
      return undefined;
    }

    const dayIndex = this.getDayIndex(planDate);
    const scheduledMinutes = parseTimeToMinutes(scheduledTime);
    const matchingPeriod = venue.openingHours?.periods?.find((period) => {
      if (period.open.day !== dayIndex) {
        return false;
      }

      const openMinutes = parseTimeToMinutes(period.open.time);
      const closeMinutes = period.close ? parseTimeToMinutes(period.close.time) : 24 * 60;

      return scheduledMinutes >= openMinutes && scheduledMinutes < closeMinutes;
    });

    if (matchingPeriod?.close?.time) {
      return `Open until ${formatTime12h(this.toColonTime(matchingPeriod.close.time))}`;
    }

    if (venue.isOpenNow === true) {
      return 'Open now';
    }

    if (venue.isOpenNow === false) {
      return 'Closed';
    }

    return venue.openingHours?.weekday_text?.[dayIndex];
  }

  private getDayIndex(planDate: string): number {
    const parsedDate = new Date(`${planDate}T12:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? new Date().getDay() : parsedDate.getDay();
  }

  private toColonTime(time: string): string {
    if (time.includes(':')) {
      return time;
    }

    return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
  }

  private splitFallbackSegments(query: string): string[] {
    const normalizedSegments = query
      .split(FALLBACK_SEGMENT_SPLIT_REGEX)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (normalizedSegments.length >= 2) {
      return normalizedSegments;
    }

    const matches = Array.from(query.matchAll(FALLBACK_ACTIVITY_REGEX));
    if (matches.length < 2) {
      return normalizedSegments.length > 0 ? normalizedSegments : [query.trim()];
    }

    return matches
      .map((match, index) => {
        const start = match.index ?? 0;
        const end = index + 1 < matches.length ? matches[index + 1].index ?? query.length : query.length;
        return query.slice(start, end).trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
      })
      .filter(Boolean);
  }

  private parseFallbackSegment(
    segment: string,
    city: CityConfig,
    startTime: string,
    index: number
  ): ParsedFallbackSegment | null {
    const cleanedSegment = segment.trim().replace(/\s+/g, ' ');
    if (!cleanedSegment) {
      return null;
    }

    const activity = this.extractFallbackActivity(cleanedSegment);
    const location = this.extractFallbackLocation(cleanedSegment, city);
    const scheduledTime = this.extractFallbackScheduledTime(cleanedSegment, activity);
    const timeWindow = scheduledTime
      ? undefined
      : this.inferFallbackTimeWindow(cleanedSegment, activity, startTime, index);
    const requirements = this.extractFallbackRequirements(cleanedSegment);

    return {
      activity,
      location,
      venuePreference: this.buildFallbackVenuePreference(
        cleanedSegment,
        activity,
        location,
        requirements
      ),
      requirements,
      scheduledTime,
      timeWindow,
    };
  }

  private extractFallbackActivity(segment: string): string {
    const match = segment.match(FALLBACK_ACTIVITY_REGEX)?.[0]?.toLowerCase();
    if (!match) {
      return 'activity';
    }

    switch (match) {
      case 'cocktail':
      case 'cocktails':
      case 'drinks':
        return 'drinks';
      case 'cafe':
      case 'tea':
        return 'coffee';
      case 'shop':
        return 'shopping';
      case 'stroll':
        return 'walk';
      case 'tour':
      case 'visit':
        return 'explore';
      default:
        return match;
    }
  }

  private extractFallbackLocation(segment: string, city: CityConfig): string {
    const neighborhood = this.findKnownNeighborhood(segment, city);
    if (neighborhood) {
      return neighborhood;
    }

    const locationMatch = segment.match(/\b(?:in|at|near|around|by)\s+([a-zA-Z][a-zA-Z\s'-]+?)(?=\s+(?:at|around|for|with|then)\b|$)/i);
    if (locationMatch?.[1]) {
      return this.titleCase(locationMatch[1].trim());
    }

    return city.name;
  }

  private findKnownNeighborhood(segment: string, city: CityConfig): string | undefined {
    const knownNeighborhoods = Array.from(
      new Set([
        ...city.neighborhoods,
        ...(city.slug === 'london' ? ['Holborn', 'Bloomsbury'] : []),
      ])
    );
    const normalizedSegment = segment.toLowerCase();

    return knownNeighborhoods.find((neighborhood) =>
      normalizedSegment.includes(neighborhood.toLowerCase())
    );
  }

  private extractFallbackScheduledTime(segment: string, activity: string): string | undefined {
    const explicitTimeMatch = segment.match(/\b(?:at|around|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (!explicitTimeMatch) {
      return undefined;
    }

    const rawHour = Number.parseInt(explicitTimeMatch[1], 10);
    const rawMinute = Number.parseInt(explicitTimeMatch[2] || '0', 10);
    const meridiem = explicitTimeMatch[3]?.toLowerCase();
    let hours = rawHour % 24;

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    } else if (!meridiem) {
      if ((activity === 'dinner' || activity === 'drinks' || activity === 'dessert') && hours < 12) {
        hours += 12;
      } else if (activity === 'breakfast' && hours >= 12) {
        hours -= 12;
      }
    }

    return `${hours.toString().padStart(2, '0')}:${rawMinute.toString().padStart(2, '0')}`;
  }

  private inferFallbackTimeWindow(
    segment: string,
    activity: string,
    startTime: string,
    index: number
  ): { earliest: string; latest: string } {
    const normalizedSegment = segment.toLowerCase();

    if (normalizedSegment.includes('morning')) {
      return { earliest: '08:00', latest: '11:00' };
    }
    if (normalizedSegment.includes('afternoon') || normalizedSegment.includes('after lunch')) {
      return { earliest: '14:00', latest: '17:00' };
    }
    if (normalizedSegment.includes('evening') || normalizedSegment.includes('night') || normalizedSegment.includes('after work')) {
      return { earliest: '18:00', latest: '21:00' };
    }

    switch (activity) {
      case 'breakfast':
        return { earliest: '08:00', latest: '10:30' };
      case 'brunch':
        return { earliest: '10:00', latest: '12:30' };
      case 'coffee':
        return { earliest: '09:00', latest: '11:30' };
      case 'lunch':
        return { earliest: '12:00', latest: '14:30' };
      case 'dinner':
      case 'supper':
        return { earliest: '18:00', latest: '21:30' };
      case 'drinks':
      case 'bar':
      case 'pub':
      case 'dessert':
        return { earliest: '19:00', latest: '22:00' };
      case 'museum':
      case 'gallery':
      case 'exhibit':
      case 'tour':
      case 'explore':
      case 'walk':
      case 'shopping':
        return { earliest: '10:00', latest: '16:30' };
      case 'work':
      case 'coworking':
        return { earliest: '09:00', latest: '17:00' };
      default: {
        const earliest = addMinutesToTime(startTime, index * 150);
        return {
          earliest,
          latest: addMinutesToTime(earliest, 120),
        };
      }
    }
  }

  private extractFallbackRequirements(segment: string): string[] {
    const requirementPatterns: Array<[RegExp, string]> = [
      [/\bquiet\b/i, 'quiet'],
      [/\bgood coffee\b/i, 'good coffee'],
      [/\bgood cocktails?\b/i, 'good cocktails'],
      [/\bgood cheese\b/i, 'good cheese selection'],
      [/\bupscale\b/i, 'upscale atmosphere'],
      [/\bhidden\b/i, 'hidden spot'],
      [/\bcool\b/i, 'cool atmosphere'],
      [/\bwifi\b/i, 'wifi'],
      [/\blaptop\b/i, 'laptop friendly'],
      [/\boutdoor|terrace|patio|rooftop\b/i, 'outdoor seating'],
    ];

    return requirementPatterns
      .filter(([pattern]) => pattern.test(segment))
      .map(([, label]) => label);
  }

  private buildFallbackVenuePreference(
    segment: string,
    activity: string,
    location: string,
    requirements: string[]
  ): string {
    const withoutLocation = segment.replace(
      new RegExp(`\\b(?:in|at|near|around|by)\\s+${this.escapeRegExp(location)}\\b`, 'i'),
      ''
    );
    const withoutTime = withoutLocation.replace(/\b(?:at|around|by)\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '');
    const cleaned = withoutTime
      .replace(/\b(?:morning|afternoon|evening|night|after work|after lunch)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[,;\s]+|[,;\s]+$/g, '');

    if (!cleaned || cleaned.toLowerCase() === activity) {
      return this.defaultVenuePreference(activity, requirements);
    }

    return cleaned;
  }

  private defaultVenuePreference(activity: string, requirements: string[]): string {
    const requirementsSuffix = requirements.length > 0 ? ` with ${requirements.join(', ')}` : '';

    switch (activity) {
      case 'coffee':
        return `cafe${requirementsSuffix}`;
      case 'lunch':
      case 'dinner':
      case 'supper':
        return `restaurant for ${activity}${requirementsSuffix}`;
      case 'drinks':
      case 'bar':
      case 'pub':
        return `bar${requirementsSuffix}`;
      case 'museum':
      case 'gallery':
      case 'exhibit':
        return `${activity}${requirementsSuffix}`;
      case 'work':
      case 'coworking':
        return `laptop-friendly cafe or coworking space${requirementsSuffix}`;
      default:
        return `${activity}${requirementsSuffix}`;
    }
  }

  private inferFallbackBudget(query: string): 'budget' | 'moderate' | 'expensive' {
    const normalizedQuery = query.toLowerCase();
    if (/\b(?:budget|cheap|affordable)\b/.test(normalizedQuery)) {
      return 'budget';
    }
    if (/\b(?:upscale|luxury|luxurious|high[- ]end|michelin|fancy)\b/.test(normalizedQuery)) {
      return 'expensive';
    }
    return 'moderate';
  }

  private titleCase(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Singleton export
let itineraryPlanner: ItineraryPlanner | null = null;

export function getItineraryPlanner(): ItineraryPlanner {
  if (!itineraryPlanner) {
    itineraryPlanner = new ItineraryPlanner();
  }
  return itineraryPlanner;
}
