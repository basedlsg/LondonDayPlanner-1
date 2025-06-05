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
        const response = await fetch('/api/cities');
        if (!response.ok) {
          throw new Error('Failed to fetch city configurations');
        }
        const citiesData: CityConfig[] = await response.json();
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
    // Extract city slug from pathname
    const pathParts = location.pathname.split('/');
    const citySlugFromUrl = pathParts[1]; // First part after /
    
    console.log('[useCity] Effect triggered with:', { 
      availableCitiesLength: availableCities.length, 
      citySlugFromUrl,
      availableSlugs: availableCities.map(c => c.slug),
      currentPath: location.pathname,
      pathParts
    });
    
    if (availableCities.length > 0) {
      let cityToSet: CityConfig | null = null;

      // Check if the first part of the path is a valid city slug
      const isValidCitySlug = citySlugFromUrl && availableCities.some(c => c.slug.toLowerCase() === citySlugFromUrl.toLowerCase());

      if (isValidCitySlug) {
        console.log('[useCity] Looking for city:', citySlugFromUrl);
        cityToSet = availableCities.find(c => c.slug.toLowerCase() === citySlugFromUrl.toLowerCase()) || null;
        console.log('[useCity] Found city:', cityToSet?.name || 'NOT FOUND');
      }
      
      // If we're on a non-city route (like /login, /register, etc), don't redirect
      const nonCityRoutes = ['login', 'register', 'profile', 'itineraries', 'cities'];
      const isNonCityRoute = nonCityRoutes.includes(citySlugFromUrl);
      
      // If no valid city in URL and not on a special route, set default
      if (!cityToSet && !isNonCityRoute) {
        console.log('[useCity] No valid city in URL, setting default NYC');
        const defaultSlug = 'nyc';
        cityToSet = availableCities.find(c => c.slug.toLowerCase() === defaultSlug.toLowerCase()) || availableCities[0];
        
        // Only navigate if we're not already on a city route
        if (cityToSet && location.pathname === '/') {
          console.log('[useCity] Navigating to default city:', `/${cityToSet.slug}`);
          navigate(`/${cityToSet.slug}`, { replace: true });
        }
      }
      
      console.log('[useCity] Setting current city to:', cityToSet?.name || 'null');
      setCurrentCity(cityToSet);
    }
  }, [location.pathname, availableCities, navigate]);

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