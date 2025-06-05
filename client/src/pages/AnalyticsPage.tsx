import React from 'react';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCity } from '../hooks/useCity';

export function AnalyticsPage() {
  const { currentCity } = useCity();
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {currentCity ? `Insights for ${currentCity.name}` : 'Global insights'}
          </p>
        </div>
        <RouterLink to={`/${currentCity?.slug || 'nyc'}/plan`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Planner
          </Button>
        </RouterLink>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
}