import React from 'react';
import { Cloud, CloudRain, Sun, Umbrella, Thermometer, Eye, Wind } from 'lucide-react';

interface WeatherCondition {
  main: string;
  description: string;
  icon: string;
}

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: WeatherCondition[];
  visibility?: number;
  wind?: {
    speed: number;
  };
  dt: number;
}

interface WeatherDisplayProps {
  weather: WeatherData;
  venueTime: string;
  isOutdoor: boolean;
  className?: string;
  compact?: boolean;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({
  weather,
  venueTime,
  isOutdoor,
  className = '',
  compact = false
}) => {
  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <CloudRain className="w-4 h-4" />;
    }
    if (conditionLower.includes('cloud')) {
      return <Cloud className="w-4 h-4" />;
    }
    if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
      return <Sun className="w-4 h-4" />;
    }
    if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return <Umbrella className="w-4 h-4" />;
    }
    return <Cloud className="w-4 h-4" />;
  };

  // Determine weather suitability for outdoor activities
  const isWeatherSuitable = () => {
    if (!isOutdoor) return true; // Indoor venues are always suitable
    
    const temp = weather.main.temp;
    const condition = weather.weather[0].main.toLowerCase();
    
    const badConditions = ['rain', 'thunderstorm', 'snow', 'drizzle'];
    const isBadWeather = badConditions.some(bad => condition.includes(bad));
    const isTooHot = temp > 30;
    const isTooCold = temp < 5;
    
    return !isBadWeather && !isTooHot && !isTooCold;
  };

  const suitable = isWeatherSuitable();
  const mainWeather = weather.weather[0];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${className} ${
        isOutdoor 
          ? suitable 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}>
        {getWeatherIcon(mainWeather.main)}
        <span className="font-medium">{Math.round(weather.main.temp)}°C</span>
        {isOutdoor && !suitable && (
          <span className="text-xs opacity-75">⚠️</span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-3 border shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getWeatherIcon(mainWeather.main)}
          <div>
            <div className="font-medium text-sm text-gray-900">
              {venueTime}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {mainWeather.description}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {Math.round(weather.main.temp)}°C
          </div>
          <div className="text-xs text-gray-500">
            Feels {Math.round(weather.main.feels_like)}°C
          </div>
        </div>
      </div>

      {isOutdoor && (
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
          suitable 
            ? 'bg-green-50 text-green-700' 
            : 'bg-amber-50 text-amber-700'
        }`}>
          {suitable ? (
            <>
              <Sun className="w-3 h-3" />
              <span>Great for outdoor activities</span>
            </>
          ) : (
            <>
              <Umbrella className="w-3 h-3" />
              <span>Consider indoor alternatives</span>
            </>
          )}
        </div>
      )}

      {weather.main.humidity && (
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{weather.main.humidity}% humidity</span>
          </div>
          {weather.wind && (
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              <span>{Math.round(weather.wind.speed * 3.6)} km/h</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherDisplay;