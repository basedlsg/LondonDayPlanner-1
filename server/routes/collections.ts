// Collections API Routes
// Curated itinerary collections per city

import { Router, Request, Response } from 'express';
import { getItineraryPlanner } from '../services/ItineraryPlanner.js';
import { findCityConfig } from '../config/cities.js';
import { getCollectionMetas, getCollectionDefinition } from '../config/collections.js';
import { Itinerary, PlanRequest } from '../types/index.js';

const router = Router();

/**
 * GET /api/:city/collections
 * Returns collection metadata for a city (instant, no generation).
 */
router.get('/:city/collections', (req: Request, res: Response) => {
  const { city } = req.params;

  const cityConfig = findCityConfig(city);
  if (!cityConfig) {
    return res.status(404).json({
      error: 'Unsupported city',
      message: `City "${city}" is not currently supported.`,
    });
  }

  const collections = getCollectionMetas(city);
  if (!collections) {
    return res.status(404).json({
      error: 'No collections',
      message: `No curated collections are available for "${cityConfig.name}" yet.`,
    });
  }

  return res.json({ collections });
});

/**
 * POST /api/:city/collections/:slug
 * Generates a fresh itinerary for a curated collection category.
 * Uses the existing ItineraryPlanner with the curated prompt.
 */
router.post('/:city/collections/:slug', async (req: Request, res: Response) => {
  const startProcessingTime = Date.now();

  try {
    const { city, slug } = req.params;
    const { date, startTime } = req.body;

    const cityConfig = findCityConfig(city);
    if (!cityConfig) {
      return res.status(404).json({
        error: 'Unsupported city',
        message: `City "${city}" is not currently supported.`,
      });
    }

    const collection = getCollectionDefinition(city, slug);
    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found',
        message: `Collection "${slug}" not found for city "${cityConfig.name}".`,
      });
    }

    console.log(`[/api/${city}/collections/${slug}] Generating "${collection.title}" itinerary`);

    const planner = getItineraryPlanner();

    const request: PlanRequest = {
      date: date || new Date().toISOString().split('T')[0],
      startTime: startTime || new Date().toTimeString().slice(0, 5),
      query: collection.prompt,
    };

    const itinerary = await planner.createPlan(request, cityConfig);

    res.json({
      itinerary: withAbsoluteAssetUrls(req, itinerary),
      processingTimeMs: Date.now() - startProcessingTime,
    });
  } catch (error) {
    console.error(`[/api/:city/collections/:slug] Error:`, error);
    res.status(500).json({
      error: 'Failed to generate collection itinerary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

// --- Helper functions (duplicated from plan.ts to keep routes self-contained) ---

function withAbsoluteAssetUrls(req: Request, itinerary: Itinerary): Itinerary {
  const baseUrl = getRequestOrigin(req);

  return {
    ...itinerary,
    venues: itinerary.venues.map((venue) => ({
      ...venue,
      photoUrl: absolutizeMaybeRelative(baseUrl, venue.photoUrl),
      photoUrls: absolutizeManyMaybeRelative(baseUrl, venue.photoUrls),
      alternatives: venue.alternatives?.map((alternative) => ({
        ...alternative,
        photoUrl: absolutizeMaybeRelative(baseUrl, alternative.photoUrl),
        photoUrls: absolutizeManyMaybeRelative(baseUrl, alternative.photoUrls),
      })),
    })),
  };
}

function absolutizeMaybeRelative(baseUrl: string, value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.startsWith('http') ? value : new URL(value, baseUrl).toString();
}

function absolutizeManyMaybeRelative(baseUrl: string, values?: string[]): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  return values.map((value) => absolutizeMaybeRelative(baseUrl, value)).filter((v): v is string => Boolean(v));
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0];
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0];
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host') || 'london-day-planner-1.vercel.app';
  return `${protocol}://${host}`;
}
