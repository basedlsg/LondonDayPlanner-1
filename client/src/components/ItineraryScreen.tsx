import React, { useEffect, useState } from 'react';
import { format, formatInTimeZone } from 'date-fns-tz';
import { ItineraryLoading } from './LoadingSpinner';
import WeatherDisplay from './WeatherDisplay';
import { ShareModal } from './ShareModal';
import { InteractiveMap } from './InteractiveMap';
import { Share2, Save, Map } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  dt: number;
  isOutdoor: boolean;
  suitable: boolean;
}

interface Venue {
  name: string;
  time: string; // Can be either displayTime (formatted) or ISO timestamp
  address: string;
  rating: number;
  categories: string[];
  weather?: WeatherData;
  isOutdoor?: boolean;
}

interface TravelInfo {
  duration: string;
  destination: string;
}

interface ItineraryScreenProps {
  venues: Venue[];
  travelInfo: TravelInfo[];
  onExport: () => void;
  isLoading?: boolean;
  title?: string;
  cityName?: string;
  timezone?: string;
  planDate?: string;
  shareableUrl?: string;
  // Multi-day trip support
  isMultiDay?: boolean;
  tripId?: number;
  tripDuration?: number;
  currentDay?: number;
  allDays?: Array<{
    dayNumber: number;
    date: string;
    itineraryId: number;
    title: string;
  }>;
}

const ItineraryScreen: React.FC<ItineraryScreenProps> = ({
  venues,
  travelInfo,
  onExport,
  isLoading = false,
  title,
  cityName,
  timezone,
  planDate,
  shareableUrl,
  // Multi-day trip support
  isMultiDay = false,
  tripId,
  tripDuration = 1,
  currentDay = 1,
  allDays
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Add debug logging to track the data flow
  useEffect(() => {
    console.log("ItineraryScreen received venues:", venues);
    console.log("ItineraryScreen received travelInfo:", travelInfo);
  }, [venues, travelInfo]);

  const hasVenues = venues && Array.isArray(venues) && venues.length > 0;
  const hasTravelInfo = travelInfo && Array.isArray(travelInfo);

  const handleSaveItinerary = async () => {
    if (!isAuthenticated || !hasVenues) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/itineraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title || `${cityName} Itinerary`,
          venues,
          travelInfo,
          planDate,
          cityName,
          timezone,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Itinerary saved!',
          description: 'You can view it in your saved itineraries.',
        });
      } else {
        throw new Error('Failed to save itinerary');
      }
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast({
        title: 'Error',
        description: 'Failed to save itinerary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return <ItineraryLoading />;
  }

  // Don't render anything if there are no venues
  if (!hasVenues) {
    return null;
  }

  return (
    <div className="bg-white flex flex-col items-center w-full min-h-screen">
      <div className="w-full max-w-md px-4 py-4 sm:py-6 pb-20 sm:pb-12">
        {/* Header - only shown when we have venues */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 itinerary-title" style={{ 
            fontFamily: "'Rozha One', serif", /* Keep this font for the title to match the app's branding */
            color: 'var(--color-text-black)',
            fontSize: 'clamp(1.75rem, 5vw, 2rem)' // Better mobile font scaling
          }}>
            {title || `Your ${cityName || 'NYC'} Itinerary`}
          </h1>
          
          {/* Multi-day trip navigation - Hidden for now */}
          {/* {isMultiDay && tripDuration && tripDuration > 1 && (
            <div className="mb-6">
              <div className="flex justify-center items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">{tripDuration}-Day Trip</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: tripDuration }, (_, i) => i + 1).map(dayNum => {
                  const dayDate = new Date(planDate || new Date());
                  dayDate.setDate(dayDate.getDate() + dayNum - 1);
                  
                  return (
                    <button
                      key={dayNum}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentDay === dayNum || (!currentDay && dayNum === 1)
                          ? 'bg-[#17B9E6] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => {
                        // TODO: Load itinerary for selected day
                        console.log(`Switch to day ${dayNum}`);
                      }}
                    >
                      Day {dayNum}
                      <div className="text-xs opacity-75 mt-0.5">
                        {format(dayDate, 'MMM d')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )} */}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowMap(!showMap)}
              className="w-full py-3 sm:py-4 rounded-2xl text-white export-button transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ 
                background: showMap ? '#6366f1' : '#8b5cf6',
                fontWeight: 600,
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <Map className="w-4 h-4 sm:w-5 sm:h-5" />
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
            
            <div className="flex gap-3">
              {isAuthenticated && (
                <button
                  onClick={handleSaveItinerary}
                  disabled={isSaving}
                  className="flex-1 py-3 sm:py-4 rounded-2xl text-white export-button transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    background: '#17B9E6',
                    fontWeight: 600,
                    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex-1 py-3 sm:py-4 rounded-2xl text-white export-button transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ 
                  background: '#17B9E6',
                  fontWeight: 600,
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Share & Export
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Map */}
        {showMap && (
          <div className="mb-8">
            <InteractiveMap 
              venues={venues.map(v => ({
                ...v,
                location: v.location || (v.address ? undefined : undefined) // We'll need to geocode addresses
              }))} 
              city={cityName?.toLowerCase()} 
            />
          </div>
        )}

        {/* Venues List */}
        <div className="space-y-6 sm:space-y-8">
          {venues.map((venue, index) => (
            <React.Fragment key={`${venue.name}-${index}`}>
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 venue-card transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]" style={{ fontFamily: "'Inter', sans-serif" }}>
                <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 venue-name" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: 'normal', fontSize: 'clamp(1.125rem, 3vw, 1.25rem)' }}>
                  {venue.name}
                </h2>
                
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
                  <div className="flex items-center justify-between">
                    <p className="text-base sm:text-lg font-semibold venue-time" style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' }}>
                      {/* Display time with ET (Eastern Time) suffix */}
                      {venue.time.includes('ET') ? venue.time : `${venue.time} ET`}
                    </p>
                    {venue.weather && venue.isOutdoor && (
                      <WeatherDisplay 
                        weather={venue.weather}
                        venueTime={venue.time}
                        isOutdoor={venue.isOutdoor}
                        compact={true}
                      />
                    )}
                  </div>
                  <p className="text-gray-500 text-sm sm:text-base venue-address line-clamp-2" style={{ fontFamily: "'Inter', sans-serif", textTransform: 'none' }}>{venue.address}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {venue.categories && Array.isArray(venue.categories) && venue.categories.map((category, catIndex) => (
                    <span 
                      key={`${category}-${catIndex}`} 
                      className="px-3 py-1.5 rounded-full text-xs sm:text-sm venue-tag transition-all duration-200 hover:scale-105"
                      style={{
                        background: 'rgba(23, 185, 230, 0.1)',
                        color: 'var(--color-text-black)',
                        border: '1px solid rgba(23, 185, 230, 0.2)',
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      {category.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              
              {index < venues.length - 1 && hasTravelInfo && travelInfo[index] && (
                <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 mt-4 mb-4 bg-gray-50 rounded-xl text-gray-600 text-sm sm:text-base shadow-sm border border-gray-100 travel-info transition-all duration-200 hover:bg-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{color: '#17B9E6'}}
                  >
                    <path
                      d="M8 0C5.87827 0 3.84344 0.842855 2.34315 2.34315C0.842855 3.84344 0 5.87827 0 8C0 10.1217 0.842855 12.1566 2.34315 13.6569C3.84344 15.1571 5.87827 16 8 16C10.1217 16 12.1566 15.1571 13.6569 13.6569C15.1571 12.1566 16 10.1217 16 8C16 5.87827 15.1571 3.84344 13.6569 2.34315C12.1566 0.842855 10.1217 0 8 0ZM8 14.4C6.25044 14.4 4.57275 13.7257 3.32294 12.5259C2.07312 11.326 1.39819 9.64784 1.39819 7.89828C1.39819 6.14872 2.07312 4.47103 3.32294 3.27121C4.57275 2.0714 6.25044 1.39647 8 1.39647C9.74956 1.39647 11.4272 2.0714 12.6771 3.27121C13.9269 4.47103 14.6018 6.14872 14.6018 7.89828C14.6018 9.64784 13.9269 11.326 12.6771 12.5259C11.4272 13.7257 9.74956 14.4 8 14.4Z"
                      fill="currentColor"
                    />
                    <path
                      d="M8 3.2C7.68174 3.2 7.37652 3.32643 7.15147 3.55147C6.92643 3.77652 6.8 4.08174 6.8 4.4V7.6H4.4C4.08174 7.6 3.77652 7.72643 3.55147 7.95147C3.32643 8.17652 3.2 8.48174 3.2 8.8C3.2 9.11826 3.32643 9.42348 3.55147 9.64853C3.77652 9.87357 4.08174 10 4.4 10H8C8.31826 10 8.62348 9.87357 8.84853 9.64853C9.07357 9.42348 9.2 9.11826 9.2 8.8V4.4C9.2 4.08174 9.07357 3.77652 8.84853 3.55147C8.62348 3.32643 8.31826 3.2 8 3.2Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="whitespace-normal overflow-visible travel-duration flex-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
                    {travelInfo[index].duration} minutes to {travelInfo[index].destination}
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        venues={venues}
        travelInfo={travelInfo}
        title={title}
        cityName={cityName || 'NYC'}
        timezone={timezone || 'America/New_York'}
        planDate={planDate}
        itineraryUrl={shareableUrl}
      />
    </div>
  );
};

export default ItineraryScreen;