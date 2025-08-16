// @ts-nocheck
import { type LatLng, TransportMode, type CityConfig } from './types';

const bostonConfig: CityConfig = {
  slug: 'boston',
  name: 'Boston',
  timezone: 'America/New_York', // Same as NYC, Eastern Time
  defaultLocation: { lat: 42.3601, lng: -71.0589 }, // Approx center of Boston

  majorAreas: [
    { name: 'Back Bay', coordinates: { lat: 42.3502, lng: -71.0808 } },
    { name: 'North End', coordinates: { lat: 42.3648, lng: -71.0541 } },
    { name: 'Beacon Hill', coordinates: { lat: 42.3588, lng: -71.0637 } },
    { name: 'Cambridge', coordinates: { lat: 42.3736, lng: -71.1097 } }, // Technically a separate city, but often part of Boston experience
    { name: 'South End', coordinates: { lat: 42.3429, lng: -71.0738 } },
  ],

  transportModes: [
    TransportMode.WALK,
    TransportMode.TRANSIT, // MBTA (Subway "T", Buses, Commuter Rail)
    TransportMode.DRIVING,
    TransportMode.CYCLING,
  ],
  averageTransportSpeed: {
    [TransportMode.WALK]: 4.8, // km/h
    [TransportMode.TRANSIT]: 18, // km/h (average for "T", can be slow)
    [TransportMode.DRIVING]: 15, // km/h (notoriously bad traffic)
    [TransportMode.CYCLING]: 14, // km/h
  },

  businessCategories: {
    restaurant: ['seafood restaurant', 'Irish pub', 'clam chowder', 'lobster roll'],
    coffee: ['coffee shop', 'cafe', 'bakery', 'cannoli shop'],
    shopping: ['Quincy Market', 'Faneuil Hall', 'downtown crossing', 'Newbury Street'],
    entertainment: ['museum', 'theater', 'freedom trail', 'historical site'],
    nightlife: ['Irish pub', 'craft brewery', 'cocktail bar', 'sports bar'],
    fitness: ['gym', 'Charles River', 'Boston Common', 'fitness center'],
    grocery: ['Stop & Shop', 'Whole Foods', 'Star Market', 'corner store'],
    pharmacy: ['CVS', 'Walgreens', 'Rite Aid', 'pharmacy'],
    university: ['Harvard', 'MIT', 'Boston University', 'academic'],
    historical: ['Freedom Trail', 'Paul Revere House', 'Old North Church', 'Tea Party Ships']
  },
};

export default bostonConfig; 