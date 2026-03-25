// City configurations for the day planner

import { CityConfig, CityArea, ClientCity } from '../types/index.js';

export const cities: Record<string, CityConfig> = {
  london: {
    name: 'London',
    slug: 'london',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    neighborhoods: [
      'Mayfair', 'Shoreditch', 'Soho', 'Covent Garden', 'Chelsea',
      'Notting Hill', 'Camden', 'Kensington', 'Westminster', 'Fitzrovia',
      'Marylebone', 'Clerkenwell', 'Hackney', 'Brixton', 'Islington',
      'Canary Wharf', 'Southbank', 'Borough', 'Bermondsey', 'Peckham',
      'Holborn', 'Bloomsbury'
    ]
  },
  nyc: {
    name: 'New York City',
    slug: 'nyc',
    country: 'United States',
    timezone: 'America/New_York',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    neighborhoods: [
      'SoHo', 'Greenwich Village', 'Midtown', 'Upper East Side', 'Upper West Side',
      'Tribeca', 'Chelsea', 'East Village', 'West Village', 'Williamsburg',
      'Brooklyn Heights', 'DUMBO', 'Lower East Side', 'NoHo', 'Nolita',
      'Financial District', 'Harlem', 'Flatiron', 'Murray Hill', 'Astoria'
    ]
  },
  boston: {
    name: 'Boston',
    slug: 'boston',
    country: 'United States',
    timezone: 'America/New_York',
    coordinates: { lat: 42.3601, lng: -71.0589 },
    neighborhoods: [
      'Back Bay', 'Beacon Hill', 'North End', 'Seaport', 'South End',
      'Fenway', 'Cambridge', 'Charlestown', 'Allston', 'Somerville',
      'Harvard Square', 'South Boston', 'Downtown Crossing'
    ]
  },
  austin: {
    name: 'Austin',
    slug: 'austin',
    country: 'United States',
    timezone: 'America/Chicago',
    coordinates: { lat: 30.2672, lng: -97.7431 },
    neighborhoods: [
      'Downtown', 'South Congress', 'East Austin', 'Zilker', 'South Lamar',
      'Rainey Street', 'The Domain', 'Hyde Park', 'Clarksville', 'Bouldin Creek',
      'Mueller', 'East Cesar Chavez', 'West Campus'
    ]
  },
  paris: {
    name: 'Paris',
    slug: 'paris',
    country: 'France',
    timezone: 'Europe/Paris',
    coordinates: { lat: 48.8566, lng: 2.3522 },
    neighborhoods: [
      'Le Marais', 'Saint-Germain-des-Pres', 'Montmartre', 'Latin Quarter',
      'Champs-Elysees', 'Bastille', 'Belleville', 'Oberkampf', 'Pigalle',
      'Canal Saint-Martin', 'Ile Saint-Louis', 'Palais Royal', 'Opera'
    ]
  },
  tokyo: {
    name: 'Tokyo',
    slug: 'tokyo',
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    neighborhoods: [
      'Shibuya', 'Shinjuku', 'Harajuku', 'Ginza', 'Roppongi',
      'Asakusa', 'Akihabara', 'Ikebukuro', 'Nakameguro', 'Daikanyama',
      'Shimokitazawa', 'Ebisu', 'Ueno', 'Nihonbashi', 'Meguro'
    ]
  },
  rome: {
    name: 'Rome',
    slug: 'rome',
    country: 'Italy',
    timezone: 'Europe/Rome',
    coordinates: { lat: 41.9028, lng: 12.4964 },
    neighborhoods: [
      'Trastevere', 'Centro Storico', 'Testaccio', 'Monti', 'Prati',
      'San Lorenzo', 'Pigneto', 'Ostiense', 'Campo de Fiori', 'Navona'
    ]
  },
  barcelona: {
    name: 'Barcelona',
    slug: 'barcelona',
    country: 'Spain',
    timezone: 'Europe/Madrid',
    coordinates: { lat: 41.3851, lng: 2.1734 },
    neighborhoods: [
      'Gothic Quarter', 'El Born', 'Gracia', 'Eixample', 'Barceloneta',
      'Raval', 'Poble Sec', 'Sant Antoni', 'Poble Nou', 'Les Corts'
    ]
  },
  sydney: {
    name: 'Sydney',
    slug: 'sydney',
    country: 'Australia',
    timezone: 'Australia/Sydney',
    coordinates: { lat: -33.8688, lng: 151.2093 },
    neighborhoods: [
      'Surry Hills', 'Newtown', 'Bondi', 'Darlinghurst', 'Paddington',
      'The Rocks', 'Circular Quay', 'Barangaroo', 'Manly', 'Chippendale'
    ]
  },
  dubai: {
    name: 'Dubai',
    slug: 'dubai',
    country: 'United Arab Emirates',
    timezone: 'Asia/Dubai',
    coordinates: { lat: 25.2048, lng: 55.2708 },
    neighborhoods: [
      'Downtown Dubai', 'Dubai Marina', 'DIFC', 'Jumeirah', 'Al Quoz',
      'City Walk', 'Business Bay', 'Palm Jumeirah', 'JBR', 'Bluewaters'
    ]
  },
  singapore: {
    name: 'Singapore',
    slug: 'singapore',
    country: 'Singapore',
    timezone: 'Asia/Singapore',
    coordinates: { lat: 1.3521, lng: 103.8198 },
    neighborhoods: [
      'Orchard Road', 'Marina Bay', 'Chinatown', 'Little India', 'Kampong Glam',
      'Clarke Quay', 'Tiong Bahru', 'Bugis', 'Tanjong Pagar', 'Holland Village'
    ]
  },
  istanbul: {
    name: 'Istanbul',
    slug: 'istanbul',
    country: 'Turkey',
    timezone: 'Europe/Istanbul',
    coordinates: { lat: 41.0082, lng: 28.9784 },
    neighborhoods: [
      'Beyoglu', 'Sultanahmet', 'Kadikoy', 'Besiktas', 'Karakoy',
      'Nisantasi', 'Cihangir', 'Moda', 'Balat', 'Bebek'
    ]
  },
  'hong-kong': {
    name: 'Hong Kong',
    slug: 'hong-kong',
    country: 'Hong Kong',
    timezone: 'Asia/Hong_Kong',
    coordinates: { lat: 22.3193, lng: 114.1694 },
    neighborhoods: [
      'Central', 'Admiralty', 'Wan Chai', 'Causeway Bay',
      'Tsim Sha Tsui', 'Mong Kok', 'Jordan', 'Yau Ma Tei',
      'Sheung Wan', 'Sai Ying Pun', 'Kennedy Town',
      'Happy Valley', 'Tai Hang', 'North Point',
      'Sham Shui Po', 'Kowloon City', 'Hung Hom',
      'Stanley', 'Repulse Bay', 'Aberdeen', 'Lamma Island',
      'Sai Kung', 'Sha Tin', 'Tai Po', 'Lan Kwai Fong', 'SoHo'
    ]
  }
};

const cityMetadata: Record<string, { currency: string; language?: string; majorAreas?: CityArea[] }> = {
  london: {
    currency: 'GBP',
    language: 'en',
    majorAreas: [
      { name: 'Mayfair' },
      { name: 'Soho' },
      { name: 'Shoreditch' },
      { name: 'Chelsea' },
      { name: 'Covent Garden' },
      { name: 'Camden' }
    ]
  },
  nyc: {
    currency: 'USD',
    language: 'en',
    majorAreas: [
      { name: 'SoHo' },
      { name: 'Greenwich Village', aliases: ['West Village'] },
      { name: 'Midtown' },
      { name: 'Upper East Side' },
      { name: 'Chelsea' },
      { name: 'Williamsburg' }
    ]
  },
  boston: {
    currency: 'USD',
    language: 'en',
    majorAreas: [
      { name: 'Back Bay' },
      { name: 'Beacon Hill' },
      { name: 'North End' },
      { name: 'Seaport' },
      { name: 'South End' },
      { name: 'Cambridge', aliases: ['Harvard Square'] }
    ]
  },
  austin: {
    currency: 'USD',
    language: 'en',
    majorAreas: [
      { name: 'Downtown' },
      { name: 'South Congress', aliases: ['SoCo'] },
      { name: 'East Austin' },
      { name: 'South Lamar' },
      { name: 'Rainey Street' },
      { name: 'Zilker' }
    ]
  },
  paris: {
    currency: 'EUR',
    language: 'fr'
  },
  tokyo: {
    currency: 'JPY',
    language: 'ja'
  },
  rome: {
    currency: 'EUR',
    language: 'it'
  },
  barcelona: {
    currency: 'EUR',
    language: 'es'
  },
  sydney: {
    currency: 'AUD',
    language: 'en'
  },
  dubai: {
    currency: 'AED',
    language: 'ar'
  },
  singapore: {
    currency: 'SGD',
    language: 'en'
  },
  istanbul: {
    currency: 'TRY',
    language: 'tr'
  },
  'hong-kong': {
    currency: 'HKD',
    language: 'zh'
  }
};

export function findCityConfig(citySlug: string): CityConfig | undefined {
  return cities[citySlug.toLowerCase()];
}

export function getCityConfig(citySlug: string): CityConfig {
  const city = findCityConfig(citySlug);
  if (!city) {
    // Default to London if city not found
    return cities.london;
  }
  return city;
}

export function getAllCities(): CityConfig[] {
  return Object.values(cities);
}

export function getCitySlugs(): string[] {
  return Object.keys(cities);
}

export function toClientCity(city: CityConfig): ClientCity {
  const metadata = cityMetadata[city.slug];

  return {
    id: city.slug,
    slug: city.slug,
    name: city.name,
    country: city.country,
    timezone: city.timezone,
    currency: metadata?.currency ?? 'USD',
    language: metadata?.language,
    majorAreas: metadata?.majorAreas ?? city.neighborhoods.slice(0, 6).map((name) => ({ name })),
    defaultCenter: city.coordinates,
  };
}

export function getAllClientCities(): ClientCity[] {
  return getAllCities().map(toClientCity);
}

export function getClientCity(citySlug: string): ClientCity | undefined {
  const city = findCityConfig(citySlug);
  return city ? toClientCity(city) : undefined;
}
