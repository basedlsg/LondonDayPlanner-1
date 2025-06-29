import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { usePlanMutation } from '../hooks/usePlanMutation';
import { useNavigate, useParams } from 'react-router-dom';
import { useCity } from '../hooks/useCity';
import { LoadingSpinner } from './LoadingSpinner';
import WeatherPreferences from './WeatherPreferences';
import { TripDurationSelector } from './TripDurationSelector';
import { useToast } from '../hooks/use-toast';

interface InputScreenProps {
  onSubmit?: (formData: { date: string; time: string; plans: string }) => void;
  isLoading?: boolean;
}

const InputScreen: React.FC<InputScreenProps> = ({ onSubmit, isLoading }) => {
  const { city: citySlugFromParams } = useParams<{ city?: string }>();
  const navigate = useNavigate();
  const mutation = usePlanMutation();
  const { currentCity, isLoading: isCityContextLoading } = useCity();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [weatherPreferences, setWeatherPreferences] = useState({
    weatherAware: true,
    preferIndoor: false
  });
  const [tripDuration, setTripDuration] = useState(1);

  // Default date and time for form inputs
  const defaultDate = new Date().toISOString().split('T')[0];
  const defaultTime = "12:00";
  
  // Combine all loading states
  const showLoading = isLoading || mutation.isPending || isProcessing || isCityContextLoading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const query = formData.get('plans') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    
    if (!query || !query.trim()) {
      toast({
        variant: "destructive",
        title: "Plans Required",
        description: "Please enter your plans to generate an itinerary.",
      });
      return;
    }

    // If onSubmit prop is provided, use it
    if (onSubmit) {
      onSubmit({ date, time, plans: query });
      return;
    }

    // Otherwise, use the original behavior with navigation
    const cityForAPI = citySlugFromParams || currentCity?.slug || 'nyc';

    try {
      const result = await mutation.mutateAsync({
        query,
        date,
        startTime: time,
        city: cityForAPI,
        tripDuration
      });
      
      if (result && result.id) { // Check result and result.id
        navigate(`/itinerary/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to create plan (handleSubmit):', error);
      // Error is also handled by usePlanMutation's onError for toast notification
    }
  };

  // Determine city name to display, fallback if context is loading or city not found
  const displayCityName = isCityContextLoading ? 'Loading city...' : currentCity?.name || citySlugFromParams || 'Selected City';

  return (
    <div className="bg-white flex flex-col items-center min-h-screen w-full font-sans">
      {/* Show loading overlay when processing */}
      {showLoading && (
        <LoadingSpinner 
          fullScreen 
          text="Creating your perfect itinerary..." 
        />
      )}
      
      <div className="w-full max-w-md px-4 py-4 sm:py-6 flex flex-col items-center">
        <div className="mb-6 sm:mb-8 mt-2 sm:mt-4">
          <Logo className="w-full max-w-[250px] sm:max-w-none scale-110 sm:scale-125" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 text-center">
          Create a Plan for {displayCityName}
        </h2>

        <p className="mb-4 sm:mb-6 font-bold tagline-text text-center text-sm sm:text-base px-4 text-brand-blue">
          Enter your activities, locations and times below, we'll create a day plan for you.
        </p>

        <form onSubmit={handleSubmit} className="w-full relative">
          <div className="mb-4 sm:mb-6 bg-white rounded-2xl py-4 sm:py-6 px-4 sm:px-5 shadow-sm transition-all duration-200 hover:shadow-md border border-purple-200 min-h-[70px]">
            <label htmlFor="date" className="block mb-1 sm:mb-2 font-bold text-lg sm:text-xl text-[#1C1C1C]">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              defaultValue={defaultDate}
              className="w-full bg-transparent text-gray-700 focus:outline-none text-base sm:text-lg pl-2 sm:pl-3 py-1 sm:py-2"
              required
              disabled={showLoading}
            />
          </div>

          <div className="mb-4 sm:mb-6 bg-white rounded-2xl py-4 sm:py-6 px-4 sm:px-5 shadow-sm transition-all duration-200 hover:shadow-md border border-purple-200 min-h-[70px]">
            <label htmlFor="time" className="block mb-1 sm:mb-2 font-bold text-lg sm:text-xl text-[#1C1C1C]">Time</label>
            <input
              type="time"
              id="time"
              name="time"
              defaultValue={defaultTime}
              className="w-full bg-transparent text-gray-700 focus:outline-none text-base sm:text-lg pl-2 sm:pl-3 py-1 sm:py-2"
              required
              disabled={showLoading}
            />
          </div>

          {/* Trip Duration Selector - Hidden for now */}
          {/* <div className="mb-6 sm:mb-8">
            <TripDurationSelector
              value={tripDuration}
              onChange={setTripDuration}
            />
          </div> */}

          <div className="mb-6 sm:mb-8 bg-white rounded-2xl py-4 sm:py-6 px-4 sm:px-5 shadow-sm transition-all duration-200 hover:shadow-md border border-purple-200">
            <label htmlFor="plans" className="block mb-1 sm:mb-2 font-bold text-lg sm:text-xl text-[#1C1C1C]">Your Plans</label>
            <textarea
              id="plans"
              name="plans"
              className="w-full bg-transparent text-gray-700 focus:outline-none text-base sm:text-lg min-h-[100px] sm:min-h-[135px] p-2 sm:p-3 resize-none"
              placeholder="e.g. 12pm lunch in Mayfair, then grab a coffee and have a walk"
              required
              disabled={showLoading}
            />
          </div>

          {/* Weather Preferences */}
          <div className="mb-6 sm:mb-8">
            <WeatherPreferences
              preferences={weatherPreferences}
              onPreferencesChange={setWeatherPreferences}
              className="transition-all duration-200 hover:shadow-md"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 sm:py-4 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 text-white font-semibold text-sm sm:text-base bg-brand-blue disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={showLoading}
          >
            {showLoading ? (
              <span>Creating Plan...</span>
            ) : (
              'Create Plan'
            )}
          </button>
        </form>

        {mutation.isError && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md w-full">
            <p className="font-semibold">Error Creating Plan:</p>
            <p>{mutation.error?.message || 'An unexpected error occurred. Please try again.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InputScreen; 