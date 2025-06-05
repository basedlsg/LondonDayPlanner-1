import React from 'react';
import { TopNav } from '../components/TopNav';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

interface SavedItinerary {
  id: number;
  title: string;
  query: string;
  planDate?: string;
  created: string;
  city?: string;
  placeCount?: number;
}

export default function ItinerariesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Fetch user's saved itineraries
  const { data: itineraries, isLoading } = useQuery<SavedItinerary[]>({
    queryKey: ['user-itineraries'],
    queryFn: async () => {
      const response = await fetch('/api/user/itineraries', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch itineraries');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Itineraries</h1>
          <p className="text-gray-600 mt-2">View and manage your saved travel plans</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : itineraries && itineraries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {itineraries.map((itinerary) => (
              <Card key={itinerary.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/itinerary/${itinerary.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {itinerary.title || `Itinerary #${itinerary.id}`}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {itinerary.query}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {itinerary.planDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(itinerary.planDate)}</span>
                        </div>
                      )}
                      {itinerary.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="capitalize">{itinerary.city}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Created {formatDate(itinerary.created)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {itinerary.placeCount || 0} places
                      </span>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No itineraries yet</h3>
              <p className="text-gray-600 mb-6">
                Start planning your perfect day to save itineraries here
              </p>
              <Button asChild>
                <Link href="/">Create Your First Itinerary</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}