// Itinerary Planner Service
// Main orchestration service for creating day plans

import { QueryClassifier, queryClassifier } from './QueryClassifier.js';
import { VenueDiscovery, getVenueDiscovery } from './VenueDiscovery.js';
import { GeminiClient, getGeminiClient } from '../lib/gemini.js';
import { simplePrompt } from '../lib/prompts/simple.js';
import { detailedPrompt } from '../lib/prompts/detailed.js';
import { complexPrompt } from '../lib/prompts/complex.js';
import { getDayOfWeek, formatTime12h, addMinutesToTime, getArrivalTimeInWindow } from '../lib/utils/time.js';
import {
  PlanRequest,
  CityConfig,
  Classification,
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

    // Premium Upgrade: Force Gemini 1.5 Pro (which we mapped to gemini-2.5-pro in gemini.ts) for premium users
    if (request.isPremium) {
      console.log(`[ItineraryPlanner] Premium user detected - Upgrading model to gemini-2.5-pro`);
      classification.model = 'gemini-2.5-pro';
    }

    console.log(`[ItineraryPlanner] Classification:`, classification);

    // Step 2: Parse with tier-appropriate model and prompt
    let parsed: any;
    try {
      parsed = await this.parseQuery(request, classification, cityConfig);
      console.log(`[ItineraryPlanner] Parsed query:`, JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.warn(`[ItineraryPlanner] AI Parsing failed, using curated fallback:`, error);
      parsed = this.getFallbackParsedQuery(request, cityConfig);
      // Fallback returns a ParsedSimpleQuery, so override tier to match
      classification.tier = 'simple';
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
    const itineraryData = this.buildItinerary(activities, venueResults, cityConfig);

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
    city: CityConfig
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
        venues.push({
          placeId: venue.placeId,
          name: venue.name,
          address: venue.formattedAddress || venue.address,
          location: city.coordinates, // Use city coordinates as fallback
          time: scheduledTime,  // iOS expects 'time' key
          duration: 60, // Default 1 hour
          categories: [],
          rating: venue.rating,
          alternatives: venueResult.alternatives,
          activityDescription: venue.whyRecommended,
        });
      } else {
        // No venue found - create placeholder
        venues.push({
          name: `${activity.activity} in ${activity.location}`,
          address: `${activity.location}, ${city.name}`,
          location: city.coordinates,
          time: scheduledTime,
          duration: 60,
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
  private getFallbackParsedQuery(request: PlanRequest, city: CityConfig): ParsedSimpleQuery {
    return {
      venueType: "Best of " + city.name,
      location: city.name,
      searchQuery: "top points of interest and landmarks",
      requirements: ["curated highlights", "must-see landmarks"]
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
}

// Singleton export
let itineraryPlanner: ItineraryPlanner | null = null;

export function getItineraryPlanner(): ItineraryPlanner {
  if (!itineraryPlanner) {
    itineraryPlanner = new ItineraryPlanner();
  }
  return itineraryPlanner;
}
