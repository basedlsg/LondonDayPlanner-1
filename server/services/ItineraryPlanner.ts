// Itinerary Planner Service
// Main orchestration service for creating day plans

import { QueryClassifier, queryClassifier } from './QueryClassifier';
import { VenueDiscovery, getVenueDiscovery } from './VenueDiscovery';
import { GeminiClient, getGeminiClient } from '../lib/gemini';
import { simplePrompt } from '../lib/prompts/simple';
import { detailedPrompt } from '../lib/prompts/detailed';
import { complexPrompt } from '../lib/prompts/complex';
import { getDayOfWeek, formatTime12h, addMinutesToTime, getArrivalTimeInWindow } from '../lib/utils/time';
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
} from '../types';

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
    console.log(`[ItineraryPlanner] Classification:`, classification);

    // Step 2: Parse with tier-appropriate model and prompt
    const parsed = await this.parseQuery(request, classification, cityConfig);
    console.log(`[ItineraryPlanner] Parsed query:`, JSON.stringify(parsed, null, 2));

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

    // Step 5: Build the final itinerary
    const itinerary = this.buildItinerary(activities, venueResults, cityConfig);
    console.log(`[ItineraryPlanner] Built itinerary with ${itinerary.places.length} places`);

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
   */
  private buildItinerary(
    activities: ParsedActivity[],
    venueResults: DiscoveryResult[],
    city: CityConfig
  ): Itinerary {
    const places: ItineraryPlace[] = [];
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

      // Build place entry
      if (venueResult.primary) {
        const venue = venueResult.primary;
        places.push({
          name: venue.name,
          address: venue.formattedAddress || venue.address,
          scheduledTime: scheduledTime,
          displayTime: formatTime12h(scheduledTime),
          rating: venue.rating,
          categories: [], // Could be derived from place types
          whyRecommended: venue.whyRecommended,
          isOpenNow: venue.isOpenNow,
          alternatives: venueResult.alternatives,
          placeId: venue.placeId,
        });
      } else {
        // No venue found - create placeholder
        places.push({
          name: `${activity.activity} in ${activity.location}`,
          address: `${activity.location}, ${city.name}`,
          scheduledTime: scheduledTime,
          displayTime: formatTime12h(scheduledTime),
          whyRecommended: 'No specific venue found - explore the area',
          alternatives: [],
        });
      }

      // Collect search insights
      if (venueResult.searchInsights) {
        searchInsights.push(venueResult.searchInsights);
      }

      // Calculate travel time to next activity
      if (i < activities.length - 1) {
        const nextActivity = activities[i + 1];
        const duration = this.estimateTravelTime(
          activity.location,
          nextActivity.location
        );
        travelTimes.push({
          duration: `${duration} min`,
          to: nextActivity.location,
        });
      }
    }

    return {
      places,
      travelTimes,
      searchInsights: searchInsights.length > 0 ? searchInsights : undefined,
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
