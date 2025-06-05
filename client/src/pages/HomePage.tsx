import React, { useState, useEffect } from 'react';
import InputScreen from '../components/InputScreen';
import ItineraryScreen from '../components/ItineraryScreen';
import { usePlanMutation } from '../hooks/usePlanMutation';
import { exportToCalendar } from '../lib/calendar';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useCity } from '../hooks/useCity';

interface PlanFormData {
  date: string;
  time: string;
  plans: string;
  tripDuration?: number;
}

interface Venue {
  name: string;
  time: string;
  address: string;
  rating: number;
  categories: string[];
}

interface TravelInfo {
  duration: string;
  destination: string;
}

interface ItineraryData {
  venues: Venue[];
  travelInfo: TravelInfo[];
  shareableUrl?: string;
  title?: string;
  planDate?: string;
  // Multi-day trip support
  isMultiDay?: boolean;
  tripId?: number;
  tripDuration?: number;
}

export default function HomePage() {
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null);
  const planMutation = usePlanMutation();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { currentCity } = useCity();

  // Log state changes to debug
  useEffect(() => {
    console.log("HomePage itineraryData state:", itineraryData);
  }, [itineraryData]);

  const handlePlanSubmit = async (formData: PlanFormData) => {
    try {
      console.log("Submitting plan:", formData);
      
      // Simple approach: include time in the query if not already mentioned
      let enhancedQuery = formData.plans;
      const hasTimeInQuery = /\b\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)\b|\b(morning|afternoon|evening|night|noon)\b/.test(formData.plans);
      
      if (!hasTimeInQuery && formData.time) {
        // Convert 24h to 12h format for natural language
        const [hours, minutes] = formData.time.split(':');
        const hour24 = parseInt(hours);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        const timeStr = `${hour12}:${minutes} ${ampm}`;
        
        enhancedQuery = `${formData.plans} at ${timeStr}`;
      }
      
      console.log("Enhanced query:", enhancedQuery);
      
      // Transform the formData to match what usePlanMutation expects
      const result = await planMutation.mutateAsync({
        query: enhancedQuery,  // Use enhanced query with time
        date: formData.date,
        startTime: formData.time,
        city: currentCity?.slug || 'nyc',  // Use current city from context
        tripDuration: formData.tripDuration || 1
      });
      console.log("Plan creation result:", result);
      console.log("Result venues:", result?.venues);
      console.log("Result travelInfo:", result?.travelInfo);
      console.log("Result places (if any):", result?.places);
      console.log("Result travelTimes (if any):", result?.travelTimes);
      setItineraryData(result);

      // Smooth scroll to itinerary section after a brief delay
      setTimeout(() => {
        document.getElementById('itinerary-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      console.error('Error creating plan:', error);
      // Error handling is managed by the mutation
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <div className="bg-white text-foreground min-h-screen">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center mb-6">
            {/* Removed "Plan Your Perfect Day" header */}
            {user && (
              <div className="text-sm text-muted-foreground">
                Welcome back, {user.name?.split(' ')[0] || 'traveler'}
              </div>
            )}
          </div>

          {/* Input Section */}
          <section className="py-4">
            <InputScreen 
              onSubmit={handlePlanSubmit}
              isLoading={planMutation.isPending}
            />
          </section>

          {/* Itinerary Section - always render but conditionally show content */}
          <section id="itinerary-section" className="py-4">
            <ItineraryScreen
              venues={itineraryData?.venues || []}
              travelInfo={itineraryData?.travelInfo || []}
              onExport={() => {
                exportToCalendar(itineraryData?.venues || []);
              }}
              isLoading={planMutation.isPending}
              title={itineraryData?.title}
              cityName={currentCity?.name || 'NYC'}
              timezone={currentCity?.timezone || 'America/New_York'}
              planDate={itineraryData?.planDate}
              shareableUrl={itineraryData?.shareableUrl}
              // Multi-day trip support
              isMultiDay={itineraryData?.isMultiDay}
              tripId={itineraryData?.tripId}
              tripDuration={itineraryData?.tripDuration}
              currentDay={1}
            />
          </section>
        </div>
      </div>
    </div>
  );
}