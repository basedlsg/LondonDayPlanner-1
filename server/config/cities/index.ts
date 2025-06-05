// Import and re-export all necessary types from types.ts
import {
  type LatLng,
  type AreaDefinition,
  type TransportMode,
  type LocalBusinessCategories,
  type DetailedAreaInfo,
  type CityConfig
} from './types';

// Re-export types for other modules
export type {
  LatLng,
  AreaDefinition,
  TransportMode,
  LocalBusinessCategories,
  DetailedAreaInfo,
  CityConfig
} from './types';

// Import the actual config objects from each city file
import londonConfig from './london';
import nycConfig from './nyc';
import bostonConfig from './boston';
import austinConfig from './austin';

// City Registry
const cityRegistry: Map<string, CityConfig> = new Map();

// Internal function to register a city configuration
function registerConfig(config: CityConfig): void {
  const normalizedSlug = config.slug.toLowerCase();
  if (cityRegistry.has(normalizedSlug)) {
    console.warn(`[CityRegistry] Overwriting configuration for city: ${config.name} (slug: ${normalizedSlug})`);
  } else {
    console.log(`[CityRegistry] Registered city: ${config.name} (slug: ${normalizedSlug})`);
  }
  cityRegistry.set(normalizedSlug, config);
}

// Register all imported city configurations
[londonConfig, nycConfig, bostonConfig, austinConfig].forEach(config => {
  if (config) {
    registerConfig(config);
  } else {
    console.error('[CityRegistry] Encountered an undefined city configuration during registration. Check city files.');
  }
});

// Exported functions to access the registry
export function getCityConfig(slug: string): CityConfig | undefined {
  return cityRegistry.get(slug.toLowerCase());
}

export function getAllCities(): CityConfig[] {
  console.log(`[CityRegistry] getAllCities called, registry size: ${cityRegistry.size}`);
  return Array.from(cityRegistry.values());
}

export function getAllCitySlugs(): string[] {
  return Array.from(cityRegistry.keys());
}

console.log(`[CityRegistry] City configurations loading process completed. Registry size: ${cityRegistry.size}`);
if (cityRegistry.size > 0) {
  console.log(`[CityRegistry] Registered slugs: ${getAllCitySlugs().join(', ')}`);
} else {
  console.warn("[CityRegistry] No cities were registered. Check city config file imports and their content.");
} 