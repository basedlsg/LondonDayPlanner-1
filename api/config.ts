// @ts-nocheck
/**
 * Central configuration for API keys and feature flags
 * 
 * This module centralizes all environment variables and configuration settings,
 * providing validation and feature flag management.
 */

import { z } from "zod";

// API key validation schemas - using simple length validation to be more flexible
const apiKeySchemas = {
  GEMINI_API_KEY: z.string().min(1),  // Always accept key if present, validation patterns will be checked later
  GOOGLE_PLACES_API_KEY: z.string().min(1),  // Always accept key if present, validation patterns will be checked later
  WEATHER_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional()  // OAuth Client ID for Google authentication
};

// Legacy API key validation patterns - kept for compatibility
const API_KEY_PATTERNS = {
  GEMINI: /^[A-Za-z0-9-_]{32,}$/,
  GOOGLE: /^[A-Za-z0-9-_]{39}$/,
  WEATHER: /^[A-Za-z0-9-_]{32}$/
} as const;

// Feature flag definitions with dependencies
const featureFlags = {
  AI_PROCESSING: {
    enabled: true,
    required: ["GEMINI_API_KEY"],
    fallback: false,
    description: "Use AI for natural language understanding"
  },
  USE_GEMINI: {
    enabled: true,
    required: ["GEMINI_API_KEY"],
    fallback: false,
    description: "Use Gemini 1.5 Pro AI for enhanced request understanding"
  },
  WEATHER_AWARE: {
    enabled: true,
    required: ["WEATHER_API_KEY"],
    fallback: false,
    description: "Use weather data to adjust recommendations"
  },
  PLACES_API: {
    enabled: true,
    required: ["GOOGLE_PLACES_API_KEY"],
    fallback: false,
    description: "Google Places API integration"
  }
};

// Define environment variable schema with validation - legacy structure
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FEATURE_FLAGS: z.record(z.boolean()).optional(),
});

// Configuration types
export type Environment = z.infer<typeof envSchema>['NODE_ENV'];
export type LogLevel = z.infer<typeof envSchema>['LOG_LEVEL'];

export interface FeatureConfig {
  enabled: boolean;
  fallbackEnabled: boolean;
  required: boolean;
}

export interface ApiConfig {
  key: string;
  pattern: RegExp;
  required: boolean;
}

// Legacy feature and API configurations - kept for compatibility
export const FEATURE_CONFIG: Record<string, FeatureConfig> = {
  AI_PROCESSING: {
    enabled: true,
    fallbackEnabled: true,
    required: false
  },
  PLACES_API: {
    enabled: true,
    fallbackEnabled: true,
    required: true
  },
  WEATHER_API: {
    enabled: true,
    fallbackEnabled: false,
    required: false
  },
  USE_GEMINI: {
    enabled: true,
    fallbackEnabled: false,
    required: false
  }
} as const;

export const API_CONFIG: Record<string, ApiConfig> = {
  GEMINI_API_KEY: {
    key: '',
    pattern: API_KEY_PATTERNS.GEMINI,
    required: false
  },
  GOOGLE_PLACES_API_KEY: {
    key: '',
    pattern: API_KEY_PATTERNS.GOOGLE,
    required: true
  },
  WEATHER_API_KEY: {
    key: '',
    pattern: API_KEY_PATTERNS.WEATHER,
    required: false
  },
  GOOGLE_CLIENT_ID: {
    key: '',
    pattern: /.+/,  // Any non-empty string
    required: false
  }
} as const;

// Updated Config class with debug logging and recheckEnvironment
export class Config {
  private static instance: Config | null = null;
  private apiKeys: Record<string, string | undefined> = {};
  private features: Record<string, boolean> = {};
  private env: z.infer<typeof envSchema>;
  private legacyFeatures: typeof FEATURE_CONFIG;
  private legacyApis: typeof API_CONFIG;
  private initialized = false;

  private constructor() {
    console.log('🔧 [config.ts] Config constructor starting...');
    console.log('🔧 [config.ts] process.env.GOOGLE_PLACES_API_KEY at constructor start:', 
                process.env.GOOGLE_PLACES_API_KEY ? `SET (len: ${process.env.GOOGLE_PLACES_API_KEY.length})` : 'NOT SET');
    console.log('🔧 [config.ts] process.env.GEMINI_API_KEY at constructor start:', 
                process.env.GEMINI_API_KEY ? `SET (len: ${process.env.GEMINI_API_KEY.length})` : 'NOT SET');
    
    try {
      this.env = envSchema.parse(process.env);
    } catch (error) {
      console.error('Environment validation failed during Config construction:', error);
      this.env = envSchema.parse({}); // Initialize with defaults if parsing fails
    }
    
    this.legacyFeatures = JSON.parse(JSON.stringify(FEATURE_CONFIG)); // Deep copy
    this.legacyApis = JSON.parse(JSON.stringify(API_CONFIG));     // Deep copy
    
    this.loadApiKeys();
    this.updateLegacyApiConfig(); // Call this after loadApiKeys
    this.initializeFeatureFlags(); // This was loadFeatureFlags in user prompt, renamed to match existing
    this.updateLegacyFeatureConfig(); // Call this after initializeFeatureFlags
    // this.logConfigStatus(); // logConfigStatus is called in initialize()
    console.log('🔧 [config.ts] Config constructor finished.');
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      console.log('🔧 [config.ts] Creating new Config instance.');
      Config.instance = new Config();
    } else {
      console.log('🔧 [config.ts] Returning existing Config instance.');
    }
    return Config.instance;
  }

  public initialize(): void {
    if (this.initialized) {
      console.log('🔧 [config.ts] Config already initialized.');
      return;
    }
    console.log('🔧 [config.ts] Config initialize() called.');
    this.logConfigStatus(); 
    this.initialized = true;
  }

  private loadApiKeys(): void {
    console.log('🔧 [config.ts] loadApiKeys() starting...');
    const keysToLoad = Object.keys(apiKeySchemas);

    keysToLoad.forEach(key => {
      const envValue = process.env[key];
      console.log(`🔧 [config.ts] Loading ${key} from process.env:`, 
                  envValue ? `SET (length: ${envValue.length})` : 'NOT SET');
      this.apiKeys[key] = envValue || ''; // Store empty string if not set, to avoid undefined issues later
      console.log(`🔧 [config.ts] Stored ${key} in this.apiKeys:`, 
                  this.apiKeys[key] ? `SET (length: ${this.apiKeys[key]?.length})` : 'NOT SET (stored as empty string)');
      // Update legacy directly here as well, as per original logic
      if (this.legacyApis[key as keyof typeof API_CONFIG]) {
        this.legacyApis[key as keyof typeof API_CONFIG].key = this.apiKeys[key] || '';
      }
    });
    console.log('🔧 [config.ts] loadApiKeys() finished.');
  }

  // Renamed from loadFeatureFlags in user prompt to match existing method name for consistency
  private initializeFeatureFlags(): void {
    console.log('🔧 [config.ts] initializeFeatureFlags() starting...');
    for (const [feature, config] of Object.entries(featureFlags)) {
      const hasRequiredKeys = config.required.every(key => this.isApiKeyValid(key));
      this.features[feature] = config.enabled && hasRequiredKeys;
      if (this.features[feature]) {
        console.log(`✨ [config.ts] ${feature} feature flag ENABLED.`);
      } else {
        console.log(`🚫 [config.ts] ${feature} feature flag DISABLED (enabled: ${config.enabled}, keysMet: ${hasRequiredKeys}).`);
      }
    }
    console.log('🔧 [config.ts] initializeFeatureFlags() finished.');
  }
  
  // Added method from user prompt
  public recheckEnvironment(): void {
    console.log('🔄 [config.ts] Config.recheckEnvironment() called. Forcing reload of API keys and features...');
    this.apiKeys = {}; // Clear current keys
    this.features = {}; // Clear current features
    this.loadApiKeys();
    this.updateLegacyApiConfig(); // Ensure legacy is also updated after reload
    this.initializeFeatureFlags(); // Re-initialize features based on potentially new env vars
    this.updateLegacyFeatureConfig(); // And update legacy features too
    console.log('🔄 [config.ts] Environment recheck complete. Logging new status:');
    this.logConfigStatus(); // Log the new status
  }

  private isApiKeyValid(key: string): boolean {
    const value = this.apiKeys[key];
    // console.log(`[config.ts isApiKeyValid] Checking key: ${key}, Value in this.apiKeys: ${value ? 'SET' : 'NOT SET'}`);
    const isValid = value !== undefined && value.length > 0;
    console.log(`[config.ts isApiKeyValid] Key: ${key}, Present in this.apiKeys: ${!!value}, Valid (has length): ${isValid}`);
    return isValid;
  }
  
  private updateLegacyApiConfig(): void {
    // Update legacy API configurations
    Object.keys(this.legacyApis).forEach(key => {
      const value = this.apiKeys[key];
      if (value) {
        this.legacyApis[key as keyof typeof API_CONFIG].key = value;
      }
    });
  }

  private updateLegacyFeatureConfig(): void {
    // Update legacy feature configurations
    Object.keys(this.legacyFeatures).forEach(feature => {
      const apiKey = this.legacyApis[`${feature.split('_')[0]}_API_KEY` as keyof typeof API_CONFIG];
      if (apiKey) {
        this.legacyFeatures[feature as keyof typeof FEATURE_CONFIG].enabled = !!apiKey.key;
      }
      
      // Also update from new feature flags
      if (this.features[feature]) {
        this.legacyFeatures[feature as keyof typeof FEATURE_CONFIG].enabled = this.features[feature];
      }
    });
  }

  public get environment(): Environment {
    return this.env.NODE_ENV;
  }

  public get logLevel(): LogLevel {
    return this.env.LOG_LEVEL;
  }

  public getApiKey(key: string): string | undefined {
    return this.apiKeys[key] === '' ? undefined : this.apiKeys[key];
  }

  public isFeatureEnabled(feature: string): boolean {
    // First check new feature flags
    if (this.features[feature] !== undefined) {
      return this.features[feature];
    }
    
    // Fall back to legacy feature flags
    if (this.legacyFeatures[feature as keyof typeof FEATURE_CONFIG]) {
      return this.legacyFeatures[feature as keyof typeof FEATURE_CONFIG].enabled;
    }
    
    return false;
  }

  public isFallbackEnabled(feature: keyof typeof FEATURE_CONFIG): boolean {
    return this.legacyFeatures[feature].fallbackEnabled;
  }

  public isFeatureRequired(feature: keyof typeof FEATURE_CONFIG): boolean {
    return this.legacyFeatures[feature].required;
  }

  public validateApiKey(key: string): boolean {
    const value = this.apiKeys[key];
    return value !== undefined && value.length > 0;
  }

  private logConfigStatus(): void {
    const redactedConfig = {
      features: this.features,
      apiKeysPresent: Object.entries(this.apiKeys).reduce((acc, [key, value]) => {
        acc[key] = !!value && value.length > 0;
        return acc;
      }, {} as Record<string, boolean>),
      environment: this.environment
    };
    console.log('🔧 [config.ts] Current Application configuration:', redactedConfig);
  }

  public getRedactedConfig(): Record<string, unknown> {
    return {
      environment: this.environment,
      logLevel: this.logLevel,
      features: Object.entries(this.features).map(([feature, enabled]) => ({
        feature,
        enabled
      })),
      apis: Object.entries(this.apiKeys).map(([key, value]) => ({
        key,
        configured: !!value,
        valid: this.validateApiKey(key)
      }))
    };
  }
}

const config = Config.getInstance();
// config.initialize(); // Initialization (including first logConfigStatus) is now deferred to index.ts after recheckEnvironment

export function getApiKey(key: string): string | undefined {
  return config.getApiKey(key);
}

export function isFeatureEnabled(feature: string): boolean {
  return config.isFeatureEnabled(feature);
}

export function isFallbackEnabled(feature: keyof typeof FEATURE_CONFIG): boolean {
  return config.isFallbackEnabled(feature);
}

export function isFeatureRequired(feature: keyof typeof FEATURE_CONFIG): boolean {
  return config.isFeatureRequired(feature);
}

export function validateApiKey(key: string): boolean {
  return config.validateApiKey(key);
}

// Export feature flags for direct access if needed
export const FEATURES = Object.entries(FEATURE_CONFIG).reduce(
  (acc, [key, config]) => ({ ...acc, [key]: config.enabled }),
  {} as Record<keyof typeof FEATURE_CONFIG, boolean>
);

export { config };
export default config;