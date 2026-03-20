import { describe, expect, it, vi } from 'vitest';
import { getCityConfig } from '../config/cities.js';
import { DiscoveryResult, ParsedActivity } from '../types/index.js';
import { ItineraryPlanner } from './ItineraryPlanner.js';

class StubVenueDiscovery {
  public seenActivities: ParsedActivity[] = [];

  async discover(activity: ParsedActivity): Promise<DiscoveryResult> {
    this.seenActivities.push(activity);

    return {
      primary: {
        placeId: `${activity.activity}-${activity.location}`,
        name: `${activity.activity} venue in ${activity.location}`,
        address: `${activity.location}, London`,
        whyRecommended: activity.venuePreference || activity.activity,
        location: { lat: 51.5074, lng: -0.1278 },
        types: [activity.activity === 'coffee' ? 'cafe' : 'restaurant'],
      },
      alternatives: [],
      searchInsights: 'stub',
    };
  }
}

describe('ItineraryPlanner fallback parsing', () => {
  it('keeps a two-stop lunch and dinner query multi-stop when Gemini parsing fails', async () => {
    const venueDiscovery = new StubVenueDiscovery();
    const planner = new ItineraryPlanner(
      undefined,
      venueDiscovery as any,
      {
        generateContent: vi.fn().mockRejectedValue(new Error('Gemini unavailable')),
      } as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-21',
        startTime: '09:00',
        query: 'lunch in Mayfair, dinner in Holborn',
        isPremium: true,
      },
      getCityConfig('london')
    );

    expect(venueDiscovery.seenActivities).toHaveLength(2);
    expect(venueDiscovery.seenActivities.map((activity) => activity.location)).toEqual([
      'Mayfair',
      'Holborn',
    ]);
    expect(itinerary.venues).toHaveLength(2);
    expect(itinerary.venues.map((venue) => venue.name)).toEqual([
      'lunch venue in Mayfair',
      'dinner venue in Holborn',
    ]);
  });

  it('keeps sequential coffee and lunch queries multi-stop when Gemini parsing fails', async () => {
    const venueDiscovery = new StubVenueDiscovery();
    const planner = new ItineraryPlanner(
      undefined,
      venueDiscovery as any,
      {
        generateContent: vi.fn().mockRejectedValue(new Error('Gemini unavailable')),
      } as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-21',
        startTime: '09:00',
        query: 'coffee in Shoreditch then lunch in Soho',
        isPremium: true,
      },
      getCityConfig('london')
    );

    expect(venueDiscovery.seenActivities).toHaveLength(2);
    expect(venueDiscovery.seenActivities.map((activity) => activity.location)).toEqual([
      'Shoreditch',
      'Soho',
    ]);
    expect(itinerary.venues).toHaveLength(2);
  });
});
