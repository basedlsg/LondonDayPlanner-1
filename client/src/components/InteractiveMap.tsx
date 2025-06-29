import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { Button } from './ui/button';
import { Clock, MapPin, Star, Navigation } from 'lucide-react';

interface Venue {
  name: string;
  time: string;
  address: string;
  rating?: number;
  categories?: string[];
  location?: {
    lat: number;
    lng: number;
  };
  alternatives?: Array<{
    name: string;
    address: string;
    rating?: number;
    location?: {
      lat: number;
      lng: number;
    };
  }>;
}

interface InteractiveMapProps {
  venues: Venue[];
  city?: string;
  onVenueSelect?: (venueIndex: number, alternativeIndex?: number) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: false,
  fullscreenControl: true,
};

// Custom marker colors for different venue types
const getMarkerColor = (index: number, total: number) => {
  if (index === 0) return '#22c55e'; // Green for start
  if (index === total - 1) return '#ef4444'; // Red for end
  return '#3b82f6'; // Blue for middle venues
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  venues, 
  city = 'london',
  onVenueSelect 
}) => {
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<number | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Get center based on city or first venue
  const center = useMemo(() => {
    if (venues.length > 0 && venues[0].location) {
      return venues[0].location;
    }
    
    // City defaults
    const cityDefaults: Record<string, { lat: number; lng: number }> = {
      london: { lat: 51.5074, lng: -0.1278 },
      nyc: { lat: 40.7128, lng: -74.0060 },
      boston: { lat: 42.3601, lng: -71.0589 },
      austin: { lat: 30.2672, lng: -97.7431 }
    };
    
    return cityDefaults[city] || cityDefaults.london;
  }, [venues, city]);

  // Load directions when venues change
  const loadDirections = useCallback(() => {
    if (!venues || venues.length < 2 || !window.google) return;

    const directionsService = new google.maps.DirectionsService();
    
    // Filter venues with valid locations
    const validVenues = venues.filter(v => v.location?.lat && v.location?.lng);
    if (validVenues.length < 2) return;

    const waypoints = validVenues.slice(1, -1).map(venue => ({
      location: new google.maps.LatLng(venue.location!.lat, venue.location!.lng),
      stopover: true
    }));

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(validVenues[0].location!.lat, validVenues[0].location!.lng),
      destination: new google.maps.LatLng(
        validVenues[validVenues.length - 1].location!.lat, 
        validVenues[validVenues.length - 1].location!.lng
      ),
      waypoints,
      travelMode: google.maps.TravelMode.TRANSIT,
      transitOptions: {
        modes: [google.maps.TransitMode.SUBWAY, google.maps.TransitMode.BUS],
        routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
      },
      unitSystem: google.maps.UnitSystem.METRIC
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        setDirections(result);
      } else {
        console.error('Directions request failed:', status);
        // Fallback to walking directions
        directionsService.route({
          ...request,
          travelMode: google.maps.TravelMode.WALKING,
          transitOptions: undefined
        }, (walkResult, walkStatus) => {
          if (walkStatus === 'OK' && walkResult) {
            setDirections(walkResult);
          }
        });
      }
    });
  }, [venues]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Fit bounds to show all venues
    if (venues.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      venues.forEach(venue => {
        if (venue.location) {
          bounds.extend(new google.maps.LatLng(venue.location.lat, venue.location.lng));
        }
      });
      map.fitBounds(bounds);
      
      // Load directions after map is ready
      setTimeout(loadDirections, 500);
    }
  }, [venues, loadDirections]);

  const handleMarkerClick = (index: number) => {
    setSelectedVenue(index);
    setShowAlternatives(null);
  };

  const handleShowAlternatives = (index: number) => {
    setShowAlternatives(showAlternatives === index ? null : index);
  };

  const handleSelectAlternative = (venueIndex: number, alternativeIndex: number) => {
    if (onVenueSelect) {
      onVenueSelect(venueIndex, alternativeIndex);
    }
    setShowAlternatives(null);
    setSelectedVenue(null);
  };

  // SECURITY: Map functionality disabled for deployment
  // Google Maps API key must be moved to backend proxy before enabling
  return (
    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border">
      <MapPin className="mx-auto mb-2 h-8 w-8" />
      <p className="font-medium">Interactive Map Temporarily Disabled</p>
      <p className="text-sm mt-1">Map functionality disabled for security during deployment</p>
      <p className="text-xs mt-2 text-gray-400">Venues are still available in list view above</p>
    </div>
  );
};