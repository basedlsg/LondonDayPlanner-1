import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatInTimeZone } from 'date-fns-tz';

interface PlanFormData {
  date: string;
  time: string;
  plans: string;
  weatherAware?: boolean;
  city?: string;
  timezone?: string;
}

export function usePlanMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: PlanFormData) => {
      // Map to API expected format if needed
      const apiData = {
        date: data.date,
        startTime: data.time,
        query: data.plans,
        weatherAware: data.weatherAware ?? true, // Default to true if not specified
        city: data.city || 'london'
      };

      // Use city-specific endpoint if city is provided
      const endpoint = data.city ? `/api/${data.city}/plan` : '/api/plan';
      const timezone = data.timezone || 'Europe/London';

      console.log("Sending API request:", apiData);
      const response = await apiRequest('POST', endpoint, apiData);
      const responseData = await response.json();
      console.log("API response:", responseData);
      
      // Transform API response to match the expected ItineraryData structure
      const venues = responseData.places.map((place: any) => {
        // Convert API response format to Venue format expected by the UI
        const venueDetails = place.details || {};
        
        // Parse and format the time with timezone awareness
        let formattedTime;
        if (place.displayTime) {
          // If displayTime is provided from the backend, use it directly
          formattedTime = place.displayTime;
        } else if (place.scheduledTime) {
          // Otherwise, format the ISO timestamp with appropriate timezone
          formattedTime = formatInTimeZone(
            new Date(place.scheduledTime),
            timezone,
            'h:mm a'
          );
        } else {
          // Fallback if no time information is available
          formattedTime = "Time not specified";
        }
        
        return {
          name: place.name,
          time: formattedTime,
          address: place.address,
          rating: place.rating || venueDetails.rating || 0,
          categories: place.categories || venueDetails.types || [],
          whyRecommended: place.whyRecommended,
          isOpenNow: place.isOpenNow
        };
      });
      
      // Process travel times into the format expected by the UI
      const travelInfo = responseData.travelTimes.map((time: any) => ({
        duration: time.duration,
        destination: time.to // Use 'to' field from server response as the destination
      }));
      
      return {
        venues,
        travelInfo
      };
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Your itinerary has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create your itinerary. Please try again.',
        variant: 'destructive',
      });
    }
  });
}