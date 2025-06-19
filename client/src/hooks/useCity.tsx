import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import { CityConfig } from '../../../server/config/cities'; // Path problematic, will redefine locally for now

// Local definition for CityConfig for client-side use
// Ideally, this would come from a shared types package or be aligned with server types
export interface LatLng {
  lat: number;
  lng: number;
}

export interface AreaDefinition { // Simplified for client if full details not needed
  name: string;
  coordinates?: LatLng; // Made optional if not always used by client city selector
}

export enum TransportMode { // Copied from server/config/cities/index.ts for consistency
  WALK = 'walk',
  TRANSIT = 'transit',
  DRIVING = 'driving',
  CYCLING = 'cycling',
}

export interface CityConfig {
  slug: string;
  name: string;
  timezone: string;
  defaultLocation: LatLng;
  majorAreas: AreaDefinition[]; // Using simplified AreaDefinition
  transportModes: TransportMode[];
  averageTransportSpeed: Partial<Record<TransportMode, number>>;
  businessCategories: Record<string, string | string[]>; // Generic Record
  // Add other fields if the client needs them, e.g., for branding
  // flagImageUrl?: string;
  // primaryColor?: string;
}

interface CityContextProps {
  currentCity: CityConfig | null;
  availableCities: CityConfig[];
  isLoading: boolean;
  error: string | null;
  switchCity: (citySlug: string) => void;
}

const CityContext = createContext<CityContextProps | undefined>(undefined);

const defaultCities: CityConfig[] = [
  // Basic fallbacks in case API call fails or for initial render
  // These should ideally match the slugs and names from your backend
  { slug: 'london', name: 'London', timezone: 'Europe/London', defaultLocation: { lat: 51.5074, lng: 0.1278 }, majorAreas: [], transportModes: [], averageTransportSpeed: {}, businessCategories: {} },
  { slug: 'nyc', name: 'New York City', timezone: 'America/New_York', defaultLocation: { lat: 40.7128, lng: -74.0060 }, majorAreas: [], transportModes: [], averageTransportSpeed: {}, businessCategories: {} },
  { slug: 'boston', name: 'Boston', timezone: 'America/New_York', defaultLocation: { lat: 42.3601, lng: -71.0589 }, majorAreas: [], transportModes: [], averageTransportSpeed: {}, businessCategories: {} },
  { slug: 'austin', name: 'Austin', timezone: 'America/Chicago', defaultLocation: { lat: 30.2672, lng: -97.7431 }, majorAreas: [], transportModes: [], averageTransportSpeed: {}, businessCategories: {} },
];

export const CityProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentCity, setCurrentCity] = useState<CityConfig | null>(null);
  const [availableCities, setAvailableCities] = useState<CityConfig[]>(defaultCities);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true);
      try {
        console.log('[useCity] Fetching cities from /api/cities');
        let citiesData: CityConfig[];
        try {
          const API_BASE_URL = 'https://londondayplanner-1-production.railway.app';
          const response = await fetch(`${API_BASE_URL}/api/cities`);
          if (!response.ok) {
            throw new Error('Failed to fetch city configurations');
          }
          citiesData = await response.json();
        } catch (error) {
          console.warn('API not available, using fallback data');
          // Fallback city data
          citiesData = [
            { id: 'london', name: 'London', slug: 'london', timezone: 'Europe/London' },
            { id: 'nyc', name: 'New York City', slug: 'nyc', timezone: 'America/New_York' },
            { id: 'boston', name: 'Boston', slug: 'boston', timezone: 'America/New_York' },
            { id: 'austin', name: 'Austin', slug: 'austin', timezone: 'America/Chicago' }
          ];
        }
        setAvailableCities(citiesData.length > 0 ? citiesData : defaultCities);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching cities:", err);
        setError(err.message || 'Could not load city data. Using defaults.');
        setAvailableCities(defaultCities); // Fallback to defaults
      } finally {
        setIsLoading(false);
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const citySlugFromUrl = pathParts[1]?.toLowerCase(); // Ensure lowercase for comparison

    if (availableCities.length === 0) {
      console.log('[useCity] Effect: No available cities yet, skipping city determination.');
      // Optionally set currentCity to null if it's not already, to clear stale city while loading
      if (currentCity !== null) {
        setCurrentCity(null);
      }
      return; // Wait for cities to load
    }

    let newTargetCity: CityConfig | null = null;

    // 1. Try to determine city from URL
    if (citySlugFromUrl) {
      const cityFromUrl = availableCities.find(c => c.slug.toLowerCase() === citySlugFromUrl);
      if (cityFromUrl) {
        newTargetCity = cityFromUrl;
        console.log('[useCity] Effect: City determined from URL:', newTargetCity.name);
      }
    }

    // 2. Handle cases where city is not determined from URL (e.g., root path or invalid slug)
    if (!newTargetCity) {
      // Define routes that are at the base level and don't imply a city context from path[1]
      const nonCitySpecificBaseRoutes = ['login', 'register', 'profile', 'itineraries', 'cities']; 
      const isNonCitySpecificBaseRoute = citySlugFromUrl && nonCitySpecificBaseRoutes.includes(citySlugFromUrl);

      if (!isNonCitySpecificBaseRoute) { 
        const defaultCitySlug = 'nyc'; // Your default city
        const defaultCity = availableCities.find(c => c.slug.toLowerCase() === defaultCitySlug) || availableCities[0];

        if (defaultCity) {
          // Condition for redirect: 
          // A) We are at the absolute root path '/'
          // B) Or, citySlugFromUrl was present (e.g. /somebadslug) but didn't match any available city
          const needsRedirectToDefault = location.pathname === '/' || 
                                       (citySlugFromUrl && !availableCities.some(c => c.slug.toLowerCase() === citySlugFromUrl));

          if (needsRedirectToDefault) {
            const targetPath = `/${defaultCity.slug}`;
            // Only navigate if we are not already at the target path (defensive check)
            if (location.pathname !== targetPath) {
              console.log(`[useCity] Effect: Path is '${location.pathname}'. Navigating to default/fallback city path:`, targetPath);
              navigate(targetPath, { replace: true });
              return; // CRITICAL: Exit effect early, it will re-run after navigation
            } else {
              // We are already at the target default path, so this is our target city
              newTargetCity = defaultCity;
              console.log('[useCity] Effect: Already at target default path, setting city:', newTargetCity.name);
            }
          }
        }
      }
      // If it IS a nonCitySpecificBaseRoute (e.g. /login), newTargetCity remains null.
      // If it's a deeper path without city context (e.g. /settings/user), newTargetCity also remains null.
      // This means currentCity will be set to null for these routes, which is intended.
    }

    // 3. Update currentCity context state only if it has actually changed
    if (currentCity?.slug !== newTargetCity?.slug) {
      console.log('[useCity] Effect: Updating currentCity context to:', newTargetCity?.name || 'null');
      setCurrentCity(newTargetCity);
    }

  }, [location.pathname, availableCities, navigate, currentCity]); // Added currentCity to dependency array

  const switchCity = useCallback((citySlug: string) => {
    console.log('[switchCity] Called with:', citySlug);
    const newCity = availableCities.find(c => c.slug.toLowerCase() === citySlug.toLowerCase());
    if (newCity) {
      console.log('[switchCity] Found city:', newCity.name);
      setCurrentCity(newCity);
      // Navigate to the new city path
      const newPath = `/${newCity.slug}`;
      console.log('[switchCity] Navigating to:', newPath);
      navigate(newPath);
    } else {
      console.warn(`Attempted to switch to invalid city slug: ${citySlug}`);
    }
  }, [availableCities, navigate]);

  return (
    <CityContext.Provider value={{ currentCity, availableCities, isLoading, error, switchCity }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = (): CityContextProps => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}; 