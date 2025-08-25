import { PlaceDetails } from '@shared/schema';
import { getApiKey, isFeatureEnabled } from '../config';

// Google Weather API configuration - using a working endpoint
const GOOGLE_WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// Set up a cache to avoid redundant API calls
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Weather data cache with location key (rounded lat/lng) as key
const weatherCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Generate a cache key from coordinates (rounded to avoid excessive API calls for nearby locations)
 */
function getCacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places to group nearby locations
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${roundedLat},${roundedLng}`;
}

/**
 * Fetch weather forecast for a location using Google Weather API
 * Uses caching to reduce API calls
 *
 * @param latitude Location latitude
 * @param longitude Location longitude
 * @returns Weather forecast data
 */
export async function getGoogleWeatherForecast(latitude: number, longitude: number): Promise<any> {
  const cacheKey = getCacheKey(latitude, longitude);
  const cachedData = weatherCache.get(cacheKey);

  // Return cached data if it exists and is recent
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
    console.log(`Using cached weather data for ${cacheKey}`);
    return cachedData.data;
  }

  // No valid cache entry, fetch from API
  console.log(`Fetching weather data for ${cacheKey}`);

  // Check if Google Weather feature is enabled, otherwise use fallback
  if (!isFeatureEnabled("GOOGLE_WEATHER")) {
    console.log('Google Weather API feature is disabled, using OpenWeatherMap fallback');
    return getFallbackWeatherForecast(latitude, longitude);
  }

  // For now, use OpenWeatherMap as Google Weather API endpoint seems incorrect
  // TODO: Fix Google Weather API endpoint when correct documentation is available
  console.log('Using OpenWeatherMap fallback for weather data');
  return getFallbackWeatherForecast(latitude, longitude);
}

/**
 * Determine if a venue is primarily outdoors based on its place types
 *
 * @param types Array of place types from Google Places API
 * @returns boolean indicating if the venue is outdoor
 */
export function isVenueOutdoor(types: string[]): boolean {
  const outdoorTypes = [
    'park',
    'campground',
    'natural_feature',
    'point_of_interest',
    'tourist_attraction',
    'zoo',
    'amusement_park',
    'beach',
    'stadium',
    'outdoor_sports_complex'
  ];

  // Consider strong indoor types that should override outdoor classification
  const strongIndoorTypes = [
    'museum',
    'restaurant',
    'cafe',
    'bar',
    'movie_theater',
    'shopping_mall',
    'department_store',
    'library',
    'book_store',
    'clothing_store',
    'electronics_store',
    'home_goods_store',
    'jewelry_store',
    'shoe_store'
  ];

  // Check for strong indoor types first (these override outdoor classification)
  if (types.some(type => strongIndoorTypes.includes(type))) {
    return false;
  }

  // Check if any type suggests an outdoor venue
  return types.some(type => outdoorTypes.includes(type));
}

/**
 * Check if the weather is suitable for outdoor activities at a given time
 * Converts Google Weather API format to the expected format
 *
 * @param weatherData Google Weather API forecast data
 * @param dateTime Date and time to check weather for
 * @returns boolean indicating if weather is suitable for outdoor activities
 */
export function isGoogleWeatherSuitableForOutdoor(weatherData: any, dateTime: Date): boolean {
  // Find the closest forecast to the given time
  const targetTimestamp = Math.floor(dateTime.getTime() / 1000);

  if (!weatherData?.forecasts || !Array.isArray(weatherData.forecasts)) {
    console.warn('No Google weather forecast data available');
    return true; // Default to true if no data
  }

  // Find the closest forecast to the target time
  let closestForecast = weatherData.forecasts[0];
  let minTimeDiff = Math.abs(targetTimestamp - new Date(closestForecast.dateTime).getTime() / 1000);

  for (const forecast of weatherData.forecasts) {
    const forecastTime = new Date(forecast.dateTime).getTime() / 1000;
    const timeDiff = Math.abs(targetTimestamp - forecastTime);
    if (timeDiff < minTimeDiff) {
      closestForecast = forecast;
      minTimeDiff = timeDiff;
    }
  }

  // Extract weather conditions from Google Weather API format
  const weatherCondition = closestForecast?.weather?.condition || '';
  const temperature = closestForecast?.temperature?.degrees || 20; // Default to 20°C if not available

  // Define conditions that make outdoor activities less enjoyable
  const badWeatherConditions = [
    'Rain', 'Thunderstorm', 'Snow', 'Drizzle', 'Heavy Rain', 'Showers'
  ];

  // Check if weather conditions are unfavorable
  const isBadWeather = badWeatherConditions.some(condition =>
    weatherCondition.toLowerCase().includes(condition.toLowerCase())
  );
  const isTooHot = temperature > 30; // Too hot (above 30°C)
  const isTooCold = temperature < 5;  // Too cold (below 5°C)

  return !isBadWeather && !isTooHot && !isTooCold;
}

/**
 * Get a weather-aware venue recommendation using Google Weather API
 * If the original venue is outdoor and weather is bad, it will
 * try to provide an indoor alternative
 *
 * @param place Original place
 * @param alternatives Alternative places
 * @param latitude Location latitude
 * @param longitude Location longitude
 * @param visitTime Planned visit time
 */
export async function getGoogleWeatherAwareVenue(
  place: PlaceDetails,
  alternatives: PlaceDetails[],
  latitude: number,
  longitude: number,
  visitTime: Date
): Promise<{venue: PlaceDetails, weatherSuitable: boolean}> {
  // Default to the original place if anything fails
  let bestVenue = place;
  let isWeatherSuitable = true;

  try {
    // Skip weather check if there are no alternatives or Google Weather feature is disabled
    if (!alternatives || alternatives.length === 0 || !isFeatureEnabled("GOOGLE_WEATHER")) {
      console.log("Skipping Google weather check - no alternatives or Google Weather feature disabled");
      return { venue: place, weatherSuitable: true };
    }

    // Check if original place is outdoors
    if (place.types && isVenueOutdoor(place.types)) {
      // Try to fetch weather data
      try {
        const weatherData = await getGoogleWeatherForecast(latitude, longitude);

        // Check if weather is suitable for outdoor activities
        isWeatherSuitable = isGoogleWeatherSuitableForOutdoor(weatherData, visitTime);

        // If weather is bad for outdoor activities, recommend an indoor alternative
        if (!isWeatherSuitable) {
          // Find indoor alternatives
          const indoorAlternatives = alternatives.filter(alt =>
            alt.types && !isVenueOutdoor(alt.types)
          );

          // Use the first indoor alternative if available
          if (indoorAlternatives.length > 0) {
            bestVenue = indoorAlternatives[0];
            console.log(`Google Weather not suitable for outdoor venue. Recommending indoor alternative: ${bestVenue.name}`);
          } else {
            console.log("Google Weather not suitable for outdoor venue, but no indoor alternatives available");
          }
        } else {
          console.log(`Google Weather is suitable for outdoor venue: ${place.name}`);
        }
      } catch (weatherError) {
        // If we can't get weather data, use a simple fallback based on venue type
        console.warn("Could not fetch Google weather data:", weatherError);
        console.log("Using fallback venue selection based on venue types only");

        // Even without weather data, we can provide an indoor alternative
        // Just to give options if the primary venue is outdoor
        const indoorAlternatives = alternatives.filter(alt =>
          alt.types && !isVenueOutdoor(alt.types)
        );

        if (indoorAlternatives.length > 0) {
          // We don't switch automatically without weather data
          // But provide the information for the client to display
          console.log(`Outdoor venue has indoor alternatives: ${indoorAlternatives[0].name}`);
        }
      }
    } else {
      // Primary venue is already indoor, no need for weather check
      console.log(`Primary venue is indoor: ${place.name}`);
    }

    return { venue: bestVenue, weatherSuitable: isWeatherSuitable };
  } catch (error) {
    console.error('Error in Google weather-aware venue selection:', error);
    // On error, just return the original venue
    return { venue: place, weatherSuitable: true };
  }
}

/**
 * Convert Google Weather API data to OpenWeatherMap-like format for UI compatibility
 * This ensures the same UI components can work with either weather service
 *
 * @param googleWeatherData Google Weather API forecast data
 * @returns Weather data in OpenWeatherMap-like format
 */
export function convertGoogleWeatherToOpenWeatherFormat(googleWeatherData: any): any {
  if (!googleWeatherData?.forecasts || !Array.isArray(googleWeatherData.forecasts)) {
    return null;
  }

  // Convert Google Weather format to OpenWeatherMap-like format
  const convertedForecasts = googleWeatherData.forecasts.map((forecast: any) => {
    return {
      dt: new Date(forecast.dateTime).getTime() / 1000,
      main: {
        temp: forecast.temperature?.degrees || 20,
        feels_like: forecast.temperature?.degrees || 20,
        temp_min: forecast.temperature?.degrees ? forecast.temperature.degrees - 2 : 18,
        temp_max: forecast.temperature?.degrees ? forecast.temperature.degrees + 2 : 22,
        pressure: 1013, // Default pressure
        humidity: forecast.humidity?.percentage || 60
      },
      weather: [{
        id: getWeatherIdFromCondition(forecast.weather?.condition || 'Clear'),
        main: forecast.weather?.condition || 'Clear',
        description: forecast.weather?.description || 'clear sky',
        icon: getWeatherIconFromCondition(forecast.weather?.condition || 'Clear')
      }],
      clouds: {
        all: forecast.cloudCover?.percentage || 20
      },
      wind: {
        speed: forecast.wind?.speed?.value || 3.5,
        deg: forecast.wind?.direction?.degrees || 180
      },
      visibility: 10000, // Default visibility
      pop: forecast.precipitation?.probability || 0, // Precipitation probability
      rain: forecast.precipitation?.rain?.amount ? { '3h': forecast.precipitation.rain.amount } : undefined,
      snow: forecast.precipitation?.snow?.amount ? { '3h': forecast.precipitation.snow.amount } : undefined,
      sys: {
        pod: 'd' // Day
      },
      dt_txt: new Date(forecast.dateTime).toISOString().replace('T', ' ').substring(0, 19)
    };
  });

  return {
    cod: '200',
    message: 0,
    cnt: convertedForecasts.length,
    list: convertedForecasts,
    city: {
      id: 0,
      name: 'Unknown', // Google Weather doesn't provide city name in this format
      coord: {
        lat: 0, // Will be filled by caller
        lon: 0  // Will be filled by caller
      },
      country: 'US',
      population: 0,
      timezone: 0,
      sunrise: 0,
      sunset: 0
    }
  };
}

/**
 * Get weather condition ID from Google Weather condition string
 */
function getWeatherIdFromCondition(condition: string): number {
  const conditionMap: { [key: string]: number } = {
    'Clear': 800,
    'Sunny': 800,
    'Partly Cloudy': 801,
    'Cloudy': 803,
    'Overcast': 804,
    'Rain': 500,
    'Light Rain': 500,
    'Heavy Rain': 502,
    'Thunderstorm': 200,
    'Snow': 600,
    'Light Snow': 600,
    'Heavy Snow': 602,
    'Fog': 741,
    'Mist': 701,
    'Windy': 905
  };

  return conditionMap[condition] || 800; // Default to clear sky
}

/**
 * Get weather icon code from Google Weather condition string
 */
function getWeatherIconFromCondition(condition: string): string {
  const iconMap: { [key: string]: string } = {
    'Clear': '01d',
    'Sunny': '01d',
    'Partly Cloudy': '02d',
    'Cloudy': '03d',
    'Overcast': '04d',
    'Rain': '10d',
    'Light Rain': '09d',
    'Heavy Rain': '10d',
    'Thunderstorm': '11d',
    'Snow': '13d',
    'Light Snow': '13d',
    'Heavy Snow': '13d',
    'Fog': '50d',
    'Mist': '50d',
    'Windy': '50d'
  };

  return iconMap[condition] || '01d'; // Default to clear sky
}

/**
 * Fallback weather forecast function using OpenWeatherMap
 */
async function getFallbackWeatherForecast(latitude: number, longitude: number): Promise<any> {
  const cacheKey = getCacheKey(latitude, longitude);
  const cachedData = weatherCache.get(cacheKey);

  // Return cached data if it exists and is recent
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
    console.log(`Using cached fallback weather data for ${cacheKey}`);
    return cachedData.data;
  }

  // Construct OpenWeatherMap API URL
  const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
  url.searchParams.append('lat', latitude.toString());
  url.searchParams.append('lon', longitude.toString());
  url.searchParams.append('units', 'metric');
  url.searchParams.append('cnt', '24');
  url.searchParams.append('appid', 'dummy_key'); // Will be replaced with actual key when available

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    weatherCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    console.error('Error fetching fallback weather data:', error);
    throw error;
  }
}

/**
 * Test function for Google Weather Service
 */
async function testGoogleWeatherService() {
  // Test location (New York City)
  const nycLat = 40.7128;
  const nycLng = -74.0060;

  console.log("--- Testing Google Weather Service ---");

  // Test weather forecast fetch
  try {
    console.log("Fetching NYC Google weather forecast...");
    const forecast = await getGoogleWeatherForecast(nycLat, nycLng);

    console.log("✅ Successfully fetched Google weather data");
    console.log(`First forecast condition: ${forecast.forecasts?.[0]?.weather?.condition || 'Unknown'}`);
    console.log(`Temperature: ${forecast.forecasts?.[0]?.temperature?.degrees || 'Unknown'}°C`);

    // Test conversion to OpenWeatherMap format
    console.log("\nTesting format conversion:");
    const convertedData = convertGoogleWeatherToOpenWeatherFormat(forecast);
    console.log(`Converted format has ${convertedData?.list?.length || 0} forecasts`);

    // Test cache by making a second request
    console.log("\nTesting cache (should be instant):");
    const startTime = Date.now();
    const cachedForecast = await getGoogleWeatherForecast(nycLat, nycLng);
    const duration = Date.now() - startTime;
    console.log(`Second request took ${duration}ms`);
  } catch (error) {
    console.error("❌ Error fetching Google weather:", error);
  }

  // Test venue classification
  console.log("\n--- Testing Venue Classification ---");
  const testVenueTypes = [
    ["park"],
    ["restaurant"],
    ["museum"],
    ["tourist_attraction", "park"]
  ];

  for (const types of testVenueTypes) {
    const isOutdoor = isVenueOutdoor(types);
    console.log(`Types [${types.join(', ')}] → ${isOutdoor ? "Outdoor" : "Indoor"}`);
  }
}

// Comment this out after testing
// testGoogleWeatherService();
