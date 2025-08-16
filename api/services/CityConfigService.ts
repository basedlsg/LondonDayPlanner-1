// @ts-nocheck
import {
  CityConfig,
  getCityConfig,
  getAllCitySlugs,
  LatLng,
  DetailedAreaInfo
} from "../config/cities";
import { NotFoundError, ValidationError } from "../lib/errors";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CityConfigService {
  /**
   * Retrieves the configuration for a specific city by its slug.
   * Throws NotFoundError if the city slug is invalid.
   * @param slug The slug of the city (e.g., 'london', 'nyc').
   * @returns The city configuration object.
   */
  public getCurrentCity(slug: string): CityConfig {
    const cityConfig = getCityConfig(slug);
    if (!cityConfig) {
      throw new NotFoundError(`City configuration for slug '${slug}' not found. Supported cities: ${getAllCitySlugs().join(', ')}`);
    }
    return cityConfig;
  }

  /**
   * Validates a city slug.
   * Throws ValidationError if the slug is invalid.
   * @param slug The slug of the city.
   * @returns The valid CityConfig object.
   */
  public validateCitySlug(slug: string): CityConfig {
    const cityConfig = getCityConfig(slug);
    if (!cityConfig) {
      throw new ValidationError(`Invalid city slug: '${slug}'. Supported cities: ${getAllCitySlugs().join(', ')}`);
    }
    return cityConfig;
  }

  /**
   * Resolves a known major area name to its coordinates for a given city.
   * @param areaName The name of the major area (case-insensitive).
   * @param cityConfig The configuration of the city to search within.
   * @returns The LatLng coordinates of the area, or null if not found.
   */
  public resolveAreaToCoordinates(areaName: string, cityConfig: CityConfig): LatLng | null {
    const searchName = areaName.toLowerCase();
    const area = cityConfig.majorAreas.find(a => a.name.toLowerCase() === searchName) || cityConfig.detailedAreas?.find(a => a.name.toLowerCase() === searchName);
    return area ? area.coordinates : null;
  }

  /**
   * Gets the default search location (coordinates) for a given city.
   * @param cityConfig The configuration of the city.
   * @returns The LatLng coordinates of the city's default location.
   */
  public getDefaultSearchLocation(cityConfig: CityConfig): LatLng {
    return cityConfig.defaultLocation;
  }

  /**
   * Gets the name of a city from its configuration.
   * @param cityConfig The configuration of the city.
   * @returns The name of the city.
   */
  public getCityName(cityConfig: CityConfig): string {
    return cityConfig.name;
  }

  /**
   * Gets the timezone of a city from its configuration.
   * @param cityConfig The configuration of the city.
   * @returns The timezone string of the city.
   */
  public getTimezone(cityConfig: CityConfig): string {
    return cityConfig.timezone;
  }

  /**
   * Loads detailed area information for a given city slug from its JSON file.
   * @param citySlug The slug of the city.
   * @returns An array of DetailedAreaInfo objects, or an empty array if file not found or error.
   */
  public loadDetailedAreasForCity(citySlug: string): DetailedAreaInfo[] {
    const filePath = path.join(__dirname, '../data', `${citySlug}-areas.json`);
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const areas: DetailedAreaInfo[] = JSON.parse(fileContent);
        return areas;
      }
      console.warn(`[CityConfigService] Data file not found for ${citySlug}: ${filePath}`);
      return [];
    } catch (error) {
      console.error(`[CityConfigService] Error loading or parsing area data for ${citySlug} from ${filePath}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Retrieves the configuration for a specific city, including detailed area data.
   * Throws NotFoundError if the city slug is invalid.
   * @param slug The slug of the city.
   * @returns The CityConfig object augmented with detailedAreas.
   */
  public getCityConfigWithDetails(slug: string): CityConfig {
    const cityConfig = this.getCurrentCity(slug); // Uses existing method that throws if not found
    if (cityConfig && !cityConfig.detailedAreas) { // Load only if not already loaded
        cityConfig.detailedAreas = this.loadDetailedAreasForCity(slug);
    }
    return cityConfig; 
  }
}

// Optional: Export a singleton instance if preferred
// export const cityConfigService = new CityConfigService(); 