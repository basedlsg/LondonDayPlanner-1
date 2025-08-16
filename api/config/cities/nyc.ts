// @ts-nocheck
import { type LatLng, TransportMode, type CityConfig } from './types';

const nycConfig: CityConfig = {
  slug: 'nyc',
  name: 'New York City',
  timezone: 'America/New_York',
  defaultLocation: { lat: 40.7128, lng: -74.0060 },
  majorAreas: [
    { name: 'SoHo', coordinates: { lat: 40.7231, lng: -74.0030 } },
    { name: 'Greenwich Village', coordinates: { lat: 40.7336, lng: -74.0027 } },
    { name: 'Midtown', coordinates: { lat: 40.7549, lng: -73.9840 } },
    { name: 'Financial District', coordinates: { lat: 40.7074, lng: -74.0113 } },
    { name: 'Upper West Side', coordinates: { lat: 40.7870, lng: -73.9754 } }
  ],
  transportModes: [
    TransportMode.WALK,
    TransportMode.TRANSIT,
    TransportMode.DRIVING,
    TransportMode.CYCLING
  ],
  averageTransportSpeed: {
    [TransportMode.WALK]: 5,
    [TransportMode.TRANSIT]: 30,
    [TransportMode.DRIVING]: 15,
    [TransportMode.CYCLING]: 20
  },
  businessCategories: {
    restaurant: ['diner', 'pizza', 'deli', 'food truck', 'steakhouse'],
    coffee: ['coffee shop', 'cafe', 'bakery', 'bagel shop'],
    shopping: ['department store', 'boutique', 'outlet', 'flea market'],
    entertainment: ['Broadway show', 'comedy club', 'museum', 'concert venue'],
    nightlife: ['bar', 'cocktail lounge', 'nightclub', 'jazz club'],
    fitness: ['gym', 'yoga studio', 'Central Park', 'fitness center'],
    grocery: ['Whole Foods', 'Trader Joe\'s', 'bodega', 'supermarket'],
    pharmacy: ['CVS', 'Walgreens', 'Duane Reade', 'Rite Aid']
  }
};

export default nycConfig; 