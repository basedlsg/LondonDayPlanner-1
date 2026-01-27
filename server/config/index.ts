// Environment configuration

export interface Config {
  geminiApiKey: string;
  placesApiKey: string;
  weatherApiKey?: string;
  port: number;
  nodeEnv: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  return {
    geminiApiKey: getRequiredEnv('GEMINI_API_KEY'),
    placesApiKey: getRequiredEnv('GOOGLE_PLACES_API_KEY'),
    weatherApiKey: getOptionalEnv('GOOGLE_WEATHER_API_KEY'),
    port: parseInt(getOptionalEnv('PORT', '3000'), 10),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  };
}

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

export function isProduction(): boolean {
  return getConfig().nodeEnv === 'production';
}
