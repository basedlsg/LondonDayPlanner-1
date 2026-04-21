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

class StubRouteTimeService {
  constructor(
    private readonly estimate = {
      durationMinutes: 12,
      durationText: '12 min',
      mode: 'transit' as const,
    }
  ) {}

  async estimateTravelTime() {
    return this.estimate;
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
      } as any,
      new StubRouteTimeService() as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-21',
        startTime: '09:00',
        query: 'lunch in Mayfair, dinner in Holborn',

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
    expect(itinerary.travelTimes).toEqual([
      {
        from: 'Mayfair',
        to: 'Holborn',
        durationMinutes: 12,
        durationText: '12 min',
        mode: 'transit',
      },
    ]);
  });

  it('keeps sequential coffee and lunch queries multi-stop when Gemini parsing fails', async () => {
    const venueDiscovery = new StubVenueDiscovery();
    const planner = new ItineraryPlanner(
      undefined,
      venueDiscovery as any,
      {
        generateContent: vi.fn().mockRejectedValue(new Error('Gemini unavailable')),
      } as any,
      new StubRouteTimeService() as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-21',
        startTime: '09:00',
        query: 'coffee in Shoreditch then lunch in Soho',

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

  it('keeps activity-led Austin meal queries multi-stop when Gemini parsing fails', async () => {
    const venueDiscovery = new StubVenueDiscovery();
    const planner = new ItineraryPlanner(
      undefined,
      venueDiscovery as any,
      {
        generateContent: vi.fn().mockRejectedValue(new Error('Gemini unavailable')),
      } as any,
      new StubRouteTimeService() as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-23',
        startTime: '11:00',
        query: 'Lunch near the capitol building Dinner downtown',

      },
      getCityConfig('austin')
    );

    expect(venueDiscovery.seenActivities).toHaveLength(2);
    expect(venueDiscovery.seenActivities.map((activity) => activity.activity)).toEqual([
      'lunch',
      'dinner',
    ]);
    expect(venueDiscovery.seenActivities.map((activity) => activity.location)).toEqual([
      'The Capitol Building',
      'Downtown',
    ]);
    expect(itinerary.venues).toHaveLength(2);
  });

  it('assigns smarter durations without changing selected venues', async () => {
    const venueDiscovery = new StubVenueDiscovery();
    const planner = new ItineraryPlanner(
      undefined,
      venueDiscovery as any,
      {
        generateContent: vi.fn().mockRejectedValue(new Error('Gemini unavailable')),
      } as any,
      new StubRouteTimeService({
        durationMinutes: 18,
        durationText: '18 min',
        mode: 'transit',
      }) as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-21',
        startTime: '09:00',
        query: 'coffee in Shoreditch then lunch in Soho',

      },
      getCityConfig('london')
    );

    expect(itinerary.venues.map((venue) => venue.name)).toEqual([
      'coffee venue in Shoreditch',
      'lunch venue in Soho',
    ]);
    expect(itinerary.venues.map((venue) => venue.duration)).toEqual([45, 90]);
    expect(itinerary.travelTimes?.[0]?.durationMinutes).toBe(18);
  });

  it('prefers the requested activity over noisy venue metadata when estimating stay length', async () => {
    const planner = new ItineraryPlanner(
      undefined,
      {
        discover: vi.fn().mockResolvedValue({
          primary: {
            placeId: 'lunch-downtown',
            name: 'Historic Bakery Hotel Restaurant',
            address: 'Downtown Austin, Austin',
            whyRecommended: 'A historic landmark restaurant inside a hotel',
            location: { lat: 30.2672, lng: -97.7431 },
            types: ['bakery', 'tourist_attraction'],
          },
          alternatives: [],
          searchInsights: 'stub',
        }),
      } as any,
      {
        generateContent: vi.fn().mockResolvedValue(JSON.stringify({
          venueType: 'lunch',
          searchQuery: 'restaurant for lunch',
          location: 'Downtown Austin',
          requirements: [],
        })),
      } as any,
      new StubRouteTimeService() as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-22',
        startTime: '12:00',
        query: 'lunch in Downtown Austin',

      },
      getCityConfig('austin')
    );

    expect(itinerary.venues[0]?.duration).toBe(90);
  });

  it('does not treat venue names like 24-hour diners as explicit stay durations', async () => {
    const planner = new ItineraryPlanner(
      undefined,
      {
        discover: vi.fn().mockResolvedValue({
          primary: {
            placeId: '24-diner',
            name: '24 Diner',
            address: 'Austin',
            whyRecommended: 'A 24-hour diner that works well for dinner',
            location: { lat: 30.2672, lng: -97.7431 },
            types: ['restaurant'],
          },
          alternatives: [],
          searchInsights: 'stub',
        }),
      } as any,
      {
        generateContent: vi.fn().mockResolvedValue(JSON.stringify({
          venueType: 'dinner',
          searchQuery: 'restaurant for dinner',
          location: 'Downtown Austin',
          requirements: [],
        })),
      } as any,
      new StubRouteTimeService() as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-22',
        startTime: '18:00',
        query: 'dinner in Downtown Austin',

      },
      getCityConfig('austin')
    );

    expect(itinerary.venues[0]?.duration).toBe(90);
  });

  it('promotes a non-duplicate alternative when two activities return the same primary venue', async () => {
    const discover = vi.fn()
      .mockResolvedValueOnce({
        primary: {
          placeId: 'tattu-london',
          name: 'Tattu London',
          address: 'The Now Building, London',
          whyRecommended: 'Popular dinner option in Soho',
          location: { lat: 51.5074, lng: -0.1278 },
          types: ['asian_restaurant'],
        },
        alternatives: [
          {
            placeId: 'florattica',
            name: 'Florattica Rooftop London',
            address: '11 Waterview Drive, London',
            whyRecommended: 'Great spot for drinks in Soho',
            location: { lat: 51.5075, lng: -0.1279 },
            types: ['bar'],
          },
        ],
        searchInsights: 'stub',
      })
      .mockResolvedValueOnce({
        primary: {
          placeId: 'tattu-london',
          name: 'Tattu London',
          address: 'The Now Building, London',
          whyRecommended: 'Great spot for drinks in Marylebone',
          location: { lat: 51.5074, lng: -0.1278 },
          types: ['asian_restaurant'],
        },
        alternatives: [
          {
            placeId: 'cahoots',
            name: 'Cahoots Underground',
            address: '13 Kingly Court, London',
            whyRecommended: 'Great spot for drinks in Marylebone',
            location: { lat: 51.5144, lng: -0.1421 },
            types: ['bar'],
          },
        ],
        searchInsights: 'stub',
      });

    const planner = new ItineraryPlanner(
      undefined,
      { discover } as any,
      {
        generateContent: vi.fn().mockResolvedValue(JSON.stringify({
          fixedAppointments: [
            {
              time: '19:30',
              activity: 'dinner',
              location: 'Soho',
              venuePreference: 'dinner',
            },
            {
              time: '22:00',
              activity: 'drinks',
              location: 'Marylebone',
              venuePreference: 'drinks',
            },
          ],
          flexibleActivities: [],
          preferences: {
            pace: 'moderate',
          },
        })),
      } as any,
      new StubRouteTimeService() as any
    );

    const itinerary = await planner.createPlan(
      {
        date: '2026-03-25',
        startTime: '18:00',
        query: 'dinner in Soho, drinks in Marylebone',

      },
      getCityConfig('london')
    );

    expect(itinerary.venues.map((venue) => venue.name)).toEqual([
      'Tattu London',
      'Cahoots Underground',
    ]);
  });
});
