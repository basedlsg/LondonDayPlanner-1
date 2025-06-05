import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Share, DollarSign, Wifi } from 'lucide-react';
import { exportToCalendar } from '../lib/calendar';
import { useCity } from '../hooks/useCity';
import { Link as RouterLink } from 'react-router-dom';
import { BudgetTracker } from '../components/BudgetTracker';
import { ShareModal } from '../components/ShareModal';
import { useItineraryUpdates } from '../hooks/useRealtimeUpdates';
import { Badge } from '@/components/ui/badge';

// Interface for a venue/place in the itinerary
interface Venue {
  placeId?: string;
  name: string;
  time: string;
  address: string;
  rating?: number;
  categories?: string[];
  priceLevel?: number;
  duration?: number;
}

// Interface for travel information between venues
interface TravelInfo {
  duration: string;
  destination: string;
}

// Interface for the complete itinerary data
interface ItineraryData {
  id: number;
  query: string;
  places: Venue[];
  travelTimes: TravelInfo[];
  created_at: string;
  planDate?: string;
  title?: string;
  city?: string;
  cityName?: string;
  timezone?: string;
}

const ItineraryPage = () => {
  const { id } = useParams<{ id: string }>();
  const { currentCity, isLoading: isCityContextLoading, switchCity } = useCity();
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(100);
  
  // Real-time updates
  const { lastUpdate, connected } = useItineraryUpdates(id ? parseInt(id) : undefined);
  
  // Fetch the itinerary data
  const { data: itinerary, isLoading, error, refetch } = useQuery<ItineraryData>({
    queryKey: [`itinerary`, id],
    queryFn: async () => {
      const response = await fetch(`/api/itinerary/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch itinerary');
      }
      return response.json();
    },
    enabled: !!id,
  });
  
  // Refetch when real-time update received
  useEffect(() => {
    if (lastUpdate?.itineraryId === parseInt(id || '0')) {
      refetch();
    }
  }, [lastUpdate, id, refetch]);

  // Effect to switch city context if itinerary data has a different city
  useEffect(() => {
    if (itinerary?.city && currentCity?.slug !== itinerary.city) {
      console.log(`Itinerary city (${itinerary.cityName}) differs from context city (${currentCity?.name}). Displaying itinerary city.`);
    }
  }, [itinerary, currentCity, switchCity]);
  
  const displayCityName = itinerary?.cityName || currentCity?.name || 'Selected City';
  const itineraryTitle = itinerary?.title || `Itinerary #${id}`;

  // Format the time string for display
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return timeString; // Return the original string if parsing fails
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Unknown date'; // Fallback
    }
  };

  // Handle exporting the itinerary to calendar
  const handleExport = () => {
    if (itinerary?.places) {
      exportToCalendar(itinerary.places);
    }
  };

  // Handle sharing the itinerary
  const handleShare = () => {
    setShowShareModal(true);
  };
  
  // Prepare venues for budget tracker
  const venuesForBudget = itinerary?.places?.map(place => ({
    placeId: place.placeId || '',
    name: place.name,
    priceLevel: place.priceLevel,
    category: place.categories?.[0] || 'general'
  })) || [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {isLoading ? <Skeleton className="h-9 w-64" /> : `${itineraryTitle} in ${displayCityName}`}
          </h1>
          {(itinerary || currentCity) && (
            <p className="text-muted-foreground mt-1">
              {formatDate(itinerary?.planDate || itinerary?.created_at || new Date().toISOString())}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Live
            </Badge>
          )}
          <Button onClick={handleExport} disabled={isLoading || !itinerary}>
            Export to Calendar
          </Button>
          <Button variant="outline" onClick={handleShare} disabled={isLoading || !itinerary}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <RouterLink to={`/${currentCity?.slug || 'nyc'}/plan`}>
            <Button variant="secondary">New Plan</Button>
          </RouterLink>
        </div>
      </div>

      {isLoading || isCityContextLoading ? (
        // Loading state
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        </div>
      ) : error ? (
        // Error state
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <h3 className="text-xl font-semibold text-destructive mb-2">Failed to load itinerary</h3>
              <p className="text-muted-foreground">Error: {error.message}</p>
              <RouterLink to={`/${currentCity?.slug || 'nyc'}/plan`}>
                <Button className="mt-4">Return to Planner</Button>
              </RouterLink>
            </div>
          </CardContent>
        </Card>
      ) : itinerary ? (
        // Loaded state with data
        <div className="space-y-6">
          {/* Query Card */}
          <Card>
            <CardHeader>
              <CardTitle>Original Request for {displayCityName}</CardTitle>
              <CardDescription>Your request for planning this day.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="italic">"{itinerary.query}"</p>
            </CardContent>
          </Card>

          {/* Two column layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main itinerary column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Itinerary Timeline Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Day in {displayCityName}</CardTitle>
                  <CardDescription>A personalized itinerary for your perfect day.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {itinerary.places && itinerary.places.map((place, index) => (
                      <div key={index} className="relative pl-6 pb-8 border-l border-muted last:border-l-transparent">
                        {/* Time indicator dot */}
                        <div className="absolute top-0 left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-primary"></div>
                        
                        <div className="mb-1 font-medium">{formatTime(place.time)}</div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-lg">{place.name}</div>
                          {place.priceLevel !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {'$'.repeat(place.priceLevel || 1)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-sm mb-2">{place.address}</div>
                        
                        {/* Display categories if available */}
                        {place.categories && place.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {place.categories.map((category, idx) => (
                              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-md">
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Show travel info if not the last place */}
                        {index < (itinerary.places.length - 1) && itinerary.travelTimes && itinerary.travelTimes[index] && (
                          <div className="mt-3 text-sm text-muted-foreground italic">
                            <span className="font-medium">Next:</span> {itinerary.travelTimes[index].duration} travel to {itinerary.travelTimes[index].destination}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar with budget tracker */}
            <div className="space-y-6">
              <BudgetTracker
                venues={venuesForBudget}
                onBudgetChange={setSelectedBudget}
                currency={currentCity?.slug === 'london' ? '£' : '$'}
                citySlug={itinerary.city || currentCity?.slug}
              />
            </div>
          </div>
        </div>
      ) : (
        // Empty state (should never happen if isLoading is false and there's no error)
        <div className="text-center py-10">
          <p>No itinerary data available.</p>
          <RouterLink to={`/${currentCity?.slug || 'nyc'}/plan`}>
            <Button className="mt-4">Return to Planner</Button>
          </RouterLink>
        </div>
      )}
      
      {/* Share Modal */}
      {itinerary && showShareModal && (
        <ShareModal
          itinerary={{
            id: parseInt(id || '0'),
            title: itinerary.title,
            venues: itinerary.places || [],
            date: itinerary.planDate || new Date().toISOString(),
            shareableUrl: window.location.href
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ItineraryPage;