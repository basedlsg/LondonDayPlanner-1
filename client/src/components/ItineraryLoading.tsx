import React from 'react';
import { CardSkeleton } from './LoadingSpinner';

export const ItineraryLoading: React.FC = () => {
  return (
    <div className="bg-white flex flex-col items-center w-full min-h-screen">
      <div className="w-full max-w-md px-4 py-4 sm:py-6">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-6 animate-pulse"></div>
          <div className="h-12 bg-muted rounded-2xl w-48 mx-auto animate-pulse"></div>
        </div>

        {/* Venue card skeletons */}
        <div className="space-y-6 sm:space-y-8">
          {[1, 2, 3].map((index) => (
            <React.Fragment key={index}>
              <CardSkeleton />
              {index < 3 && (
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 bg-gray-50 rounded-lg animate-pulse">
                  <div className="w-4 h-4 bg-muted rounded-full"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};