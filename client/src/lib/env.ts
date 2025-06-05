/**
 * Centralized access to environment variables for the client-side application
 * 
 * This module helps provide type safety and consistent access to both
 * environment variables and server-provided configuration.
 */
import { useState, useEffect } from 'react';

// Directly available environment variables
export const BASE_URL = import.meta.env.VITE_BASE_URL || '';

// Remote configuration values that must be fetched from server
interface ServerConfig {
  googleClientId: string;
  // Add other remote configuration values here
}

// Initialization state
let config: ServerConfig | null = null;
let isLoading = false;
let loadError: Error | null = null;
let loadPromise: Promise<ServerConfig> | null = null;

/**
 * Fetch configuration from the server
 */
export async function fetchConfig(): Promise<ServerConfig> {
  // If we already have the config, return it
  if (config) {
    return config;
  }
  
  // If we're already loading, return the existing promise
  if (loadPromise) {
    return loadPromise;
  }
  
  // Start a new load
  isLoading = true;
  loadError = null;
  
  loadPromise = fetch('/api/config/public')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      config = data;
      isLoading = false;
      return data;
    })
    .catch(error => {
      loadError = error;
      isLoading = false;
      console.error('Error loading configuration:', error);
      throw error;
    });
  
  return loadPromise;
}

/**
 * Hook to access configuration values
 */
export function useConfig() {
  const [localConfig, setLocalConfig] = useState<ServerConfig | null>(config);
  const [loading, setLoading] = useState(!config && isLoading);
  const [error, setError] = useState<Error | null>(loadError);
  
  useEffect(() => {
    // If we already have the config, no need to fetch
    if (config) {
      setLocalConfig(config);
      return;
    }
    
    // Start loading
    setLoading(true);
    
    fetchConfig()
      .then(data => {
        setLocalConfig(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  
  return { config: localConfig, loading, error };
}

// Pre-fetch config on module load to speed up first access
fetchConfig().catch(err => console.warn('Failed to prefetch config:', err));

// This file is used to load environment variables for the client-side application.
// It fetches configuration from a backend endpoint and merges it with defaults.

interface AppFeatures {
  auth: boolean;
  weather: boolean;
  // Add other feature flags as needed
}

interface AppConfig {
  apiUrl: string;
  googleClientId?: string;
  features: AppFeatures;
  // Add other configuration properties as needed
}

// Default configuration values
const defaultConfig: AppConfig = {
  apiUrl: window.location.origin, // Default API URL to current origin
  googleClientId: '', // Default Google Client ID (needs to be set for OAuth)
  features: {
    auth: false,       // Default auth feature flag to false
    weather: false,    // Default weather feature flag to false
  },
};

let currentConfig: AppConfig | null = null;
let configPromise: Promise<AppConfig> | null = null;

/**
 * Asynchronously loads the application configuration.
 * Fetches configuration from '/api/config/public' and merges it with defaults.
 * Caches the loaded configuration to avoid redundant fetches.
 * @returns A promise that resolves to the application configuration.
 */
export async function loadConfig(): Promise<AppConfig> {
  if (currentConfig) {
    return Promise.resolve(currentConfig);
  }

  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      const response = await fetch('/api/config/public');
      if (!response.ok) {
        console.warn('Config endpoint not available, using defaults');
        currentConfig = defaultConfig;
      } else {
        const data = await response.json();
        currentConfig = { ...defaultConfig, ...data };
      }
    } catch (error) {
      console.warn('Failed to load config:', error);
      currentConfig = defaultConfig;
    }
    return currentConfig || defaultConfig;
  })();

  return configPromise.then(config => config || defaultConfig);
}

/**
 * Gets the currently loaded application configuration.
 * If the configuration is not yet loaded, it initiates loading.
 * @returns The application configuration.
 */
export function getConfig(): AppConfig {
  if (!currentConfig && !configPromise) {
    console.warn("getConfig called before loadConfig, initiating load. Consider pre-loading.");
    loadConfig(); 
  }
  return currentConfig || defaultConfig; 
}

// Example of how to use early in your application (e.g., main.tsx or App.tsx)
// loadConfig().then(config => {
//   console.log('Application config loaded:', config);
//   // Initialize other parts of your app that depend on config
// });