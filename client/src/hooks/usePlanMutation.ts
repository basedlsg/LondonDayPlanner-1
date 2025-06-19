import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatInTimeZone } from 'date-fns-tz';
import { useErrorHandler } from './useErrorHandler';
import { generateSmartVenues, convertToVenueFormat } from '../lib/placesApi';
import { analyzeQuery, generateTimeSchedule } from '../lib/queryAnalyzer';
// Smart venue generation function
function generateQuerySpecificVenues(query: string, city: string, startTime: string) {
  const lowercaseQuery = query.toLowerCase();
  const timeHour = parseInt(startTime.split(':')[0] || '12');
  
  // Enhanced venue database with real places
  const venueDatabase = {
    nyc: {
      pizza: [
        { name: 'Joe\'s Pizza', address: '7 Carmine St, New York, NY 10014', area: 'Greenwich Village', type: 'pizzeria', rating: 4.5 },
        { name: 'Prince Street Pizza', address: '27 Prince St, New York, NY 10012', area: 'Nolita', type: 'pizzeria', rating: 4.7 },
        { name: 'Lucali', address: '575 Henry St, Brooklyn, NY 11231', area: 'Carroll Gardens', type: 'neapolitan pizza', rating: 4.6 }
      ],
      soho: [
        { name: 'Lombardi\'s Pizza', address: '32 Spring St, New York, NY 10012', area: 'Nolita', type: 'historic pizzeria', rating: 4.4 },
        { name: 'Parm', address: '248 Mulberry St, New York, NY 10012', area: 'Little Italy', type: 'italian sandwich shop', rating: 4.3 },
        { name: 'Rubirosa', address: '235 Mulberry St, New York, NY 10012', area: 'Little Italy', type: 'thin crust pizza', rating: 4.5 }
      ],
      flatbush: [
        { name: 'The Farm on Adderley', address: '1108 Cortelyou Rd, Brooklyn, NY 11218', area: 'Ditmas Park', type: 'farm-to-table', rating: 4.4 },
        { name: 'Café Madeline', address: '1603 Cortelyou Rd, Brooklyn, NY 11226', area: 'Ditmas Park', type: 'brunch cafe', rating: 4.2 },
        { name: 'Purple Yam', address: '1314 Cortelyou Rd, Brooklyn, NY 11226', area: 'Ditmas Park', type: 'filipino restaurant', rating: 4.3 }
      ],
      potato: [
        { name: 'The Smith', address: '956 2nd Ave, New York, NY 10022', area: 'Midtown East', type: 'american restaurant', rating: 4.2 },
        { name: 'Balthazar', address: '80 Spring St, New York, NY 10012', area: 'SoHo', type: 'french bistro', rating: 4.4 },
        { name: 'Clinton Hall', address: '90 Washington St, New York, NY 10006', area: 'Financial District', type: 'gastropub', rating: 4.1 }
      ]
    },
    london: {
      pizza: [
        { name: 'Franco Manca', address: '4 Market Row, London SW9 8LD', area: 'Brixton', type: 'sourdough pizza', rating: 4.3 },
        { name: 'Homeslice', address: '13 Neal\'s Yard, London WC2H 9DP', area: 'Covent Garden', type: 'wood-fired pizza', rating: 4.5 },
        { name: 'Pizza Pilgrims', address: '11 Dean St, London W1D 3RP', area: 'Soho', type: 'neapolitan pizza', rating: 4.4 }
      ],
      potato: [
        { name: 'Rules', address: '35 Maiden Ln, London WC2E 7LB', area: 'Covent Garden', type: 'historic restaurant', rating: 4.2 },
        { name: 'Dishoom', address: '12 Upper St Martin\'s Ln, London WC2H 9FB', area: 'Covent Garden', type: 'bombay cafe', rating: 4.6 },
        { name: 'The Ivy', address: '1-5 West St, London WC2H 9NQ', area: 'Covent Garden', type: 'british restaurant', rating: 4.1 }
      ]
    }
  };
  
  // Smart matching logic
  let selectedVenues = [];
  const cityVenues = venueDatabase[city as keyof typeof venueDatabase] || venueDatabase.nyc;
  
  // Check for specific matches
  for (const [keyword, venues] of Object.entries(cityVenues)) {
    if (lowercaseQuery.includes(keyword)) {
      selectedVenues = venues.slice(0, 3);
      break;
    }
  }
  
  // If no specific match, use a mix of venues
  if (selectedVenues.length === 0) {
    const allVenues = Object.values(cityVenues).flat();
    selectedVenues = allVenues.slice(0, 3);
  }
  
  // Convert to venue format with proper timing
  return selectedVenues.map((venue, index) => {
    const scheduledTime = index === 0 
      ? startTime 
      : `${Math.min(timeHour + 2 + index, 23)}:00 ${timeHour + 2 + index < 12 ? 'AM' : 'PM'}`;
    
    return {
      id: index + 1,
      name: venue.name,
      address: venue.address,
      time: scheduledTime,
      rating: venue.rating,
      categories: [venue.area, venue.type],
      description: `Perfect ${venue.type} for "${query}" - highly rated in ${venue.area}`,
      estimatedTime: index === 0 ? '1-2 hours' : '45-90 minutes',
      photos: [],
      website: '#',
      phoneNumber: '(555) 123-456' + (7 + index)
    };
  });
}

export const usePlanMutation = () => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async ({ query, city = 'nyc', date, startTime, tripDuration = 1 }: { 
      query: string; 
      city?: string;
      date?: string;
      startTime?: string;
      tripDuration?: number;
    }) => {
      // SMART QUERY ANALYSIS: Single venue vs Timeline
      console.log('🧠 Analyzing query intent:', query);
      const analysis = analyzeQuery(query);
      console.log('📊 Query analysis:', analysis);
      
      const cityName = city === 'nyc' ? 'New York City' : 
                      city === 'london' ? 'London' : 
                      city === 'boston' ? 'Boston' : 
                      city === 'austin' ? 'Austin' : city;
      
      if (analysis.isMultiActivity) {
        // TIMELINE MODE: Multiple activities with scheduling
        console.log('📅 Timeline mode: Processing multiple activities');
        console.log('🔍 Parsed activities:', analysis.activities);
        
        try {
          const scheduledActivities = generateTimeSchedule(analysis.activities, startTime || '12:00 PM');
          console.log('⏰ Scheduled activities:', scheduledActivities);
          const allVenues = [];
          
          // Get venues for each activity
          for (const activity of scheduledActivities) {
            console.log(`🔎 Processing activity: "${activity.activity}" at ${activity.time}`);
            try {
              const places = await generateSmartVenues(activity.activity, city, activity.time || '12:00 PM');
              if (places.length > 0) {
                // Take best venue for each activity
                allVenues.push({
                  place: places[0],
                  scheduledTime: activity.time || '12:00 PM',
                  activity: activity.activity
                });
              }
            } catch (error) {
              console.warn(`⚠️ Could not find venue for: ${activity.activity}`);
              // Use fallback venue
              const fallbackVenues = generateQuerySpecificVenues(activity.activity, city, activity.time || '12:00 PM');
              if (fallbackVenues.length > 0) {
                allVenues.push({
                  place: null,
                  venue: fallbackVenues[0],
                  scheduledTime: activity.time || '12:00 PM',
                  activity: activity.activity
                });
              }
            }
          }
          
          // Convert to venue format
          const venues = allVenues.map((item, index) => {
            if (item.place) {
              return convertToVenueFormat(item.place, index, item.scheduledTime);
            } else {
              return { ...item.venue, time: item.scheduledTime };
            }
          });
          
          console.log(`✅ Generated ${venues.length} venues for timeline:`, venues.map(v => v.name));
          
          return {
            title: `Perfect Day in ${cityName}`,
            id: Date.now(),
            city: city,
            query: query,
            planDate: date || new Date().toISOString().split('T')[0],
            startTime: startTime || '12:00 PM',
            venues: venues,
            travelInfo: venues.map((venue, index) => ({
              duration: index === 0 ? '10' : '15',
              destination: venue.name
            })),
            isTimeline: true
          };
          
        } catch (error) {
          console.error('❌ Timeline generation failed:', error);
          throw new Error('Failed to create timeline. Please try a simpler query.');
        }
        
      } else {
        // SINGLE VENUE MODE: Find one perfect match
        console.log('🎯 Single venue mode: Finding perfect match');
        
        try {
          const places = await generateSmartVenues(query, city, startTime || '12:00 PM');
          
          if (places.length === 0) {
            throw new Error('No venues found for your query');
          }
          
          // Take only the BEST venue for single queries
          const bestPlace = places[0];
          console.log('✅ Found perfect venue:', bestPlace.name);
          
          const venue = convertToVenueFormat(bestPlace, 0, startTime || '12:00 PM');
          
          return {
            title: `${bestPlace.name}`,
            id: Date.now(),
            city: city,
            query: query,
            planDate: date || new Date().toISOString().split('T')[0],
            startTime: startTime || '12:00 PM',
            venues: [venue],
            travelInfo: [{
              duration: '10',
              destination: venue.name
            }],
            isSingleVenue: true
          };
          
        } catch (error) {
          console.error('❌ Single venue search failed:', error);
          
          // Fallback to local venue
          const venues = generateQuerySpecificVenues(query, city, startTime || '12:00 PM');
          const bestVenue = venues[0];
          
          return {
            title: bestVenue.name,
            id: Date.now(),
            city: city,
            query: query,
            planDate: date || new Date().toISOString().split('T')[0],
            startTime: startTime || '12:00 PM',
            venues: [bestVenue],
            travelInfo: [{
              duration: '10',
              destination: bestVenue.name
            }],
            isSingleVenue: true
          };
        }
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Success!',
        description: `Itinerary "${data.title || 'Plan'}" created successfully.`,
      });
    },
    onError: (error: any) => {
      handleError(error, {
        fallbackMessage: 'Failed to create itinerary. Please try again.',
        onRetry: () => {
          // The retry will be handled by React Query's retry mechanism
        }
      });
    }
  });
};