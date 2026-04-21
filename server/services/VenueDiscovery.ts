// Venue Discovery Service
// Orchestrates grounded search and Places API validation for finding venues

import { GroundedSearch, getGroundedSearch } from './GroundedSearch.js';
import { PlacesValidator, getPlacesValidator } from './PlacesValidator.js';
import { getCityConfig } from '../config/cities.js';
import {
  SearchContext,
  ParsedActivity,
  QueryTier,
  DiscoveryResult,
  ValidatedVenue,
} from '../types/index.js';

export class VenueDiscovery {
  private groundedSearch: GroundedSearch;
  private placesValidator: PlacesValidator;

  constructor(
    groundedSearch?: GroundedSearch,
    placesValidator?: PlacesValidator
  ) {
    this.groundedSearch = groundedSearch || getGroundedSearch();
    this.placesValidator = placesValidator || getPlacesValidator();
  }

  /**
   * Discover venues for an activity using the hybrid search strategy
   * 1. Use Gemini grounded search to find current venue recommendations
   * 2. Validate with Google Places API for accurate details
   * 3. Filter by operating hours if time specified
   */
  async discover(
    activity: ParsedActivity,
    context: SearchContext,
    tier: QueryTier
  ): Promise<DiscoveryResult> {
    // Build the location string
    const location = this.buildLocationString(activity.location, context.city);

    // Build the search query based on activity details
    const searchQuery = this.buildSearchQuery(activity);

    console.log(`[VenueDiscovery] Searching for: "${searchQuery}" in ${location}`);

    // Step 1: Use grounded search to find current venue recommendations
    const groundedStart = Date.now();
    const groundedResults = await this.groundedSearch.search(
      searchQuery,
      location,
      context
    );
    const groundedMs = Date.now() - groundedStart;

    console.log(`[VenueDiscovery] Grounded search found ${groundedResults.venues.length} venues (${groundedMs}ms)`);

    if (groundedResults.venues.length === 0) {
      // Fallback to direct Places API search
      console.log('[VenueDiscovery] Falling back to direct Places API search');
      return this.fallbackSearch(searchQuery, location, activity, context);
    }

    // Step 2: Validate with Google Places API for accurate details
    const validateStart = Date.now();
    const validated = await this.placesValidator.validate(
      groundedResults.venues,
      context.citySlug
    );
    const validateMs = Date.now() - validateStart;

    console.log(`[VenueDiscovery] Validated ${validated.length} venues (${validateMs}ms)`);

    // Step 3: Filter by operating hours if time specified
    let filteredVenues = this.rerankVenues(validated, activity.location);
    if (activity.scheduledTime || activity.timeWindow) {
      const targetTime = activity.scheduledTime || activity.timeWindow?.earliest;
      if (targetTime) {
        filteredVenues = this.filterByOperatingHours(
          filteredVenues,
          targetTime,
          context.timezone || 'Europe/London'
        );
        filteredVenues = this.rerankVenues(filteredVenues, activity.location);
        console.log(`[VenueDiscovery] After hours filter: ${filteredVenues.length} venues`);
      }
    }

    // If all venues were filtered out, return unfiltered results with a note
    if (filteredVenues.length === 0 && validated.length > 0) {
      const rerankedValidated = this.rerankVenues(validated, activity.location);
      console.log('[VenueDiscovery] All venues filtered by hours, returning unfiltered with warning');
      return {
        primary: rerankedValidated[0],
        alternatives: rerankedValidated.slice(1, 4),
        searchInsights: `${groundedResults.searchInsights || ''} Note: Opening hours couldn't be verified for all venues.`.trim(),
      };
    }

    return {
      primary: filteredVenues[0],
      alternatives: filteredVenues.slice(1, 4),
      searchInsights: groundedResults.searchInsights,
    };
  }

  /**
   * Fast Places-only search (skips grounded Gemini). Used when request is near deadline.
   */
  async fastPlacesSearch(
    searchQuery: string,
    location: string,
    activity: ParsedActivity,
    context: SearchContext
  ): Promise<DiscoveryResult> {
    console.log(`[VenueDiscovery] Fast Places-only search for: "${searchQuery}" in ${location}`);
    return this.fallbackSearch(searchQuery, location, activity, context);
  }

  /**
   * Fallback to direct Places API search when grounded search fails
   */
  private async fallbackSearch(
    searchQuery: string,
    location: string,
    activity: ParsedActivity,
    context: SearchContext
  ): Promise<DiscoveryResult> {
    const cityConfig = getCityConfig(context.citySlug);
    const venues = this.rerankVenues(
      await this.placesValidator.searchVenues(
        `${searchQuery} in ${location}`,
        5,
        {
          activity: activity.activity,
          location: activity.location,
          venuePreference: activity.venuePreference,
          requirements: activity.requirements,
        },
        cityConfig.coordinates
      ),
      activity.location
    );

    return {
      primary: venues[0],
      alternatives: venues.slice(1, 4),
      searchInsights: 'Results from Google Places',
    };
  }

  /**
   * Build the location string for search
   */
  private buildLocationString(location: string, city: string): string {
    // If location already includes city name, use as-is
    const cityLower = city.toLowerCase();
    const locationLower = location.toLowerCase();

    if (locationLower.includes(cityLower)) {
      return location;
    }

    // Handle relative locations
    if (location === 'near previous' || location === 'same area') {
      return city; // Will be handled by context in actual implementation
    }

    return `${location}, ${city}`;
  }

  /**
   * Build the search query from activity details
   */
  private buildSearchQuery(activity: ParsedActivity): string {
    const parts: string[] = [];

    // Start with venue preference if available
    if (activity.venuePreference) {
      parts.push(activity.venuePreference);
    } else {
      parts.push(activity.activity);
    }

    // Add requirements
    if (activity.requirements && activity.requirements.length > 0) {
      const requirementStr = activity.requirements
        .slice(0, 3) // Limit to avoid overly long queries
        .join(' ');
      parts.push(`with ${requirementStr}`);
    }

    return parts.join(' ');
  }

  /**
   * Filter venues by operating hours
   */
  private filterByOperatingHours(
    venues: ValidatedVenue[],
    targetTime: string,
    timezone: string
  ): ValidatedVenue[] {
    // Parse target time (HH:MM format)
    const [hours, minutes] = targetTime.split(':').map(Number);
    const targetMinutes = hours * 60 + (minutes || 0);

    return venues.filter((venue) => {
      // If we have real-time open status, use it
      if (typeof venue.isOpenNow === 'boolean') {
        return venue.isOpenNow;
      }

      // If we have opening hours, check against target time
      if (venue.openingHours?.periods) {
        return this.isOpenAtTime(venue.openingHours.periods, targetMinutes);
      }

      // If we don't have hours info, include the venue (assume open)
      return true;
    });
  }

  /**
   * Check if a venue is open at a specific time
   */
  private isOpenAtTime(
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>,
    targetMinutes: number
  ): boolean {
    const today = new Date().getDay(); // 0 = Sunday

    for (const period of periods) {
      if (period.open.day !== today) continue;

      const openTime = this.parseTimeToMinutes(period.open.time);
      const closeTime = period.close
        ? this.parseTimeToMinutes(period.close.time)
        : 24 * 60; // Assume closes at midnight if no close time

      if (targetMinutes >= openTime && targetMinutes < closeTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse time string (HHMM) to minutes since midnight
   */
  private parseTimeToMinutes(time: string): number {
    const hours = parseInt(time.slice(0, 2), 10);
    const minutes = parseInt(time.slice(2, 4), 10) || 0;
    return hours * 60 + minutes;
  }

  private rerankVenues(
    venues: ValidatedVenue[],
    requestedLocation: string
  ): ValidatedVenue[] {
    const locationHint = this.normalizeLocationHint(requestedLocation);
    if (!locationHint) {
      return venues;
    }

    return [...venues].sort((left, right) => {
      const scoreDelta =
        this.locationRelevanceScore(right, locationHint)
        - this.locationRelevanceScore(left, locationHint);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (right.rating ?? 0) - (left.rating ?? 0);
    });
  }

  private locationRelevanceScore(
    venue: ValidatedVenue,
    locationHint: string
  ): number {
    const haystack = `${venue.formattedAddress ?? ''} ${venue.address ?? ''}`.toLowerCase();
    if (!haystack) {
      return 0;
    }

    if (haystack.includes(locationHint)) {
      return 100;
    }

    return locationHint
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .reduce((score, token) => score + (haystack.includes(token) ? 10 : 0), 0);
  }

  private normalizeLocationHint(location: string): string {
    const normalized = location
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (
      !normalized
      || normalized === 'same area'
      || normalized === 'near previous'
    ) {
      return '';
    }

    return normalized;
  }
}

// Singleton export
let venueDiscovery: VenueDiscovery | null = null;

export function getVenueDiscovery(): VenueDiscovery {
  if (!venueDiscovery) {
    venueDiscovery = new VenueDiscovery();
  }
  return venueDiscovery;
}
