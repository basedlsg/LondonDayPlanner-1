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

  // Get Google Maps API key from environment variable
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return <div className="p-8 text-center text-gray-500">Map unavailable: API key not configured</div>;
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={['places', 'geometry']}>
      <div className="w-full rounded-lg overflow-hidden shadow-lg">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          onLoad={onLoad}
          options={options}
        >
          {/* Render route directions */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                preserveViewport: true,
                polylineOptions: {
                  strokeColor: '#3b82f6',
                  strokeWeight: 4,
                  strokeOpacity: 0.7
                }
              }}
            />
          )}

          {/* Render venue markers */}
          {venues.map((venue, index) => {
            if (!venue.location) return null;
            
            const markerColor = getMarkerColor(index, venues.length);
            
            return (
              <React.Fragment key={index}>
                <Marker
                  position={venue.location}
                  onClick={() => handleMarkerClick(index)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: markerColor,
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                  label={{
                    text: String(index + 1),
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />

                {/* Info window for selected venue */}
                {selectedVenue === index && (
                  <InfoWindow
                    position={venue.location}
                    onCloseClick={() => setSelectedVenue(null)}
                  >
                    <div className="p-2 max-w-xs">
                      <h3 className="font-semibold text-lg mb-1">{venue.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{venue.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-2">{venue.address}</span>
                      </div>
                      {venue.rating && (
                        <div className="flex items-center gap-1 text-sm mb-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{venue.rating}</span>
                        </div>
                      )}
                      {venue.alternatives && venue.alternatives.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowAlternatives(index)}
                          className="w-full mt-2"
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          View {venue.alternatives.length} alternatives
                        </Button>
                      )}
                    </div>
                  </InfoWindow>
                )}

                {/* Show alternative venues */}
                {showAlternatives === index && venue.alternatives && (
                  <>
                    {venue.alternatives.map((alt, altIndex) => {
                      if (!alt.location) return null;
                      
                      return (
                        <React.Fragment key={`alt-${index}-${altIndex}`}>
                          <Marker
                            position={alt.location}
                            onClick={() => handleSelectAlternative(index, altIndex)}
                            icon={{
                              path: google.maps.SymbolPath.CIRCLE,
                              scale: 8,
                              fillColor: '#9ca3af',
                              fillOpacity: 0.8,
                              strokeColor: '#ffffff',
                              strokeWeight: 2,
                            }}
                            label={{
                              text: String.fromCharCode(65 + altIndex), // A, B, C...
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}
                          />
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </React.Fragment>
            );
          })}
        </GoogleMap>
      </div>
    </LoadScript>
  );
};