// Places Validator Service
// Validates venue information from grounded search using Google Places API

import { getConfig } from '../config/index.js';
import { GroundedVenue, ValidatedVenue, OpeningHours, PlacePhoto } from '../types/index.js';

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  currentOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
  }>;
  priceLevel?: string;
  types?: string[];
}

interface PlacesApiResponse {
  places?: Place[];
}

export class PlacesValidator {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1/places:searchText';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getConfig().placesApiKey;
  }

  /**
   * Validate a list of venues from grounded search against Google Places API
   */
  async validate(
    venues: GroundedVenue[],
    citySlug: string
  ): Promise<ValidatedVenue[]> {
    const validationPromises = venues.map(async (venue) => {
      try {
        return await this.validateSingleVenue(venue, citySlug);
      } catch (error) {
        console.error(`Failed to validate venue ${venue.name}:`, error);
        // Return the original venue data without validation
        return {
          ...venue,
          placeId: undefined,
          isOpenNow: venue.likelyOpenNow,
        };
      }
    });

    const results = await Promise.all(validationPromises);
    return results.filter((v): v is ValidatedVenue => v !== null);
  }

  /**
   * Validate a single venue against Google Places API
   */
  private async validateSingleVenue(
    venue: GroundedVenue,
    citySlug: string
  ): Promise<ValidatedVenue | null> {
    // Build search query: venue name + address for accuracy
    const searchQuery = `${venue.name} ${venue.address}`;

    const placeDetails = await this.searchPlace(searchQuery);

    if (!placeDetails) {
      // Venue not found in Places API, return original with flag
      return {
        ...venue,
        placeId: undefined,
      };
    }

    return {
      ...venue,
      name: placeDetails.displayName?.text || venue.name,
      formattedAddress: placeDetails.formattedAddress || venue.address,
      placeId: placeDetails.id,
      location: placeDetails.location?.latitude != null && placeDetails.location?.longitude != null
        ? {
          lat: placeDetails.location.latitude,
          lng: placeDetails.location.longitude,
        }
        : undefined,
      rating: placeDetails.rating,
      totalRatings: placeDetails.userRatingCount,
      openingHours: this.convertOpeningHours(placeDetails.currentOpeningHours),
      photos: this.convertPhotos(placeDetails.photos),
      isOpenNow: placeDetails.currentOpeningHours?.openNow,
      phoneNumber: placeDetails.internationalPhoneNumber || placeDetails.nationalPhoneNumber,
      types: placeDetails.types,
    };
  }

  /**
   * Search for a place using Google Places Text Search API
   */
  private async searchPlace(query: string): Promise<Place | null> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.location',
            'places.rating',
            'places.userRatingCount',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.currentOpeningHours',
            'places.photos',
            'places.priceLevel',
            'places.types',
          ].join(','),
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 1,
        }),
      });

      if (!response.ok) {
        console.error('Places API error:', response.status, await response.text());
        return null;
      }

      const data = (await response.json()) as PlacesApiResponse;
      return data.places?.[0] || null;
    } catch (error) {
      console.error('Failed to search place:', error);
      return null;
    }
  }

  /**
   * Direct search with a custom query (for simple/detailed queries)
   */
  async searchVenues(
    query: string,
    maxResults: number = 5
  ): Promise<ValidatedVenue[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.location',
            'places.rating',
            'places.userRatingCount',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.currentOpeningHours',
            'places.photos',
            'places.priceLevel',
            'places.types',
          ].join(','),
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: maxResults,
        }),
      });

      if (!response.ok) {
        console.error('Places API error:', response.status);
        return [];
      }

      const data = (await response.json()) as PlacesApiResponse;

      return (data.places || []).map((place) => ({
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || 'Address not available',
        whyRecommended: 'Matches your search criteria',
        placeId: place.id,
        location: place.location?.latitude != null && place.location?.longitude != null
          ? {
            lat: place.location.latitude,
            lng: place.location.longitude,
          }
          : undefined,
        rating: place.rating,
        totalRatings: place.userRatingCount,
        openingHours: this.convertOpeningHours(place.currentOpeningHours),
        photos: this.convertPhotos(place.photos),
        formattedAddress: place.formattedAddress,
        isOpenNow: place.currentOpeningHours?.openNow,
        priceLevel: place.priceLevel,
        phoneNumber: place.internationalPhoneNumber || place.nationalPhoneNumber,
        types: place.types,
      }));
    } catch (error) {
      console.error('Failed to search venues:', error);
      return [];
    }
  }

  /**
   * Convert Places API opening hours to our format
   */
  private convertOpeningHours(
    hours?: Place['currentOpeningHours']
  ): OpeningHours | undefined {
    if (!hours) return undefined;

    return {
      open_now: hours.openNow,
      periods: hours.periods?.map((p) => ({
        open: {
          day: p.open.day,
          time: `${p.open.hour.toString().padStart(2, '0')}${p.open.minute.toString().padStart(2, '0')}`,
        },
        close: p.close
          ? {
            day: p.close.day,
            time: `${p.close.hour.toString().padStart(2, '0')}${p.close.minute.toString().padStart(2, '0')}`,
          }
          : undefined,
      })),
      weekday_text: hours.weekdayDescriptions,
    };
  }

  /**
   * Convert Places API photos to our format
   */
  private convertPhotos(
    photos?: Place['photos']
  ): PlacePhoto[] | undefined {
    if (!photos || photos.length === 0) return undefined;

    return photos.slice(0, 3).map((p) => ({
      name: p.name,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
    }));
  }
}

// Singleton export
let placesValidator: PlacesValidator | null = null;

export function getPlacesValidator(): PlacesValidator {
  if (!placesValidator) {
    placesValidator = new PlacesValidator();
  }
  return placesValidator;
}
