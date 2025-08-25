import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cities, City } from '@/data/cities';

interface CitySelectorProps {
  onCityChange: (city: City) => void;
}

export function CitySelector({ onCityChange }: CitySelectorProps) {
  const [selectedCity, setSelectedCity] = useState<City>(cities[0]);

  const handleCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      setSelectedCity(city);
      onCityChange(city);
    }
  };

  return (
    <Select onValueChange={handleCityChange} defaultValue={selectedCity.id}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a city" />
      </SelectTrigger>
      <SelectContent>
        {cities.map((city) => (
          <SelectItem key={city.id} value={city.id}>
            {city.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}