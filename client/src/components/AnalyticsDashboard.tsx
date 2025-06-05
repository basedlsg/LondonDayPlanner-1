import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Activity,
  Users,
  Calendar,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useCity } from '../hooks/useCity';

interface AnalyticsData {
  summary: {
    totalQueries: number;
    totalVenueVisits: number;
    uniqueVenues: number;
    mostPopularTime: {
      hour: number;
      dayOfWeek: number;
      count: number;
    } | null;
  };
  popularVenues: Array<{
    placeId: string;
    name: string;
    category: string;
    visitCount: number;
    averageRating?: number;
    city: string;
  }>;
  queryPatterns: Array<{
    pattern: string;
    count: number;
    examples: string[];
    commonActivities: string[];
  }>;
  timePreferences: Array<{
    hour: number;
    dayOfWeek: number;
    count: number;
  }>;
  featureUsage: Record<string, number>;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PATTERN_LABELS: Record<string, string> = {
  'meal-based': '🍽️ Dining',
  'cultural': '🎨 Culture',
  'shopping': '🛍️ Shopping',
  'nightlife': '🌃 Nightlife',
  'outdoor': '🌳 Outdoor',
  'general': '📍 General'
};

export function AnalyticsDashboard() {
  const { currentCity } = useCity();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchAnalytics();
  }, [currentCity, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics${currentCity ? `?city=${currentCity.slug}` : ''}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted" />
            <CardContent className="h-32 bg-muted mt-2" />
          </Card>
        ))}
      </div>
    );
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getTimeHeatmapData = () => {
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    
    data.timePreferences.forEach(pref => {
      if (pref.dayOfWeek >= 0 && pref.dayOfWeek < 7 && pref.hour >= 0 && pref.hour < 24) {
        heatmap[pref.dayOfWeek][pref.hour] = pref.count;
      }
    });
    
    return heatmap;
  };

  const maxTimeCount = Math.max(...data.timePreferences.map(p => p.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalQueries}</div>
            <p className="text-xs text-muted-foreground">
              Itineraries created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venue Visits</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalVenueVisits}</div>
            <p className="text-xs text-muted-foreground">
              Places recommended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Venues</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.uniqueVenues}</div>
            <p className="text-xs text-muted-foreground">
              Different places
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.mostPopularTime ? 
                formatHour(data.summary.mostPopularTime.hour) : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.mostPopularTime ? 
                DAYS_OF_WEEK[data.summary.mostPopularTime.dayOfWeek] : 
                'No data'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="venues" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="venues">Popular Venues</TabsTrigger>
          <TabsTrigger value="patterns">Query Patterns</TabsTrigger>
          <TabsTrigger value="times">Time Heatmap</TabsTrigger>
          <TabsTrigger value="features">Feature Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Venues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.popularVenues.slice(0, 10).map((venue, index) => (
                  <div key={venue.placeId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {venue.category} • {venue.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {venue.averageRating && (
                        <Badge variant="secondary">
                          ⭐ {venue.averageRating.toFixed(1)}
                        </Badge>
                      )}
                      <Badge>{venue.visitCount} visits</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Query Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.queryPatterns.map((pattern) => (
                  <div key={pattern.pattern} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {PATTERN_LABELS[pattern.pattern] || pattern.pattern}
                        </span>
                        <Badge variant="secondary">{pattern.count} queries</Badge>
                      </div>
                    </div>
                    <Progress 
                      value={(pattern.count / data.summary.totalQueries) * 100} 
                      className="h-2"
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>Common activities: {pattern.commonActivities.join(', ')}</p>
                      <p className="mt-1">Examples:</p>
                      <ul className="list-disc list-inside ml-2">
                        {pattern.examples.slice(0, 3).map((example, i) => (
                          <li key={i} className="truncate">{example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="times" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Time Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-25 gap-1 text-xs">
                  <div className="col-span-1" /> {/* Empty corner */}
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="text-center text-muted-foreground">
                      {i % 3 === 0 ? i : ''}
                    </div>
                  ))}
                </div>
                {getTimeHeatmapData().map((dayData, dayIndex) => (
                  <div key={dayIndex} className="grid grid-cols-25 gap-1">
                    <div className="text-xs text-muted-foreground pr-2">
                      {DAYS_OF_WEEK[dayIndex]}
                    </div>
                    {dayData.map((count, hourIndex) => {
                      const intensity = count / maxTimeCount;
                      return (
                        <div
                          key={hourIndex}
                          className="h-4 rounded"
                          style={{
                            backgroundColor: count > 0 
                              ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`
                              : 'rgb(229, 231, 235)'
                          }}
                          title={`${DAYS_OF_WEEK[dayIndex]} ${formatHour(hourIndex)}: ${count} activities`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1].map(intensity => (
                    <div
                      key={intensity}
                      className="h-3 w-3 rounded"
                      style={{
                        backgroundColor: `rgba(59, 130, 246, ${intensity})`
                      }}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.featureUsage)
                  .sort(([, a], [, b]) => b - a)
                  .map(([feature, count]) => (
                    <div key={feature} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {feature.replace(/[_-]/g, ' ')}
                        </span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                      <Progress 
                        value={(count / Math.max(...Object.values(data.featureUsage))) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}