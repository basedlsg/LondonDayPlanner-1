import React, { useEffect } from 'react';
import { SimpleLoginForm } from '../components/auth/SimpleLoginForm';
import { TopNav } from '../components/TopNav';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <SimpleLoginForm />
      </div>
    </div>
  );
}