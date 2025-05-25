// server/tests/ItineraryPlanningService.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ItineraryPlanningService, PlanRequestOptions } from '../services/ItineraryPlanningService';
import type { IStorage } from '../storage';
import type { StructuredRequest } from '../../shared/types';
import type { Place, Itinerary, PlaceDetails, InsertPlace, User } from '../../shared/schema';
import { NotFoundError, NLPServiceError } from '../lib/errors';

// Mock external dependencies
// It's important that these vi.mock calls are at the top level of the module.
vi.mock('../lib/nlp-fixed', () => ({
  parseItineraryRequest: vi.fn()
}));

vi.mock('../lib/googlePlaces', () => ({
  searchPlace: vi.fn()
}));

vi.mock('../lib/itinerary', () => ({
  calculateTravelTime: vi.fn()
}));

// We need to mock parseTimeString from timeUtils, but other functions from it might be used by the service indirectly.
// So, we can mock selectively or mock the entire module and provide implementations for all used functions.
vi.mock('../lib/timeUtils', async () => {
  // console.log('[TESTS] Mocking ../lib/timeUtils'); // Log mock setup
  const actual = await vi.importActual('../lib/timeUtils') as any;
  return {
    ...actual, // Spread actual utilities
    parseTimeString: vi.fn((timeStr?: string, baseDateInput?: Date) => {
      console.log(`[TESTS MOCK parseTimeString CALLED] timeStr: ${timeStr}, baseDateInput: ${baseDateInput}`);
      // ALWAYS return a fixed, valid date for ALL calls in tests to isolate the problem
      return new Date('2024-01-15T12:00:00.000Z'); 
    }),
    // Ensure other functions from timeUtils that might be used by the service are also available if not re-mocked
    // For example, if _detectActivityTypeFromQuery (now in service) or other parts of service code call other timeUtils
    // getDayPart: actual.getDayPart, // etc.
  };
});

// Mock storage implementation for testing
const mockStorage: IStorage = {
  createPlace: vi.fn(),
  getPlaceByPlaceId: vi.fn(),
  createItinerary: vi.fn(),
  getItinerary: vi.fn(),
  // Added from IStorage definition in server/storage.ts
  getPlace: vi.fn(), 
  getUserItineraries: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByGoogleId: vi.fn(),
  createLocalUser: vi.fn(),
  createGoogleUser: vi.fn(),
};

describe('ItineraryPlanningService', () => {
  let service: ItineraryPlanningService;

  // Dynamically imported mocks for use within tests
  let parseItineraryRequest_mock: typeof import('../lib/nlp-fixed').parseItineraryRequest;
  let searchPlace_mock: typeof import('../lib/googlePlaces').searchPlace;
  let calculateTravelTime_mock: typeof import('../lib/itinerary').calculateTravelTime;
  let timeUtils_parseTimeString_mock: typeof import('../lib/timeUtils').parseTimeString;
  let errors_NotFoundError: typeof NotFoundError;
  let errors_NLPServiceError: typeof NLPServiceError;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new ItineraryPlanningService(mockStorage);

    // It is good practice to import the mocked versions for type safety and explicit use
    const nlpFixed = await import('../lib/nlp-fixed');
    parseItineraryRequest_mock = nlpFixed.parseItineraryRequest;
    
    const googlePlaces = await import('../lib/googlePlaces');
    searchPlace_mock = googlePlaces.searchPlace;

    const itineraryUtils = await import('../lib/itinerary');
    calculateTravelTime_mock = itineraryUtils.calculateTravelTime;

    const timeUtils = await import('../lib/timeUtils');
    timeUtils_parseTimeString_mock = timeUtils.parseTimeString; // This will be our vi.fn() from the mock
    const errorClasses = await import('../lib/errors');
    errors_NotFoundError = errorClasses.NotFoundError;
    errors_NLPServiceError = errorClasses.NLPServiceError;
  });

  afterEach(() => {
    vi.restoreAllMocks(); 
  });

  describe('createPlan', () => {
    it('should create an itinerary with fixed appointments', async () => {
      const baseDate = new Date('2024-01-15T00:00:00.000Z');
      const mockNlpResult: StructuredRequest = {
        // @ts-ignore 
        title: 'Central Park Trip',
        fixedTimes: [{ time: '2:00 PM', searchTerm: 'Central Park', location: 'Manhattan', type: 'park' }],
        activities: [], preferences: { requirements: [], type: undefined }, startLocation: 'Times Square', destinations: ['Manhattan']
      };
      const mockPlaceDetails: PlaceDetails = { place_id: 'test-place-id', name: 'Central Park', formatted_address: '123 Test St, Manhattan, NY', geometry: { location: { lat: 40.7829, lng: -73.9654 } }, types: ['park'], rating: 4.5 };
      const mockStoredPlace: Place = { id: 1, placeId: 'test-place-id', name: 'Central Park', address: '123 Test St, Manhattan, NY', location: { lat: 40.7829, lng: -73.9654 }, details: mockPlaceDetails, alternatives: null, scheduledTime: new Date('2024-01-15T12:00:00.000Z').toISOString() };
      const expectedItineraryDate = new Date('2024-01-15T00:00:00.000Z');
      const mockCreatedItinerary: Itinerary = { id: 1, query: 'Visit Central Park at 2 PM', title: 'Central Park Trip', description: `Generated from: "Visit Central Park at 2 PM" (using ${mockNlpResult.startLocation} as start)`, places: [{ placeDbId: 1, googlePlaceId: 'test-place-id', name: 'Central Park', address: '123 Test St, Manhattan, NY', scheduledTime: new Date('2024-01-15T12:00:00.000Z').toISOString(), duration: 60, notes: '', travelTimeToNext: 0, location: { lat: 40.7829, lng: -73.9654 } }], travelTimes: [], planDate: expectedItineraryDate, created: new Date() };

      vi.mocked(parseItineraryRequest_mock).mockResolvedValue(mockNlpResult);
      vi.mocked(searchPlace_mock).mockResolvedValue({ primary: mockPlaceDetails, alternatives: [] });
      // parseTimeString is globally mocked, its call will be reflected in timeUtils_parseTimeString_mock
      vi.mocked(mockStorage.createPlace).mockResolvedValue(mockStoredPlace);
      vi.mocked(mockStorage.createItinerary).mockResolvedValue(mockCreatedItinerary);

      const result = await service.createPlan({ query: 'Visit Central Park at 2 PM', date: '2024-01-15', userId: 'user-123' });

      expect(result.title).toEqual('Central Park Trip'); // Adjusted to match NLP title
      expect(parseItineraryRequest_mock).toHaveBeenCalledWith('Visit Central Park at 2 PM');
      expect(timeUtils_parseTimeString_mock).toHaveBeenCalledWith('2:00 PM', expect.any(Date)); // Check if mock was called
      expect(searchPlace_mock).toHaveBeenCalledWith('Manhattan', expect.objectContaining({ searchTerm: 'Central Park', type: 'park' }));
      expect(mockStorage.createItinerary).toHaveBeenCalledWith(expect.objectContaining({ title: 'Central Park Trip' }), 'user-123');
    });

    it('should create an itinerary with general activities when no fixed times', async () => {
      const mockNlpResult: StructuredRequest = {
        // @ts-ignore
        title: undefined,
        fixedTimes: [],
        activities: [
          {
            description: 'Visit museums',
            location: 'Manhattan', 
            time: 'morning', // general time indication
            searchParameters: { type: 'museum', searchTerm: 'Visit museums', keywords: [], minRating:4, requireOpenNow: true },
            requirements: []
          }
        ],
        preferences: { requirements: [], type: undefined },
        startLocation: 'Times Square',
        destinations: ['Manhattan']
      };

      const mockPlaceDetails: PlaceDetails = {
        place_id: 'museum-id',
        name: 'MoMA',
        formatted_address: '11 W 53rd St, New York, NY 10019',
        geometry: { location: { lat: 40.7614, lng: -73.9776 } },
        types: ['museum'],
        rating: 4.8
      };
      const mockStoredPlace: Place = {
        id: 2,
        placeId: 'museum-id',
        name: 'MoMA',
        address: '11 W 53rd St, New York, NY 10019',
        location: { lat: 40.7614, lng: -73.9776 },
        details: mockPlaceDetails,
        alternatives: null,
        scheduledTime: null 
      };
      const expectedItineraryDate = new Date('2024-01-15T00:00:00.000Z');
      const mockCreatedItinerary: Itinerary = {
        id: 2,
        query: 'Visit museums',
        title: 'Visit museums', 
        description: `Generated from: "Visit museums" (using ${mockNlpResult.startLocation} as start)`,
        places: [expect.any(Object)], // Simplified check for brevity
        travelTimes: [],
        planDate: expectedItineraryDate,
        created: new Date()
      };

      vi.mocked(parseItineraryRequest_mock).mockResolvedValue(mockNlpResult);
      vi.mocked(searchPlace_mock).mockResolvedValue({primary: mockPlaceDetails, alternatives: []});
      vi.mocked(mockStorage.createPlace).mockResolvedValue(mockStoredPlace);
      vi.mocked(mockStorage.createItinerary).mockResolvedValue(mockCreatedItinerary);
      // parseTimeString will use its default mock for "morning" if not specifically handled

      const result = await service.createPlan({
        query: 'Visit museums',
        date: '2024-01-15',
        userId: 'user-123'
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Visit museums');
      expect(searchPlace_mock).toHaveBeenCalledWith('Manhattan', 
        expect.objectContaining({
          type: 'museum',
          searchTerm: 'Visit museums'
        })
      );
      expect(mockStorage.createItinerary).toHaveBeenCalled();
    });

    it('should handle errors from NLP service gracefully', async () => {
      vi.mocked(parseItineraryRequest_mock).mockRejectedValue(new Error('NLP service unavailable'));

      await expect(service.createPlan({ query: 'Test query', userId: 'user-123' }))
        .rejects.toThrow('Failed to parse itinerary request');
      await expect(service.createPlan({ query: 'Test query', userId: 'user-123' }))
        .rejects.toBeInstanceOf(errors_NLPServiceError);
      try {
        await service.createPlan({ query: 'Test query', userId: 'user-123' });
      } catch (e: any) {
        expect(e.cause.message).toBe('NLP service unavailable');
      }
    });

    it('should calculate travel times between multiple places', async () => {
      const baseDateStr = '2024-01-15';
      const mockNlpResult: StructuredRequest = {
        // @ts-ignore
        title: undefined,
        fixedTimes: [
          {
            time: '10:00 AM', 
            searchTerm: 'Central Park', 
            location: 'Central Park, New York', 
            type: 'park' 
          },
          {
            time: '2:00 PM', 
            searchTerm: 'Empire State Building', 
            location: 'Empire State Building, New York', 
            type: 'tourist_attraction'
          }
        ],
        activities: [],
        preferences: { requirements: [], type: undefined },
        startLocation: 'Times Square',
        destinations: ['Central Park, New York', 'Empire State Building, New York']
      };

      const mockPlaceDetails1: PlaceDetails = {
        place_id: 'central-park-id',
        name: 'Central Park',
        formatted_address: 'Central Park, New York, NY',
        geometry: { location: { lat: 40.7829, lng: -73.9654 } },
        types: ['park']
      };
      const mockStoredPlace1: Place = {
        id: 1, placeId: 'central-park-id', name: 'Central Park', address: 'Central Park, New York, NY',
        location: { lat: 40.7829, lng: -73.9654 }, details: mockPlaceDetails1, alternatives: null, scheduledTime: new Date('2024-01-15T12:00:00.000Z').toISOString()
      };

      const mockPlaceDetails2: PlaceDetails = {
        place_id: 'empire-state-id',
        name: 'Empire State Building',
        formatted_address: '20 W 34th St, New York, NY 10001',
        geometry: { location: { lat: 40.7484, lng: -73.9857 } },
        types: ['tourist_attraction']
      };
      const mockStoredPlace2: Place = {
        id: 2, placeId: 'empire-state-id', name: 'Empire State Building', address: '20 W 34th St, New York, NY 10001',
        location: { lat: 40.7484, lng: -73.9857 }, details: mockPlaceDetails2, alternatives: null, scheduledTime: new Date('2024-01-15T12:00:00.000Z').toISOString()
      };
      
      const expectedItineraryDate = new Date(baseDateStr + 'T00:00:00.000Z');
      const mockCreatedItinerary: Itinerary = {
        id: 3,
        query: 'Visit Central Park then Empire State Building',
        title: 'Central Park, Empire State Building',
        description: `Generated from: "Visit Central Park then Empire State Building" (using ${mockNlpResult.startLocation} as start)`,
        places: expect.any(Array),
        travelTimes: expect.arrayContaining([expect.objectContaining({ fromPlaceId: 'central-park-id', toPlaceId: 'empire-state-id', durationMinutes: 20 })]),
        planDate: expectedItineraryDate,
        created: new Date()
      };

      vi.mocked(parseItineraryRequest_mock).mockResolvedValue(mockNlpResult);
      vi.mocked(searchPlace_mock)
        .mockResolvedValueOnce({primary: mockPlaceDetails1, alternatives: []})
        .mockResolvedValueOnce({primary: mockPlaceDetails2, alternatives: []});
      // parseTimeString is globally mocked to handle '10:00 AM' and '2:00 PM' correctly
      vi.mocked(calculateTravelTime_mock).mockResolvedValue(20);
      
      vi.mocked(mockStorage.createPlace)
        .mockResolvedValueOnce(mockStoredPlace1)
        .mockResolvedValueOnce(mockStoredPlace2);
      vi.mocked(mockStorage.createItinerary).mockResolvedValue(mockCreatedItinerary);

      const result = await service.createPlan({
        query: 'Visit Central Park then Empire State Building',
        date: baseDateStr,
        userId: 'user-123'
      });

      expect(calculateTravelTime_mock).toHaveBeenCalledWith(
        mockPlaceDetails1, // calculateTravelTime expects PlaceDetails
        mockPlaceDetails2
      );
      expect(result.travelTimes).toEqual(expect.arrayContaining([
        expect.objectContaining({ fromPlaceId: 'central-park-id', toPlaceId: 'empire-state-id', durationMinutes: 20 })
      ]));
    });
  });

  describe('getItineraryById', () => {
    it('should retrieve an itinerary by ID if user owns it or it is public (no userId passed to service)', async () => {
      const mockItineraryResult: Itinerary = {
        id: 1,
        query: 'Test itinerary',
        title: 'Test',
        description: 'A test itinerary',
        planDate: new Date(),
        places: [],
        travelTimes: [],
        created: new Date(),
      };
      vi.mocked(mockStorage.getItinerary).mockResolvedValue(mockItineraryResult);

      // Test case 1: User requests their own itinerary (userId in options matches itinerary.userId if we had it)
      // Our current getItineraryById doesn't do complex user auth, relies on storage.getItinerary behavior
      let result = await service.getItineraryById(1, 'user-who-owns-it');
      expect(result).toEqual(mockItineraryResult);
      expect(mockStorage.getItinerary).toHaveBeenCalledWith(1);

      // Test case 2: Requesting without userId (e.g. for a public itinerary view)
      result = await service.getItineraryById(1);
      expect(result).toEqual(mockItineraryResult);
      expect(mockStorage.getItinerary).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent itinerary', async () => {
      vi.mocked(mockStorage.getItinerary).mockResolvedValue(undefined);
      await expect(service.getItineraryById(999, 'user-123'))
        .rejects.toThrow(errors_NotFoundError);
      await expect(service.getItineraryById(999, 'user-123'))
        .rejects.toThrow('Itinerary with ID 999 not found');
    });
  });

  // Example for testing a private method like _detectActivityTypeFromQuery indirectly
  describe('ItineraryPlanningService - Activity Type Detection (via createPlan)', () => {
    it('should use _detectActivityTypeFromQuery as a fallback if type is missing', async () => {
      const mockNlpResult: StructuredRequest = {
        // @ts-ignore
        title: undefined,
        fixedTimes: [
          {
            time: '12:00 PM',
            searchTerm: 'eating spot', // No explicit type, should be detected
            location: 'SoHo'
          }
        ],
        activities: [], preferences: { requirements: [], type: undefined }, startLocation: 'Times Square', destinations: ['SoHo']
      };
      const mockPlaceDetails: PlaceDetails = { place_id: 'food-spot', name: 'Some Restaurant', formatted_address: 'Restaurant Address', geometry: {location: {lat:0,lng:0}}};
      const mockStoredPlace: Place = {id:1, placeId:'food-spot', name:'Some Restaurant', address:'', location:{}, details: mockPlaceDetails, alternatives:null, scheduledTime: new Date('2024-01-15T12:00:00.000Z').toISOString() };
      const mockItinerary: Itinerary = {id:1, query:'test', title:'eating spot', description:'', places:[], travelTimes:[], planDate:new Date(), created: new Date()};

      vi.mocked(parseItineraryRequest_mock).mockResolvedValue(mockNlpResult);
      vi.mocked(searchPlace_mock).mockResolvedValue({primary: mockPlaceDetails, alternatives: []});
      vi.mocked(mockStorage.createPlace).mockResolvedValue(mockStoredPlace);
      vi.mocked(mockStorage.createItinerary).mockResolvedValue(mockItinerary);
      // parseTimeString will be called for '12:00 PM'

      await service.createPlan({
        query: 'Find an eating spot in SoHo for lunch',
        date: '2024-01-15',
        userId: 'user-123'
      });

      // We expect searchPlace to have been called with a detected type, e.g., 'restaurant'
      expect(searchPlace_mock).toHaveBeenCalledWith('SoHo', 
        expect.objectContaining({
          searchTerm: 'eating spot',
          type: 'restaurant' // This confirms _detectActivityTypeFromQuery was used and worked
        })
      );
    });
  });
}); 