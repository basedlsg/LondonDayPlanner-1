import { describe, expect, it } from 'vitest';
import { findCityConfig, getClientCity, getCityConfig, getAllClientCities } from './cities.js';

describe('city configuration', () => {
  it('includes Boston and Austin as supported cities', () => {
    expect(findCityConfig('boston')?.name).toBe('Boston');
    expect(findCityConfig('austin')?.name).toBe('Austin');
  });

  it('returns undefined for unsupported exact city lookups', () => {
    expect(findCityConfig('not-a-real-city')).toBeUndefined();
  });

  it('keeps the generic fallback behavior for legacy callers', () => {
    expect(getCityConfig('not-a-real-city').slug).toBe('london');
  });

  it('serializes cities in the shape the iOS app expects', () => {
    const city = getClientCity('austin');

    expect(city).toMatchObject({
      id: 'austin',
      slug: 'austin',
      name: 'Austin',
      country: 'United States',
      timezone: 'America/Chicago',
      currency: 'USD',
      language: 'en',
      defaultCenter: {
        lat: 30.2672,
        lng: -97.7431,
      },
    });
    expect(city?.majorAreas.length).toBeGreaterThan(0);
    expect(city?.majorAreas[0]).toHaveProperty('name');
  });

  it('returns the full client city list, including Boston and Austin', () => {
    const clientCities = getAllClientCities();
    const slugs = clientCities.map((city) => city.slug);

    expect(slugs).toContain('boston');
    expect(slugs).toContain('austin');
  });
});
