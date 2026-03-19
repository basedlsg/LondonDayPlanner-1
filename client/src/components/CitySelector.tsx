import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cities, City } from '@/data/cities';

interface CitySelectorProps {
  onCityChange: (city: City) => void;
}

export function CitySelector({ onCityChange }: CitySelectorProps) {
  const { t } = useTranslation();
  const [selectedCity, setSelectedCity] = useState<City>(cities[0]);

  const handleCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      setSelectedCity(city);
      onCityChange(city);
    }
  };

  // Get localized city name
  const getCityName = (city: City) => {
    const key = `cities.${city.id}`;
    const translated = t(key);
    // Fall back to city.name if translation key doesn't exist
    return translated === key ? city.name : translated;
  };

  return (
    <Select onValueChange={handleCityChange} defaultValue={selectedCity.id}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={t('input.selectCity')} />
      </SelectTrigger>
      <SelectContent>
        {cities.map((city) => (
          <SelectItem key={city.id} value={city.id}>
            {getCityName(city)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}