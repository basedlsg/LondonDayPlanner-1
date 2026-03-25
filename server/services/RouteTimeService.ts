import { fromZonedTime } from 'date-fns-tz';
import { getConfig } from '../config/index.js';
import { Location, TravelTime } from '../types/index.js';

type RouteTravelMode = 'WALK' | 'TRANSIT' | 'DRIVE';
type ItineraryTravelMode = NonNullable<TravelTime['mode']>;

interface ComputeRoutesResponse {
  routes?: Array<{
    duration?: string;
  }>;
}

export interface TravelEstimate {
  durationMinutes: number;
  durationText: string;
  mode: ItineraryTravelMode;
}

interface RouteTimeOptions {
  departureTime?: string;
  planDate?: string;
  timezone?: string;
}

export class RouteTimeService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  private readonly requestTimeoutMs = 12_000;
  private routesApiState: 'unknown' | 'enabled' | 'disabled' = 'unknown';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getConfig().placesApiKey;
  }

  async estimateTravelTime(
    origin: Location,
    destination: Location,
    options: RouteTimeOptions = {}
  ): Promise<TravelEstimate> {
    const directDistanceKm = this.haversineKm(origin, destination);

    if (directDistanceKm <= 0.2) {
      return {
        durationMinutes: 5,
        durationText: '5 min',
        mode: 'walking',
      };
    }

    const requestedModes = this.preferredModesForDistance(directDistanceKm);
    for (const mode of requestedModes) {
      const routed = await this.fetchRoute(origin, destination, mode, options);
      if (routed) {
        return routed;
      }
    }

    return this.fallbackEstimate(directDistanceKm);
  }

  private preferredModesForDistance(distanceKm: number): RouteTravelMode[] {
    if (distanceKm <= 1.8) {
      return ['WALK', 'TRANSIT', 'DRIVE'];
    }

    if (distanceKm <= 12) {
      return ['TRANSIT', 'DRIVE', 'WALK'];
    }

    return ['DRIVE', 'TRANSIT'];
  }

  private async fetchRoute(
    origin: Location,
    destination: Location,
    mode: RouteTravelMode,
    options: RouteTimeOptions
  ): Promise<TravelEstimate | null> {
    if (this.routesApiState === 'disabled') {
      return null;
    }

    const departureTime = this.buildDepartureTimeIso(options.planDate, options.departureTime, options.timezone);
    const requestBody: Record<string, unknown> = {
      origin: this.buildWaypoint(origin),
      destination: this.buildWaypoint(destination),
      travelMode: mode,
      computeAlternativeRoutes: false,
      units: 'METRIC',
      languageCode: 'en-US',
    };

    if ((mode === 'TRANSIT' || mode === 'DRIVE') && departureTime) {
      requestBody.departureTime = departureTime;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403 && /SERVICE_DISABLED|routes\.googleapis\.com/i.test(errorText)) {
          this.routesApiState = 'disabled';
        }
        console.warn(`[RouteTimeService] ${mode} route lookup failed: ${response.status} ${errorText}`);
        return null;
      }

      const data = (await response.json()) as ComputeRoutesResponse;
      this.routesApiState = 'enabled';
      const durationMinutes = this.parseDurationMinutes(data.routes?.[0]?.duration);
      if (!durationMinutes) {
        return null;
      }

      return {
        durationMinutes,
        durationText: `${durationMinutes} min`,
        mode: this.mapMode(mode),
      };
    } catch (error) {
      console.warn(`[RouteTimeService] ${mode} route lookup errored:`, error);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildWaypoint(location: Location): Record<string, unknown> {
    return {
      location: {
        latLng: {
          latitude: location.lat,
          longitude: location.lng,
        },
      },
    };
  }

  private buildDepartureTimeIso(
    planDate?: string,
    departureTime?: string,
    timezone?: string
  ): string | undefined {
    if (!planDate || !departureTime || !timezone) {
      return undefined;
    }

    try {
      return fromZonedTime(`${planDate}T${departureTime}:00`, timezone).toISOString();
    } catch (error) {
      console.warn('[RouteTimeService] Failed to build departure time:', error);
      return undefined;
    }
  }

  private parseDurationMinutes(duration?: string): number | null {
    if (!duration) {
      return null;
    }

    const secondsMatch = duration.match(/^(-?\d+(?:\.\d+)?)s$/);
    if (secondsMatch) {
      return Math.max(1, Math.ceil(Number.parseFloat(secondsMatch[1]) / 60));
    }

    const isoMatch = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (!isoMatch) {
      return null;
    }

    const hours = Number.parseInt(isoMatch[1] || '0', 10);
    const minutes = Number.parseInt(isoMatch[2] || '0', 10);
    const seconds = Number.parseInt(isoMatch[3] || '0', 10);
    const totalMinutes = hours * 60 + minutes + Math.ceil(seconds / 60);

    return Math.max(1, totalMinutes);
  }

  private fallbackEstimate(distanceKm: number): TravelEstimate {
    if (distanceKm <= 1.8) {
      const minutes = this.roundToFive((distanceKm / 4.8) * 60);
      return {
        durationMinutes: minutes,
        durationText: `${minutes} min`,
        mode: 'walking',
      };
    }

    if (distanceKm <= 10) {
      const minutes = this.roundToFive(((distanceKm / 18) * 60) + 6);
      return {
        durationMinutes: minutes,
        durationText: `${minutes} min`,
        mode: 'transit',
      };
    }

    const minutes = this.roundToFive(((distanceKm / 28) * 60) + 8);
    return {
      durationMinutes: minutes,
      durationText: `${minutes} min`,
      mode: 'driving',
    };
  }

  private roundToFive(value: number): number {
    return Math.max(5, Math.ceil(value / 5) * 5);
  }

  private mapMode(mode: RouteTravelMode): ItineraryTravelMode {
    switch (mode) {
      case 'WALK':
        return 'walking';
      case 'DRIVE':
        return 'driving';
      case 'TRANSIT':
      default:
        return 'transit';
    }
  }

  private haversineKm(origin: Location, destination: Location): number {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);
    const earthRadiusKm = 6371;
    const dLat = toRadians(destination.lat - origin.lat);
    const dLng = toRadians(destination.lng - origin.lng);
    const lat1 = toRadians(origin.lat);
    const lat2 = toRadians(destination.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

let routeTimeService: RouteTimeService | null = null;

export function getRouteTimeService(): RouteTimeService {
  if (!routeTimeService) {
    routeTimeService = new RouteTimeService();
  }

  return routeTimeService;
}
