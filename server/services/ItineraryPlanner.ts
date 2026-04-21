// Itinerary Planner Service
// Main orchestration service for creating day plans

import { QueryClassifier, queryClassifier } from './QueryClassifier.js';
import { VenueDiscovery, getVenueDiscovery } from './VenueDiscovery.js';
import { RouteTimeService, TravelEstimate, getRouteTimeService } from './RouteTimeService.js';
import { DEFAULT_GEMINI_FLASH_MODEL, GeminiClient, getGeminiClient } from '../lib/gemini.js';
import { getConfig } from '../config/index.js';
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

/** Maximum wall-clock time (ms) before we start cutting corners to return a result.
 * Vercel Hobby plan hard-kills functions at 60s. We must start cutting corners
 * well before that so we can still return a response instead of a timeout error.
 * Previously set to 70s which EXCEEDED the 60s Hobby limit — causing silent kills. */
const REQUEST_DEADLINE_MS = 45_000;

export class ItineraryPlanner {
  private classifier: QueryClassifier;
  private venueDiscovery: VenueDiscovery;
  private routeTimeService: RouteTimeService;
  private gemini: GeminiClient;

  constructor(
    classifier?: QueryClassifier,
    venueDiscovery?: VenueDiscovery,
    gemini?: GeminiClient,
    routeTimeService?: RouteTimeService
  ) {
    this.classifier = classifier || queryClassifier;
    this.venueDiscovery = venueDiscovery || getVenueDiscovery();
    this.gemini = gemini || getGeminiClient();
    this.routeTimeService = routeTimeService || getRouteTimeService();
  }

  /**
   * Create an itinerary from a user request
   */
  async createPlan(request: PlanRequest, cityConfig: CityConfig): Promise<Itinerary> {
    const totalStart = Date.now();
    console.log(`[ItineraryPlanner] Creating plan for query: "${request.query}"`);
    console.log(`[ItineraryPlanner] City: ${cityConfig.name}`);

    // Step 1: Classify the query
    const classifyStart = Date.now();
    const classification = this.classifier.classify(request.query);
    const classifyMs = Date.now() - classifyStart;

    console.log(`[ItineraryPlanner] Classification:`, classification);

    // Step 2: Parse with tier-appropriate model and prompt
    let parsed: any;
    let parsedVia: 'ai' | 'fallback' = 'ai';
    const parseStart = Date.now();
    try {
      parsed = await this.parseQuery(request, classification, cityConfig);
      console.log(`[ItineraryPlanner] Parsed query:`, JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.warn(`[ItineraryPlanner] AI Parsing failed, using curated fallback:`, error);
      parsed = this.getFallbackParsedQuery(request, cityConfig, classification.tier);
      parsedVia = 'fallback';
      console.log(`[ItineraryPlanner] Fallback parsed query:`, JSON.stringify(parsed, null, 2));
    }
    const parseMs = Date.now() - parseStart;

    // Step 3: Convert parsed data to activities
    const extractStart = Date.now();
    const activities = this.extractActivities(parsed, classification.tier, request.startTime);
    const extractMs = Date.now() - extractStart;
    console.log(`[ItineraryPlanner] Extracted ${activities.length} activities`);

    // Step 4: Discover venues for each activity
    // If parsing was slow, check deadline before starting discovery
    const preDiscoverElapsed = Date.now() - totalStart;
    if (preDiscoverElapsed > REQUEST_DEADLINE_MS) {
      console.log(`[ItineraryPlanner] Deadline exceeded before discovery (${preDiscoverElapsed}ms), using fast Places-only search`);
    }
    const searchContext = this.buildSearchContext(request, cityConfig);
    const discoverStart = Date.now();
    const venueResults = await this.discoverVenuesForActivities(
      activities,
      searchContext,
      classification.tier,
      totalStart
    );
    const discoverMs = Date.now() - discoverStart;

    // Step 5: Build the final itinerary with all required fields for iOS decoding
    const buildStart = Date.now();
    const itineraryData = await this.buildItinerary(activities, venueResults, cityConfig, request.date, totalStart);
    const buildMs = Date.now() - buildStart;

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
    const totalMs = Date.now() - totalStart;
    console.log('[ItineraryPlanner][timing]', {
      model: classification.model,
      parsedVia,
      classifyMs,
      parseMs,
      extractMs,
      discoverMs,
      buildMs,
      totalMs,
      deadlineBudgetMs: REQUEST_DEADLINE_MS,
      overDeadline: totalMs > REQUEST_DEADLINE_MS,
    });

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
        suggestedDurationMinutes: this.parseStayDurationMinutes((query as ParsedDetailedQuery).stayDuration),
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

  private parseStayDurationMinutes(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const match = value.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/);
    if (!match) {
      return undefined;
    }

    const amount = Number.parseFloat(match[1]);
    if (Number.isNaN(amount) || amount <= 0) {
      return undefined;
    }

    return match[2].startsWith('h') ? Math.round(amount * 60) : Math.round(amount);
  }

  /**
   * Discover venues for all activities in parallel
   */
  private async discoverVenuesForActivities(
    activities: ParsedActivity[],
    context: SearchContext,
    tier: string,
    requestStartTime?: number
  ): Promise<DiscoveryResult[]> {
    // If we're already past the deadline, use fast Places-only search (skip grounded Gemini)
    const pastDeadline = requestStartTime ? (Date.now() - requestStartTime) > REQUEST_DEADLINE_MS : false;

    const results = await Promise.all(
      activities.map(async (activity) => {
        if (pastDeadline) {
          // Fast path: skip 18s grounded search, go straight to Places API (~5s)
          const location = `${activity.location}, ${context.city}`;
          const searchQuery = activity.venuePreference || activity.activity;
          const venues = await this.venueDiscovery.fastPlacesSearch(searchQuery, location, activity, context);
          return venues;
        }
        return this.venueDiscovery.discover(activity, context, tier as any);
      })
    );
    return results;
  }

  /**
   * Build the final itinerary from activities and discovered venues
   * Output format matches iOS Itinerary structure exactly
   */
  private async buildItinerary(
    activities: ParsedActivity[],
    venueResults: DiscoveryResult[],
    city: CityConfig,
    planDate: string,
    requestStartTime?: number
  ): Promise<{ venues: ItineraryPlace[]; travelTimes: TravelTime[]; searchInsights?: string[] }> {
    const venues: ItineraryPlace[] = [];
    const searchInsights: string[] = [];
    const usedVenueKeys = new Set<string>();
    const photoRefs: Array<{
      venueIndex: number;
      primary?: { name?: string };
      all?: Array<{ name?: string }>;
      altPhotos: Array<{ first?: { name?: string }; all?: Array<{ name?: string }> }>;
    }> = [];

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const venueResult = this.selectDistinctVenueResult(venueResults[i], usedVenueKeys);

      // Determine scheduled time
      let scheduledTime = activity.scheduledTime;
      if (!scheduledTime && activity.timeWindow) {
        scheduledTime = getArrivalTimeInWindow(
          activity.timeWindow.earliest,
          activity.timeWindow.latest
        );
      }
      scheduledTime = scheduledTime || '09:00';
      const durationMinutes = this.estimateVenueDurationMinutes(activity, venueResult.primary);

      // Build place entry matching iOS ScheduledPlace structure
      if (venueResult.primary) {
        const venue = venueResult.primary;
        const venueKey = this.venueIdentity(venue);
        const alternatives = venueResult.alternatives.map((alternative) => ({
          ...alternative,
          whyRecommended: this.cleanActivityDescription(alternative.description)
            ?? this.cleanActivityDescription(alternative.whyRecommended),
        }));

        const venueIndex = venues.length;
        venues.push({
          placeId: venue.placeId,
          name: venue.name,
          address: venue.formattedAddress || venue.address,
          location: venue.location || city.coordinates,
          time: scheduledTime,  // iOS expects 'time' key
          duration: durationMinutes,
          categories: this.buildCategories(activity, venue),
          rating: venue.rating,
          alternatives,
          activityDescription: this.cleanActivityDescription(venue.description)
            ?? this.cleanActivityDescription(venue.whyRecommended),
          statusText: this.buildStatusText(venue, scheduledTime, planDate),
          isOpenNow: venue.isOpenNow,
          phoneNumber: venue.phoneNumber,
        });
        photoRefs.push({
          venueIndex,
          primary: venue.photos?.[0],
          all: venue.photos,
          altPhotos: venueResult.alternatives.map((alt) => ({
            first: alt.photos?.[0],
            all: alt.photos,
          })),
        });

        if (venueKey) {
          usedVenueKeys.add(venueKey);
        }
      } else {
        // No venue found - create placeholder
        venues.push({
          name: `${activity.activity} in ${activity.location}`,
          address: `${activity.location}, ${city.name}`,
          location: city.coordinates,
          time: scheduledTime,
          duration: durationMinutes,
          categories: this.buildFallbackCategories(activity),
          activityDescription: 'No specific venue found - explore the area',
          alternatives: [],
        });
      }

      // Collect search insights
      if (venueResult.searchInsights) {
        searchInsights.push(venueResult.searchInsights);
      }

    }

    // Skip Routes API calls if we're running out of time — use haversine fallbacks instead
    const elapsedMs = requestStartTime ? Date.now() - requestStartTime : 0;
    const skipRoutes = elapsedMs > REQUEST_DEADLINE_MS;
    if (skipRoutes) {
      console.log(`[ItineraryPlanner] Deadline approaching (${elapsedMs}ms elapsed), skipping Routes API`);
    }

    const travelEstimates = skipRoutes
      ? activities.slice(0, -1).map((activity, index) =>
          this.estimateLabelFallbackTravelTime(activity.location, activities[index + 1].location)
        )
      : await Promise.all(
          activities.slice(0, -1).map((activity, index) =>
            this.estimateLegTravelTime(
              activity.location,
              activities[index + 1].location,
              venues[index],
              venues[index + 1],
              venueResults[index],
              venueResults[index + 1],
              planDate,
              city.timezone
            )
          )
        );

    const travelTimes = travelEstimates.map((estimate, index) => ({
      from: activities[index].location,
      to: activities[index + 1].location,
      durationMinutes: estimate.durationMinutes,
      durationText: estimate.durationText,
      mode: estimate.mode,
    }));

    // Resolve all photo URLs in parallel (direct Google CDN links instead of proxy)
    await Promise.all(photoRefs.map(async (ref) => {
      const venue = venues[ref.venueIndex];

      const [photoUrl, photoUrls, ...altResults] = await Promise.all([
        this.resolvePhotoUrl(ref.primary),
        this.resolvePhotoUrls(ref.all),
        ...ref.altPhotos.map(async (altRef) => ({
          photoUrl: await this.resolvePhotoUrl(altRef.first),
          photoUrls: await this.resolvePhotoUrls(altRef.all),
        })),
      ]);

      venue.photoUrl = photoUrl;
      venue.photoUrls = photoUrls;
      if (venue.alternatives && altResults.length > 0) {
        venue.alternatives.forEach((alt, i) => {
          if (altResults[i]) {
            alt.photoUrl = altResults[i].photoUrl;
            alt.photoUrls = altResults[i].photoUrls;
          }
        });
      }
    }));

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

  private async estimateLegTravelTime(
    fromLabel: string,
    toLabel: string,
    fromVenue: ItineraryPlace,
    toVenue: ItineraryPlace,
    fromDiscovery: DiscoveryResult,
    toDiscovery: DiscoveryResult,
    planDate: string,
    timezone: string
  ): Promise<TravelEstimate> {
    const hasPreciseLocations = Boolean(fromDiscovery.primary?.location && toDiscovery.primary?.location);
    if (!hasPreciseLocations) {
      return this.estimateLabelFallbackTravelTime(fromLabel, toLabel);
    }

    return this.routeTimeService.estimateTravelTime(
      fromVenue.location,
      toVenue.location,
      {
        departureTime: addMinutesToTime(fromVenue.time, fromVenue.duration ?? 60),
        planDate,
        timezone,
      }
    );
  }

  private estimateLabelFallbackTravelTime(from: string, to: string): TravelEstimate {
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      return {
        durationMinutes: 5,
        durationText: '5 min',
        mode: 'walking',
      };
    }

    return {
      durationMinutes: 20,
      durationText: '20 min',
      mode: 'transit',
    };
  }

  private estimateVenueDurationMinutes(
    activity: ParsedActivity,
    venue?: DiscoveryResult['primary']
  ): number {
    if (activity.suggestedDurationMinutes) {
      return this.clampDuration(activity.suggestedDurationMinutes);
    }

    const explicitDuration = this.extractExplicitDurationMinutes([
      activity.activity,
      activity.venuePreference,
      ...(activity.requirements || []),
    ]);
    if (explicitDuration) {
      return this.clampDuration(explicitDuration);
    }

    const activitySignals = [
      activity.activity,
      activity.venuePreference,
      ...(activity.requirements || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const activityDuration = this.estimateDurationFromSignals(activitySignals);
    if (activityDuration) {
      return activityDuration;
    }

    const venueSignals = [
      ...(venue?.types || []),
      venue?.name,
      venue?.whyRecommended,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return this.estimateDurationFromSignals(venueSignals) ?? 60;
  }

  private cleanActivityDescription(description?: string): string | undefined {
    const value = description?.trim();
    if (!value) {
      return undefined;
    }

    const normalized = value.toLowerCase();
    const genericPatterns = [
      /^matches your search(?: criteria)?$/,
      /^popular local pick$/,
      /^recommended for /,
      /^good stop for coffee(?: in .+)?$/,
      /^great spot for drinks(?: in .+)?$/,
      /^popular (?:breakfast|brunch|lunch|dinner) option(?: in .+)?$/,
      /^popular dessert stop(?: in .+)?$/,
      /^good cultural stop(?: in .+)?$/,
      /^good place to explore(?: in .+)?$/,
    ];

    if (genericPatterns.some((pattern) => pattern.test(normalized))) {
      return undefined;
    }

    return value;
  }

  private estimateDurationFromSignals(signals: string): number | undefined {
    if (!signals) {
      return undefined;
    }

    if (/\b(?:breakfast|coffee|cafe|tea|bakery|dessert|ice cream)\b/.test(signals)) {
      return 45;
    }

    if (/\b(?:michelin|fine dining|tasting menu|degustation|omakase|chef['’]s table)\b/.test(signals)) {
      return 120;
    }

    if (/\b(?:lunch|dinner|brunch|restaurant|bistro|grill|steakhouse|meal)\b/.test(signals)) {
      return 90;
    }

    if (/\b(?:bar|pub|drinks?|cocktail|rooftop|wine|brewery)\b/.test(signals)) {
      return 90;
    }

    if (/\b(?:museum|gallery|exhibit|exhibition|aquarium|zoo|historic|tour|sightseeing)\b/.test(signals)) {
      return 120;
    }

    if (/\b(?:park|garden|walk|stroll|trail|hike|market|shopping|shop|store|boutique|mall|explore|visit)\b/.test(signals)) {
      return 90;
    }

    if (/\b(?:appointment|reservation|meeting)\b/.test(signals)) {
      return 60;
    }

    if (/\b(?:cowork|working|work)\b/.test(signals)) {
      return 180;
    }

    return undefined;
  }

  private extractExplicitDurationMinutes(signals: Array<string | undefined>): number | undefined {
    const combined = signals.filter(Boolean).join(' ').toLowerCase();
    const match = combined.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/);
    if (!match) {
      return undefined;
    }

    const value = Number.parseFloat(match[1]);
    if (Number.isNaN(value) || value <= 0) {
      return undefined;
    }

    const unit = match[2];
    const minutes = unit.startsWith('h') ? value * 60 : value;
    return minutes;
  }

  private clampDuration(minutes: number): number {
    const rounded = Math.round(minutes / 15) * 15;
    return Math.max(30, Math.min(rounded, 240));
  }

  private selectDistinctVenueResult(
    venueResult: DiscoveryResult,
    usedVenueKeys: Set<string>
  ): DiscoveryResult {
    const candidates = [venueResult.primary, ...venueResult.alternatives]
      .filter((venue): venue is NonNullable<DiscoveryResult['primary']> => Boolean(venue));

    if (candidates.length === 0) {
      return venueResult;
    }

    const primary = candidates.find((candidate) => {
      const key = this.venueIdentity(candidate);
      return !key || !usedVenueKeys.has(key);
    }) ?? venueResult.primary;

    const selectedKey = this.venueIdentity(primary);
    const alternatives = candidates.filter((candidate) => {
      if (candidate === primary) {
        return false;
      }

      const key = this.venueIdentity(candidate);
      if (!key) {
        return true;
      }

      if (selectedKey && key === selectedKey) {
        return false;
      }

      return !usedVenueKeys.has(key);
    });

    return {
      ...venueResult,
      primary,
      alternatives,
    };
  }

  private venueIdentity(
    venue?: {
      placeId?: string;
      name?: string;
      formattedAddress?: string;
      address?: string;
    }
  ): string | undefined {
    if (!venue) {
      return undefined;
    }

    if (venue.placeId) {
      return venue.placeId;
    }

    const normalizedName = venue.name?.toLowerCase().trim();
    const normalizedAddress = (venue.formattedAddress || venue.address)?.toLowerCase().trim();

    if (!normalizedName) {
      return normalizedAddress;
    }

    if (!normalizedAddress) {
      return normalizedName;
    }

    return `${normalizedName}::${normalizedAddress}`;
  }

  private async resolvePhotoUrl(photo?: { name?: string }, maxWidthPx = 520): Promise<string | undefined> {
    if (!photo?.name) {
      return undefined;
    }

    try {
      const encodedName = photo.name
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

      const endpoint = new URL(`https://places.googleapis.com/v1/${encodedName}/media`);
      endpoint.searchParams.set('maxWidthPx', String(maxWidthPx));
      endpoint.searchParams.set('skipHttpRedirect', 'true');

      const response = await fetch(endpoint, {
        headers: { 'X-Goog-Api-Key': getConfig().placesApiKey },
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        return this.buildProxyPhotoUrl(photo, maxWidthPx);
      }

      const data = (await response.json()) as { photoUri?: string };
      return data.photoUri || this.buildProxyPhotoUrl(photo, maxWidthPx);
    } catch {
      return this.buildProxyPhotoUrl(photo, maxWidthPx);
    }
  }

  private buildProxyPhotoUrl(photo: { name?: string }, maxWidthPx = 520): string | undefined {
    if (!photo?.name) return undefined;
    const params = new URLSearchParams({ name: photo.name, maxWidthPx: String(maxWidthPx) });
    return `/api/place-photo?${params.toString()}`;
  }

  private async resolvePhotoUrls(photos?: Array<{ name?: string }>): Promise<string[] | undefined> {
    if (!photos || photos.length === 0) return undefined;

    const urls = await Promise.all(photos.map((photo) => this.resolvePhotoUrl(photo)));
    const valid = urls.filter((url): url is string => Boolean(url));
    if (valid.length === 0) return undefined;
    return Array.from(new Set(valid));
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
