import React from 'react';
import { useCity } from '../hooks/useCity';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function CitySelector() {
  const { currentCity, availableCities, switchCity, isLoading, error } = useCity();

  const handleCityChange = (newCitySlug: string) => {
    if (newCitySlug) {
      switchCity(newCitySlug);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading cities...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  if (!availableCities || availableCities.length === 0) {
    return <div className="text-sm text-muted-foreground">No cities available.</div>;
  }

  return (
    <div className="city-selector p-4 bg-muted/50 rounded-lg">
      {currentCity ? (
        <span className="text-sm font-medium text-foreground mr-3">
          Current City: <strong className="text-primary">{currentCity.name}</strong>
        </span>
      ) : (
        <span className="text-sm text-muted-foreground mr-3">Select a city:</span>
      )}
      
      <Select 
        value={currentCity?.slug || ''} 
        onValueChange={handleCityChange}
        disabled={availableCities.length <= 1}
      >
        <SelectTrigger className="w-48 inline-flex">
          <SelectValue placeholder="Select a city" />
        </SelectTrigger>
        <SelectContent>
          {availableCities.map(city => (
            <SelectItem key={city.slug} value={city.slug}>
              {city.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 