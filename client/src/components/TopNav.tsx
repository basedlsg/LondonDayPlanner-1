import React from 'react';
import { CitySelector } from './CitySelector';
import { City } from '@/data/cities';
import Logo from './Logo';

interface TopNavProps {
  onCityChange: (city: City) => void;
}

const TopNav = ({ onCityChange }: TopNavProps) => {
  return (
    <div className="border-none bg-white">
      <div className="flex h-14 items-center px-4 container mx-auto justify-between">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        
        <CitySelector onCityChange={onCityChange} />
      </div>
    </div>
  );
};

export default TopNav;