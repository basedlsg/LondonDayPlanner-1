import React, { useEffect, useState } from 'react';
import { format, formatInTimeZone } from 'date-fns-tz';
import { ItineraryLoading } from './LoadingSpinner';
import WeatherDisplay from './WeatherDisplay';
import { ShareModal } from './ShareModal';
import { Share2, Save } from 'lucide-react';
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
  // Smart display modes
  isSingleVenue?: boolean;
  isTimeline?: boolean;
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
  // Smart display modes
  isSingleVenue = false,
  isTimeline = false,
  // Multi-day trip support
  isMultiDay = false,
  tripId,
  tripDuration = 1,
  currentDay = 1,
  allDays
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
            {isSingleVenue ? title : (title || `Your ${cityName || 'NYC'} Itinerary`)}
          </h1>
          
          {/* Display mode indicator */}
          {(isSingleVenue || isTimeline) && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                {isSingleVenue ? '📍 Perfect Match' : '📅 Timeline'}
              </span>
            </div>
          )}
          
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


        {/* Venues Display - Smart Layout */}
        <div className={isSingleVenue ? "space-y-4" : "space-y-6 sm:space-y-8"}>
          {venues.map((venue, index) => (
            <React.Fragment key={`${venue.name}-${index}`}>
              <div className={`bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 venue-card transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${isSingleVenue ? 'border-blue-200 shadow-lg' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                
                {/* Single venue mode - enhanced display */}
                {isSingleVenue && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⭐</span>
                    <span className="text-sm font-medium text-blue-600">Perfect Match</span>
                    {venue.rating && <span className="text-sm text-gray-500">• {venue.rating} ★</span>}
                  </div>
                )}
                
                {/* Timeline mode - show step number */}
                {isTimeline && venues.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-blue-600">Step {index + 1}</span>
                  </div>
                )}
                
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
                  
                  {/* Enhanced description for single venue */}
                  {isSingleVenue && venue.description && (
                    <p className="text-gray-600 text-sm italic mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {venue.description}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {venue.categories && Array.isArray(venue.categories) && venue.categories.map((category, catIndex) => (
                    <span 
                      key={`${category}-${catIndex}`} 
                      className="px-3 py-1.5 rounded-full text-xs sm:text-sm venue-tag transition-all duration-200 hover:scale-105"
                      style={{
                        background: isSingleVenue ? 'rgba(59, 130, 246, 0.1)' : 'rgba(23, 185, 230, 0.1)',
                        color: 'var(--color-text-black)',
                        border: `1px solid ${isSingleVenue ? 'rgba(59, 130, 246, 0.2)' : 'rgba(23, 185, 230, 0.2)'}`,
                        fontFamily: "'Inter', sans-serif"
                      }}
                    >
                      {category.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
              
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