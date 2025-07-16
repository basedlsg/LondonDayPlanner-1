// server/tests/setup.ts
import { vi } from 'vitest';

// Mock environment variables if they are crucial for module initialization
// and not set globally for tests.
// process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
// process.env.SESSION_SECRET = 'test-secret-for-vitest';
// process.env.GEMINI_API_KEY = 'test-gemini-key'; 
// process.env.WEATHER_API_KEY = 'test-weather-key';

// Mock the config module
vi.mock('@/config', async (importOriginal) => {
  try {
    const actualConfig = await importOriginal();
    // console.log("Actual config loaded in mock:", actualConfig);
    return {
      ...(actualConfig as any), // Spread actual config to keep defaults not overridden
      getApiKey: (keyName: string) => {
        // console.log(`Mocked getApiKey called for: ${keyName}`);
        if (keyName === 'GEMINI_API_KEY') return 'MOCK_GEMINI_KEY_FOR_TESTS';
        if (keyName === 'GOOGLE_PLACES_API_KEY') return 'MOCK_PLACES_KEY_FOR_TESTS';
        if (keyName === 'WEATHER_API_KEY') return 'MOCK_WEATHER_KEY_FOR_TESTS';
        if (keyName === 'GOOGLE_CLIENT_ID') return 'MOCK_GOOGLE_CLIENT_ID_FOR_TESTS';
        return undefined; // Default for other keys
      },
      isFeatureEnabled: (featureName: string) => {
        // console.log(`Mocked isFeatureEnabled called for: ${featureName}`);
        // Enable all features for testing by default, can be more granular if needed
        if (featureName === 'AI_PROCESSING') return true;
        if (featureName === 'USE_GEMINI') return true;
        if (featureName === 'WEATHER_AWARENESS') return true;
        if (featureName === 'PLACES_API') return true;
        return false; // Default for other features
      },
      // If your config module exports the config object directly:
      // config: { 
      //   ...((actualConfig as any).config), 
      //   features: { AI_PROCESSING: true, USE_GEMINI: true, WEATHER_AWARENESS: true, PLACES_API: true },
      //   apiKeysPresent: { GEMINI_API_KEY: true, GOOGLE_PLACES_API_KEY: true, WEATHER_API_KEY: true, GOOGLE_CLIENT_ID: true },
      // }
    };
  } catch (e) {
    console.error("Error mocking config:", e);
    return {}; // Fallback to empty object if actual import fails
  }
});

console.log("Vitest setup file loaded and config module mocked."); 