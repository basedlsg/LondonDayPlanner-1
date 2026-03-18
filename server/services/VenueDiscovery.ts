// Venue Discovery Service
// Orchestrates grounded search and Places API validation for finding venues

import { GroundedSearch, getGroundedSearch } from './GroundedSearch.js';
import { PlacesValidator, getPlacesValidator } from './PlacesValidator.js';
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
    const groundedResults = await this.groundedSearch.search(
      searchQuery,
      location,
      context
    );

    console.log(`[VenueDiscovery] Grounded search found ${groundedResults.venues.length} venues`);

    if (groundedResults.venues.length === 0) {
      // Fallback to direct Places API search
      console.log('[VenueDiscovery] Falling back to direct Places API search');
      return this.fallbackSearch(searchQuery, context);
    }

    // Step 2: Validate with Google Places API for accurate details
    const validated = await this.placesValidator.validate(
      groundedResults.venues,
      context.citySlug
    );

    console.log(`[VenueDiscovery] Validated ${validated.length} venues`);

    // Step 3: Filter by operating hours if time specified
    let filteredVenues = validated;
    if (activity.scheduledTime || activity.timeWindow) {
      const targetTime = activity.scheduledTime || activity.timeWindow?.earliest;
      if (targetTime) {
        filteredVenues = this.filterByOperatingHours(
          validated,
          targetTime,
          context.timezone || 'Europe/London'
        );
        console.log(`[VenueDiscovery] After hours filter: ${filteredVenues.length} venues`);
      }
    }

    // If all venues were filtered out, return unfiltered results with a note
    if (filteredVenues.length === 0 && validated.length > 0) {
      console.log('[VenueDiscovery] All venues filtered by hours, returning unfiltered with warning');
      return {
        primary: validated[0],
        alternatives: validated.slice(1, 4),
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
   * Fallback to direct Places API search when grounded search fails
   */
  private async fallbackSearch(
    searchQuery: string,
    context: SearchContext
  ): Promise<DiscoveryResult> {
    const venues = await this.placesValidator.searchVenues(
      `${searchQuery} in ${context.city}`,
      5
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
}

// Singleton export
let venueDiscovery: VenueDiscovery | null = null;

export function getVenueDiscovery(): VenueDiscovery {
  if (!venueDiscovery) {
    venueDiscovery = new VenueDiscovery();
  }
  return venueDiscovery;
}
