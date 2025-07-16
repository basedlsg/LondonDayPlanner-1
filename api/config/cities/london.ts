import { type LatLng, TransportMode, type CityConfig } from './types';

const londonConfig: CityConfig = {
  slug: 'london',
  name: 'London',
  timezone: 'Europe/London',
  defaultLocation: { lat: 51.5074, lng: -0.1278 },
  majorAreas: [
    { name: 'Canary Wharf', coordinates: { lat: 51.5054, lng: -0.0235 } },
    { name: 'Mayfair', coordinates: { lat: 51.5099, lng: -0.1495 } },
    { name: 'Soho', coordinates: { lat: 51.5136, lng: -0.1371 } },
    { name: 'Kensington', coordinates: { lat: 51.5020, lng: -0.1947 } },
    { name: 'Shoreditch', coordinates: { lat: 51.5264, lng: -0.0778 } }
  ],
  // detailedAreas are loaded by CityConfigService, not part of this static config object directly
  transportModes: [
    TransportMode.WALK,
    TransportMode.TRANSIT,
    TransportMode.DRIVING,
    TransportMode.CYCLING
  ],
  averageTransportSpeed: {
    [TransportMode.WALK]: 5,
    [TransportMode.TRANSIT]: 25,
    [TransportMode.DRIVING]: 20,
    [TransportMode.CYCLING]: 15
  },
  businessCategories: {
    restaurant: ['pub', 'gastropub', 'curry house', 'afternoon tea', 'fish and chips'],
    coffee: ['coffee shop', 'tea room', 'cafe', 'patisserie'],
    shopping: ['department store', 'high street shops', 'markets', 'boutiques'],
    entertainment: ['theatre', 'pub', 'museum', 'gallery', 'cinema'],
    nightlife: ['pub', 'cocktail bar', 'club', 'wine bar'],
    fitness: ['gym', 'swimming pool', 'park', 'fitness centre'],
    grocery: ['Tesco', 'Sainsbury\'s', 'Waitrose', 'M&S Food', 'corner shop'],
    pharmacy: ['Boots', 'Superdrug', 'pharmacy', 'chemist']
  }
};

export default londonConfig; 