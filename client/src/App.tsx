import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ItineraryPage from './pages/ItineraryPage';
import { CitiesPage } from './pages/CitiesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ItinerariesPage from './pages/ItinerariesPage';
import { TopNav } from './components/TopNav';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { CityProvider, useCity } from './hooks/useCity';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/toaster';

// Layout component that includes TopNav and ensures city context is available
const AppLayout = () => {
  const { currentCity, isLoading: isCityLoading } = useCity();

  // Potentially show a global loading/error state for city context here
  if (isCityLoading) return <div className="p-8 text-center">Loading city information...</div>;
  // if (!currentCity) return <Navigate to="/cities" replace />; // Or a more specific "City not found" page

  return (
    <div className="flex flex-col flex-1 w-full bg-gray-50 overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        {/* Outlet will render the matched nested route component */}
        <Outlet /> 
      </main>
    </div>
  );
};

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <CityProvider>
              <Routes>
                <Route path="/:city" element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="plan" element={<HomePage />} />
                  <Route path="itinerary/:id" element={<ItineraryPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Route>

                <Route path="/cities" element={<><TopNav /><CitiesPage /></>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/profile" element={<><TopNav /><ProfilePage /></>} />
                <Route path="/itineraries" element={<ItinerariesPage />} />
                
                <Route path="/" element={<NavigateToDefaultCity />} />
              </Routes>
            </CityProvider>
          </AuthProvider>
        </Router>
        <Toaster />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Helper component to handle initial navigation to a default city
const NavigateToDefaultCity = () => {
  const { currentCity, isLoading, availableCities } = useCity();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && availableCities.length > 0) {
      const currentPath = window.location.pathname;
      if (currentCity && currentPath === '/') {
        navigate(`/${currentCity.slug}${window.location.search}${window.location.hash}`, { replace: true });
      } else if (!currentCity && currentPath === '/' && availableCities.length > 0) {
        // If still at root and no specific city determined by URL, navigate to first available as default
        navigate(`/${availableCities[0].slug}${window.location.search}${window.location.hash}`, { replace: true });
      }
      // CityProvider also has logic to redirect from / to /:city if city can be determined from params or default
    }
  }, [currentCity, isLoading, availableCities, navigate]);

  return <div className="p-8 text-center">Loading...</div>; // Or a proper loading spinner
};

export default App;