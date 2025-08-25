export interface City {
  id: string;
  name: string;
  country: string;
  timezone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export const cities: City[] = [
  {
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    timezone: 'America/New_York',
    coordinates: { lat: 40.7128, lng: -74.0060 },
  },
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    timezone: 'Europe/London',
    coordinates: { lat: 51.5074, lng: -0.1278 },
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    timezone: 'Europe/Paris',
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    timezone: 'Europe/Rome',
    coordinates: { lat: 41.9028, lng: 12.4964 },
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    timezone: 'Europe/Madrid',
    coordinates: { lat: 41.3851, lng: 2.1734 },
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    timezone: 'Australia/Sydney',
    coordinates: { lat: -33.8688, lng: 151.2093 },
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    timezone: 'Asia/Dubai',
    coordinates: { lat: 25.276987, lng: 55.296249 },
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    timezone: 'Asia/Singapore',
    coordinates: { lat: 1.3521, lng: 103.8198 },
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    timezone: 'Europe/Istanbul',
    coordinates: { lat: 41.0082, lng: 28.9784 },
  },
];