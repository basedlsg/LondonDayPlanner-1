import React from 'react';
import { useCity } from '../hooks/useCity'; // Adjust path if needed

export function CitySelector() {
  const { currentCity, availableCities, switchCity, isLoading, error } = useCity();

  const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCitySlug = event.target.value;
    if (newCitySlug) {
      switchCity(newCitySlug);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading cities...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Error: {error}</div>;
  }

  if (!availableCities || availableCities.length === 0) {
    return <div className="text-sm text-gray-500">No cities available.</div>;
  }

  return (
    <div className="city-selector p-2 bg-gray-100 rounded-md">
      {currentCity ? (
        <span className="text-sm font-medium text-gray-700 mr-2">
          Current City: <strong className="text-indigo-600">{currentCity.name}</strong>
        </span>
      ) : (
        <span className="text-sm text-gray-500 mr-2">Select a city:</span>
      )}
      <select 
        value={currentCity?.slug || ''} 
        onChange={handleCityChange}
        className="text-sm p-1 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        disabled={availableCities.length <= 1}
      >
        <option value="" disabled={!!currentCity}>-- Select City --</option>
        {availableCities.map(city => (
          <option key={city.slug} value={city.slug}>
            {city.name} {/* TODO: Add flag or other branding here */}
          </option>
        ))}
      </select>
    </div>
  );
} 