import React, { useEffect, useState } from 'react';
import { format, formatInTimeZone } from 'date-fns-tz';
import { ItineraryLoading } from './LoadingSpinner';
import WeatherDisplay from './WeatherDisplay';
import { ShareModal } from './ShareModal';
import { Share2, Save } from 'lucide-react';
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
  const { toast } = useToast();

  // Add debug logging to track the data flow
  useEffect(() => {
    console.log("ItineraryScreen received venues:", venues);
    console.log("ItineraryScreen received travelInfo:", travelInfo);
  }, [venues, travelInfo]);

  const hasVenues = venues && Array.isArray(venues) && venues.length > 0;
  const hasTravelInfo = travelInfo && Array.isArray(travelInfo);

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


        {/* Venues Display - Enhanced Mobile-first Layout */}
        <div className={isSingleVenue ? "space-y-3 sm:space-y-4" : "space-y-4 sm:space-y-6"}>
          {venues.map((venue, index) => (
            <React.Fragment key={`${venue.name}-${index}`}>
              <div className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-100 venue-card transition-all duration-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${isSingleVenue ? 'border-blue-200 shadow-lg' : ''} ${isTimeline ? 'relative overflow-hidden' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                
                {/* Timeline step indicator for mobile */}
                {isTimeline && venues.length > 1 && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                )}
                
                {/* Single venue mode - enhanced display */}
                {isSingleVenue && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⭐</span>
                    <span className="text-sm font-medium text-blue-600">Perfect Match</span>
                    {venue.rating && <span className="text-sm text-gray-500">• {venue.rating} ★</span>}
                  </div>
                )}
                
                {/* Timeline mode - enhanced mobile step indicator */}
                {isTimeline && venues.length > 1 && (
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-sm">
                        {index + 1}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-blue-600">Step {index + 1}</span>
                    </div>
                    {/* Mobile time indicator */}
                    <div className="ml-auto flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                      <span>⏰</span>
                      <span className="font-medium">{venue.time}</span>
                    </div>
                  </div>
                )}
                
                {/* Venue name with mobile-optimized sizing */}
                <div className="mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-bold venue-name leading-tight" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: 'normal', fontSize: 'clamp(1.125rem, 4vw, 1.375rem)' }}>
                    {venue.name}
                  </h2>
                  
                  {/* Mobile-first time display for non-timeline mode */}
                  {!isTimeline && (
                    <p className="text-base sm:text-lg font-semibold venue-time mt-1 text-blue-600" style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(1rem, 3vw, 1.125rem)' }}>
                      {venue.time}
                    </p>
                  )}
                </div>
                
                {/* Compact mobile info section */}
                <div className="space-y-2 mb-3 sm:mb-4">
                  {/* Weather display for mobile - more compact */}
                  {venue.weather && venue.isOutdoor && (
                    <div className="flex items-center gap-2">
                      <WeatherDisplay 
                        weather={venue.weather}
                        venueTime={venue.time}
                        isOutdoor={venue.isOutdoor}
                        compact={true}
                      />
                    </div>
                  )}
                  
                  {/* Address with better mobile formatting */}
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 text-xs sm:text-sm mt-0.5 flex-shrink-0">📍</span>
                    <p className="text-gray-600 text-sm sm:text-base venue-address line-clamp-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {venue.address}
                    </p>
                  </div>
                  
                  {/* Enhanced description for single venue */}
                  {isSingleVenue && (venue as any).description && (
                    <div className="flex items-start gap-2 mt-2">
                      <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">💭</span>
                      <p className="text-gray-600 text-sm italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {(venue as any).description}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Mobile-optimized category tags */}
                {venue.categories && Array.isArray(venue.categories) && venue.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {venue.categories.slice(0, 4).map((category, catIndex) => (
                      <span 
                        key={`${category}-${catIndex}`} 
                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs venue-tag transition-all duration-200 hover:scale-105"
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
                    {venue.categories.length > 4 && (
                      <span className="px-2 py-1 text-xs text-gray-500 font-medium">
                        +{venue.categories.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Travel Info Display - Mobile-first timeline connector */}
              {index < venues.length - 1 && hasTravelInfo && travelInfo[index] && (
                <div className="relative flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 mt-4 mb-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl shadow-sm border border-gray-100 mx-2">
                  {/* Timeline connector line */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-blue-400 rounded-full"></div>
                  
                  {/* Travel icon */}
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm sm:text-base">🚶</span>
                  </div>
                  
                  {/* Travel details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-medium text-gray-800">
                        {travelInfo[index].duration} min to
                      </span>
                      <span className="text-xs sm:text-sm text-blue-600 font-medium">
                        Step {index + 2}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                      {travelInfo[index].destination || venues[index + 1]?.name}
                    </p>
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
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