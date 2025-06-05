import React from 'react';
import { Calendar, Hotel } from 'lucide-react';
import { cn } from '../lib/utils';

interface TripDurationSelectorProps {
  value: number;
  onChange: (days: number) => void;
  maxDays?: number;
}

export function TripDurationSelector({ 
  value, 
  onChange, 
  maxDays = 7 
}: TripDurationSelectorProps) {
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar className="w-4 h-4" />
        Trip Duration
      </label>
      
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            className={cn(
              "relative p-3 rounded-lg text-center transition-all duration-200",
              "border-2 hover:scale-105",
              value === day
                ? "border-primary bg-primary text-white shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <div className="text-lg font-bold">{day}</div>
            <div className="text-xs opacity-75">
              {day === 1 ? 'day' : 'days'}
            </div>
            {day > 1 && (
              <Hotel className="absolute top-1 right-1 w-3 h-3 opacity-50" />
            )}
          </button>
        ))}
      </div>
      
      {value > 1 && (
        <p className="text-xs text-gray-600 flex items-center gap-1">
          <Hotel className="w-3 h-3" />
          Multi-day trips include accommodation suggestions
        </p>
      )}
    </div>
  );
}