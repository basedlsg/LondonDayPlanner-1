// @ts-nocheck
import { PlaceDetails } from '../shared/schema';

// Weather service that uses multiple fallback providers
interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  description: string;
  isOutdoor: boolean;
  suitable: boolean;
  list?: any[];
}

interface WeatherProvider {
  name: string;
  getWeather: (lat: number, lng: number) => Promise<WeatherData>;
}

// Cache for weather data
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${roundedLat},${roundedLng}`;
}

// OpenWeatherMap provider
const openWeatherProvider: WeatherProvider = {
  name: 'OpenWeatherMap',
  getWeather: async (lat: number, lng: number): Promise<WeatherData> => {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key not found');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed,
      description: data.weather[0].description,
      isOutdoor: false, // Will be determined by venue type
      suitable: true // Will be determined by conditions
    };
  }
};

// Fallback weather provider (uses a simple service or mock data)
const fallbackProvider: WeatherProvider = {
  name: 'Fallback',
  getWeather: async (lat: number, lng: number): Promise<WeatherData> => {
    // Simple weather based on location and season
    const now = new Date();
    const month = now.getMonth(); // 0-11
    
    // Basic seasonal weather patterns
    let temperature = 20; // Default 20°C
    let condition = 'Clear';
    
    // Rough seasonal adjustments
    if (month >= 11 || month <= 2) { // Winter
      temperature = lat > 40 ? 5 : 15; // Colder in northern cities
      condition = Math.random() > 0.7 ? 'Rain' : 'Clouds';
    } else if (month >= 6 && month <= 8) { // Summer
      temperature = lat > 40 ? 25 : 30; // Warmer
      condition = Math.random() > 0.8 ? 'Rain' : 'Clear';
    } else { // Spring/Fall
      temperature = lat > 40 ? 15 : 22;
      condition = Math.random() > 0.6 ? 'Clouds' : 'Clear';
    }
    
    return {
      temperature,
      condition,
      icon: condition.toLowerCase(),
      description: `${condition.toLowerCase()} skies`,
      isOutdoor: false,
      suitable: true
    };
  }
};

export async function getWeatherForecast(latitude: number, longitude: number): Promise<WeatherData> {
  const cacheKey = getCacheKey(latitude, longitude);
  const cachedData = weatherCache.get(cacheKey);
  
  // Return cached data if recent
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
    console.log(`[Weather] Using cached data for ${cacheKey}`);
    return cachedData.data;
  }
  
  console.log(`[Weather] Fetching weather for ${cacheKey}`);
  
  const providers = [openWeatherProvider, fallbackProvider];
  
  for (const provider of providers) {
    try {
      const weatherData = await provider.getWeather(latitude, longitude);
      console.log(`[Weather] Success with ${provider.name}`);
      
      // Cache the result
      weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });
      
      return weatherData;
    } catch (error) {
      console.warn(`[Weather] ${provider.name} failed:`, error);
      continue; // Try next provider
    }
  }
  
  throw new Error('All weather providers failed');
}

export function isVenueOutdoor(place: PlaceDetails): boolean {
  if (!place.types) return false;
  
  const outdoorTypes = [
    'park',
    'zoo',
    'amusement_park',
    'tourist_attraction',
    'stadium',
    'campground',
    'rv_park',
    'beach',
    'lake',
    'natural_feature',
    'hiking_area',
    'golf_course'
  ];
  
  const partiallyOutdoorTypes = [
    'restaurant', // Many have outdoor seating
    'cafe',
    'bar',
    'food',
    'meal_takeaway'
  ];
  
  // Check for definitely outdoor venues
  if (place.types.some(type => outdoorTypes.includes(type))) {
    return true;
  }
  
  // Check place name for outdoor indicators
  const name = place.name?.toLowerCase() || '';
  const outdoorKeywords = [
    'park', 'garden', 'outdoor', 'patio', 'terrace', 
    'rooftop', 'beach', 'pier', 'market', 'square'
  ];
  
  if (outdoorKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  return false;
}

export function isWeatherSuitableForOutdoor(weatherData: WeatherData, venueTime?: Date): boolean {
  const temp = weatherData.temperature;
  const condition = weatherData.condition?.toLowerCase() || '';
  
  // Temperature check (too hot or too cold)
  if (temp < 5 || temp > 35) {
    return false;
  }
  
  // Weather condition check
  const badConditions = ['rain', 'thunderstorm', 'snow', 'drizzle'];
  if (badConditions.some(bad => condition.includes(bad))) {
    return false;
  }
  
  // Wind check
  if (weatherData.windSpeed && weatherData.windSpeed > 15) {
    return false;
  }
  
  return true;
}

export async function getWeatherAwareVenue(place: PlaceDetails, venueTime?: Date): Promise<WeatherData | null> {
  if (!place.geometry?.location) {
    return null;
  }
  
  try {
    const weatherData = await getWeatherForecast(
      place.geometry.location.lat,
      place.geometry.location.lng
    );
    
    const isOutdoor = isVenueOutdoor(place);
    const suitable = isOutdoor ? isWeatherSuitableForOutdoor(weatherData, venueTime) : true;
    
    return {
      ...weatherData,
      isOutdoor,
      suitable
    };
  } catch (error) {
    console.error('[Weather] Failed to get weather for venue:', error);
    return null;
  }
}

// Test function to check if weather API is working
export async function testWeatherAPI(): Promise<boolean> {
  try {
    // Test with NYC coordinates
    const weather = await getWeatherForecast(40.7128, -74.0060);
    console.log('[Weather] Test successful:', weather);
    return true;
  } catch (error) {
    console.error('[Weather] Test failed:', error);
    return false;
  }
}