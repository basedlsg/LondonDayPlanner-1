import React, { useState } from 'react';
import { Route, Switch } from 'wouter';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import TopNav from './components/TopNav';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ItineraryPage from './pages/ItineraryPage';
import { Toaster } from './components/ui/toaster';
import { City, cities } from './data/cities';

function App() {
  const [selectedCity, setSelectedCity] = useState<City>(cities[0]);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <TopNav onCityChange={setSelectedCity} />
        <main className="flex-1">
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/profile">
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </Route>
            <Route path="/itinerary/:id">
              <ItineraryPage />
            </Route>
            <Route path="/">
              <HomePage selectedCity={selectedCity} />
            </Route>
          </Switch>
        </main>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;