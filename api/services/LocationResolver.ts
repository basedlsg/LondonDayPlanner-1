// @ts-nocheck
import { CityConfig, LatLng, AreaDefinition, DetailedAreaInfo } from "../config/cities";

// Simple distance calculation (Haversine formula)
function getDistance(coord1: LatLng, coord2: LatLng): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) *
      Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export class LocationResolver {
  /**
   * Extracts references to city areas from a query string using detailed area data.
   * @param query The input query string.
   * @param cityConfig The configuration for the city, expected to have `detailedAreas` populated.
   * @returns An array of DetailedAreaInfo objects for matched areas.
   */
  public extractAreaReferences(query: string, cityConfig: CityConfig): DetailedAreaInfo[] {
    const queryLower = query.toLowerCase();
    const matchedAreas: DetailedAreaInfo[] = [];

    if (!cityConfig.detailedAreas) {
      console.warn(`[LocationResolver] Detailed area data not loaded for ${cityConfig.name}. Area extraction might be limited.`);
      // Fallback to majorAreas if detailedAreas is not available
      for (const area of cityConfig.majorAreas) {
        if (queryLower.includes(area.name.toLowerCase())) {
          // Convert AreaDefinition to a partial DetailedAreaInfo for consistency if needed, or handle differently
          matchedAreas.push({ ...area, type: 'area' }); // Assuming a generic 'area' type
        }
      }
      return Array.from(new Set(matchedAreas)); // Use Array.from for compatibility
    }

    for (const area of cityConfig.detailedAreas) {
      // Check main name
      if (queryLower.includes(area.name.toLowerCase())) {
        matchedAreas.push(area);
        continue; // Avoid adding the same area multiple times if an alt name also matches
      }
      // Check alternative names
      if (area.alternativeNames) {
        for (const altName of area.alternativeNames) {
          if (queryLower.includes(altName.toLowerCase())) {
            matchedAreas.push(area);
            break; // Found a match for this area via alt name
          }
        }
      }
      // TODO: Could also check commonMisspellings with a fuzzy matching library
    }
    return Array.from(new Set(matchedAreas)); // Use Array.from for compatibility
  }

  /**
   * Resolves colloquial terms to their canonical area or location using detailed area data.
   * @param term The colloquial term.
   * @param cityConfig The city configuration, expected to have `detailedAreas` for matching.
   * @returns The resolved DetailedAreaInfo or null if not found.
   */
  public resolveColloquialTerms(term: string, cityConfig: CityConfig): DetailedAreaInfo | null {
    if (!cityConfig.detailedAreas) {
      console.warn(`[LocationResolver] Detailed area data not available for resolving colloquial terms in ${cityConfig.name}.`);
      return null;
    }
    const searchTermLower = term.toLowerCase();
    // Search by alternative names which often store colloquial terms
    for (const area of cityConfig.detailedAreas) {
      if (area.alternativeNames?.some(altName => altName.toLowerCase() === searchTermLower)) {
        return area;
      }
      // Also check main name if it matches colloquial term exactly
      if (area.name.toLowerCase() === searchTermLower) {
        return area;
      }
    }
    console.warn(`[LocationResolver] Colloquial term '${term}' not resolved in ${cityConfig.name}.`);
    return null;
  }

  /**
   * Finds the nearest area (from detailedAreas or majorAreas) to a given set of coordinates.
   * @param coordinates The LatLng coordinates.
   * @param cityConfig The city configuration.
   * @returns The nearest DetailedAreaInfo or AreaDefinition, or null.
   */
  public findNearestArea(coordinates: LatLng, cityConfig: CityConfig): DetailedAreaInfo | AreaDefinition | null {
    const areasToSearch = cityConfig.detailedAreas?.length ? cityConfig.detailedAreas : cityConfig.majorAreas;
    if (!areasToSearch || areasToSearch.length === 0) {
      return null;
    }

    let nearestArea: DetailedAreaInfo | AreaDefinition | null = null;
    let minDistance = Infinity;

    for (const area of areasToSearch) {
      if (!area.coordinates) continue; // Skip if area has no coordinates
      const distance = getDistance(coordinates, area.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestArea = area;
      }
    }
    return nearestArea;
  }
}

// Optional: Export a singleton instance if preferred
// export const locationResolver = new LocationResolver(); 