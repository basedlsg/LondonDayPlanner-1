import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Hotel, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface DayItinerary {
  dayNumber: number;
  date: string;
  title?: string;
  theme?: string;
  venues: any[];
  travelInfo: any[];
  accommodation?: {
    name: string;
    address: string;
    checkIn?: string;
    checkOut?: string;
  };
}

interface MultiDayItineraryProps {
  days: DayItinerary[];
  tripTitle: string;
  cityName: string;
  startDate: string;
  endDate: string;
  onExport: () => void;
  onSave?: () => void;
  isAuthenticated?: boolean;
}

export function MultiDayItinerary({
  days,
  tripTitle,
  cityName,
  startDate,
  endDate,
  onExport,
  onSave,
  isAuthenticated
}: MultiDayItineraryProps) {
  const [activeDay, setActiveDay] = useState(1);
  
  const currentDay = days.find(d => d.dayNumber === activeDay) || days[0];
  
  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && activeDay > 1) {
      setActiveDay(activeDay - 1);
    } else if (direction === 'next' && activeDay < days.length) {
      setActiveDay(activeDay + 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Trip Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{tripTitle}</CardTitle>
              <p className="text-gray-600 mt-1">
                {cityName} • {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              {isAuthenticated && onSave && (
                <Button onClick={onSave} variant="outline">
                  Save Trip
                </Button>
              )}
              <Button onClick={onExport}>
                Export All Days
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Day Navigation */}
      <div className="mb-6">
        <Tabs value={`day-${activeDay}`} onValueChange={(value) => {
          const dayNum = parseInt(value.replace('day-', ''));
          setActiveDay(dayNum);
        }}>
          <TabsList className="grid grid-cols-auto gap-1 w-full">
            {days.map((day) => (
              <TabsTrigger
                key={day.dayNumber}
                value={`day-${day.dayNumber}`}
                className="flex-1"
              >
                <div className="text-center">
                  <div className="font-semibold">Day {day.dayNumber}</div>
                  <div className="text-xs opacity-75">
                    {format(new Date(day.date), 'MMM d')}
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {days.map((day) => (
            <TabsContent key={day.dayNumber} value={`day-${day.dayNumber}`}>
              {/* Day Header */}
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        Day {day.dayNumber}: {day.title || format(new Date(day.date), 'EEEE, MMMM d')}
                      </h3>
                      {day.theme && (
                        <Badge variant="secondary" className="mt-2">
                          {day.theme}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateDay('prev')}
                        disabled={day.dayNumber === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateDay('next')}
                        disabled={day.dayNumber === days.length}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Accommodation Info */}
                  {day.accommodation && day.dayNumber < days.length && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <Hotel className="w-5 h-5" />
                        <span className="font-semibold">Tonight's Accommodation</span>
                      </div>
                      <p className="font-medium">{day.accommodation.name}</p>
                      <p className="text-sm text-gray-600">{day.accommodation.address}</p>
                    </div>
                  )}

                  {/* Day's Venues */}
                  <div className="space-y-4">
                    {day.venues.map((venue, index) => (
                      <div key={index}>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-lg">{venue.name}</h4>
                                <p className="text-gray-600 text-sm mt-1">
                                  {venue.time} • {venue.address}
                                </p>
                                {venue.categories && (
                                  <div className="flex gap-2 mt-2">
                                    {venue.categories.map((cat: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {cat}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <MapPin className="w-5 h-5 text-gray-400" />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Travel Info */}
                        {index < day.venues.length - 1 && day.travelInfo[index] && (
                          <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
                            <div className="w-px h-6 bg-gray-300 ml-2" />
                            <span>{day.travelInfo[index].duration} min</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Trip Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{days.length}</div>
              <div className="text-sm text-gray-600">Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {days.reduce((sum, day) => sum + day.venues.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Places</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {days.filter(d => d.accommodation).length}
              </div>
              <div className="text-sm text-gray-600">Nights</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{cityName}</div>
              <div className="text-sm text-gray-600">City</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}