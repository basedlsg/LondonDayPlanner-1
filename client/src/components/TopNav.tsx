import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { CitySelector } from './CitySelector';

export function TopNav() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Logo />
            <div className="ml-10 flex items-baseline space-x-4">
              <Link to="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link to="/cities" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Cities
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CitySelector />
          </div>
        </div>
      </div>
    </nav>
  );
}