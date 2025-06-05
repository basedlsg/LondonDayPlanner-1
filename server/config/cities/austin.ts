import { type LatLng, TransportMode, type CityConfig } from './types';

const austinConfig: CityConfig = {
  slug: 'austin',
  name: 'Austin',
  timezone: 'America/Chicago', // Central Time
  defaultLocation: { lat: 30.2672, lng: -97.7431 }, // Approx center of Austin

  majorAreas: [
    { name: 'Downtown', coordinates: { lat: 30.2672, lng: -97.7431 } },
    { name: 'South Congress (SoCo)', coordinates: { lat: 30.2448, lng: -97.7491 } }, // South by Southwest often uses this area too
    { name: 'East Austin', coordinates: { lat: 30.2631, lng: -97.7168 } },
    { name: 'Westlake', coordinates: { lat: 30.2961, lng: -97.8008 } }, // More residential/suburban
    { name: 'University of Texas Area', coordinates: { lat: 30.2862, lng: -97.7394 } },
  ],

  transportModes: [
    TransportMode.WALK,
    TransportMode.DRIVING, // Primary mode for many
    TransportMode.TRANSIT, // Capital Metro (bus)
    TransportMode.CYCLING, // Popular, with many trails
    // SCOOTERS are also very prevalent but might be a sub-category of cycling or own mode
  ],
  averageTransportSpeed: {
    [TransportMode.WALK]: 5, // km/h
    [TransportMode.DRIVING]: 25, // km/h (can be much worse with traffic)
    [TransportMode.TRANSIT]: 15, // km/h (bus system)
    [TransportMode.CYCLING]: 18, // km/h
  },

  businessCategories: {
    restaurant: ['BBQ', 'Tex-Mex', 'food truck', 'farm to table', 'taco'],
    coffee: ['coffee shop', 'cafe', 'roastery', 'coffee trailer'],
    shopping: ['South Congress', 'Domain', 'outlet mall', 'vintage shop'],
    entertainment: ['live music venue', 'comedy club', 'ACL Live', 'outdoor concert'],
    nightlife: ['honky tonk', 'craft brewery', 'cocktail bar', 'dive bar', 'rooftop bar'],
    fitness: ['gym', 'Zilker Park', 'Lady Bird Lake', 'fitness center', 'yoga studio'],
    grocery: ['H-E-B', 'Whole Foods', 'Central Market', 'farmers market'],
    pharmacy: ['CVS', 'Walgreens', 'H-E-B Pharmacy', 'pharmacy'],
    music: ['Continental Club', 'Mohawk', 'Antone\'s', 'music venue'],
    outdoor: ['Zilker Park', 'Barton Springs', 'Lady Bird Lake', 'greenbelt']
  },
};

export default austinConfig; 