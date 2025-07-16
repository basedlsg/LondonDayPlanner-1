import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createRoutes } from '../routes';
import { Config } from '../config';
import { IStorage } from '../storage';
import { CityConfigService } from '../services/CityConfigService';
import { LocationResolver } from '../services/LocationResolver';
import { ItineraryPlanningService } from '../services/ItineraryPlanningService';

// Mock dependencies
const mockStorage: IStorage = {
  createItinerary: vi.fn(),
  getItinerary: vi.fn(),
  getUserItineraries: vi.fn(),
  createPlace: vi.fn(),
  getPlace: vi.fn(),
  getPlaceByPlaceId: vi.fn(),
  createUser: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  getAnonymousIdentifier: vi.fn(),
  createAnonymousIdentifier: vi.fn(),
  logAIInteraction: vi.fn()
};

const mockConfig = {
  getApiKey: vi.fn(),
  isFeatureEnabled: vi.fn(),
  recheckEnvironment: vi.fn(),
  initialize: vi.fn()
};

describe('API Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup express app with routes
    app = express();
    app.use(express.json());
    
    const cityConfigService = new CityConfigService();
    const locationResolver = new LocationResolver();
    const planningService = new ItineraryPlanningService(
      mockStorage,
      cityConfigService,
      locationResolver
    );
    
    app.use('/api', createRoutes(mockStorage, planningService));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/cities', () => {
    it('returns list of available cities', async () => {
      const response = await request(app)
        .get('/api/cities')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('slug');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('timezone');
    });
  });

  describe('POST /api/:city/plan', () => {
    it('creates an itinerary with valid input', async () => {
      const mockItinerary = {
        id: 1,
        title: 'NYC Day Plan',
        description: 'A day in NYC',
        planDate: '2025-05-26',
        query: 'Museums and parks',
        venues: [],
        travelTimes: []
      };

      mockStorage.createItinerary.mockResolvedValueOnce(mockItinerary);
      mockConfig.isFeatureEnabled.mockReturnValue(true);
      mockConfig.getApiKey.mockReturnValue('test-key');

      const response = await request(app)
        .post('/api/nyc/plan')
        .send({
          query: 'Museums and parks in NYC',
          date: '2025-05-26',
          startTime: '10:00'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
    });

    it('returns 400 for invalid city', async () => {
      const response = await request(app)
        .post('/api/invalidcity/plan')
        .send({
          query: 'Test query'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid city');
    });

    it('returns 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/nyc/plan')
        .send({
          date: '2025-05-26'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Query is required');
    });

    it('handles service errors gracefully', async () => {
      mockStorage.createItinerary.mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/nyc/plan')
        .send({
          query: 'Test query'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/:city/itinerary/:id', () => {
    it('returns itinerary by id', async () => {
      const mockItinerary = {
        id: 1,
        title: 'NYC Day Plan',
        description: 'A day in NYC',
        planDate: '2025-05-26',
        query: 'Museums and parks',
        venues: [{
          name: 'Central Park',
          address: 'NYC',
          time: '10:00',
          duration: 90
        }],
        travelTimes: []
      };

      mockStorage.getItinerary.mockResolvedValueOnce(mockItinerary);

      const response = await request(app)
        .get('/api/nyc/itinerary/1')
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('title');
      expect(response.body.venues).toHaveLength(1);
    });

    it('returns 404 for non-existent itinerary', async () => {
      mockStorage.getItinerary.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/nyc/itinerary/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    it('handles malformed JSON', async () => {
      const response = await request(app)
        .post('/api/nyc/plan')
        .set('Content-Type', 'application/json')
        .send('{"invalid json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('returns 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/unknown/endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Not found');
    });
  });

  describe('City-specific Features', () => {
    it('uses city-specific configuration', async () => {
      // Test NYC
      await request(app)
        .post('/api/nyc/plan')
        .send({
          query: 'Coffee in SoHo'
        });

      // Test London
      await request(app)
        .post('/api/london/plan')
        .send({
          query: 'Tea in Covent Garden'
        });

      // Verify different cities were processed
      expect(mockStorage.createItinerary).toHaveBeenCalled();
    });
  });
});