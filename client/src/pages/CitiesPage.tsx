import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export function CitiesPage() {
  const { data: cities, isLoading, error } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await fetch('/api/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
  });

  if (isLoading) return <div className="p-8">Loading cities...</div>;
  if (error) return <div className="p-8">Error loading cities: {error.message}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Available Cities</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(cities) && cities.map((city: any) => (
          <Link 
            key={city.slug} 
            to={`/${city.slug}`} 
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">{city.name}</h2>
            <p className="mt-2 text-gray-600">Plan your perfect day in {city.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
} 