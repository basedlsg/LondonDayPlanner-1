import React from 'react';
import { Cloud, Sun, Umbrella } from 'lucide-react';

interface WeatherPreferencesProps {
  preferences: {
    weatherAware: boolean;
    preferIndoor: boolean;
  };
  onPreferencesChange: (preferences: { weatherAware: boolean; preferIndoor: boolean }) => void;
  className?: string;
}

const WeatherPreferences: React.FC<WeatherPreferencesProps> = ({
  preferences,
  onPreferencesChange,
  className = ''
}) => {
  const handleWeatherAwareToggle = () => {
    onPreferencesChange({
      ...preferences,
      weatherAware: !preferences.weatherAware
    });
  };

  const handleIndoorPreferenceToggle = () => {
    onPreferencesChange({
      ...preferences,
      preferIndoor: !preferences.preferIndoor
    });
  };

  return (
    <div className={`bg-white rounded-lg p-4 border shadow-sm ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Cloud className="w-4 h-4" />
        Weather Preferences
      </h3>
      
      <div className="space-y-3">
        {/* Weather-aware planning toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Umbrella className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                Weather-aware planning
              </div>
              <div className="text-xs text-gray-500">
                Consider weather when suggesting venues
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleWeatherAwareToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.weatherAware 
                ? 'bg-blue-600' 
                : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${
                preferences.weatherAware ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Indoor preference toggle (only show if weather-aware is enabled) */}
        {preferences.weatherAware && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Prefer indoor venues
                </div>
                <div className="text-xs text-gray-500">
                  Prioritize indoor activities when weather is bad
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleIndoorPreferenceToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                preferences.preferIndoor 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${
                  preferences.preferIndoor ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {preferences.weatherAware && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <div className="text-xs text-blue-700">
            💡 Weather-aware planning will suggest indoor alternatives when outdoor conditions are unsuitable
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherPreferences;