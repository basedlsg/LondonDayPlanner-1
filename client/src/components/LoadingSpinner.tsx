import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Loading...',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-primary border-t-transparent ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Skeleton loader for content
export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
    </div>
  );
};

// Card skeleton for itinerary items
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-card rounded-lg p-4 animate-pulse ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="h-10 w-20 bg-muted rounded"></div>
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2"></div>
      <div className="h-4 bg-muted rounded w-2/3"></div>
    </div>
  );
};

// Itinerary Loading Component
export const ItineraryLoading: React.FC = () => {
  return (
    <div className="bg-white flex flex-col items-center w-full min-h-screen">
      <div className="w-full max-w-md px-4 py-4 sm:py-6 pb-20 sm:pb-12">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8 text-center">
          <SkeletonLoader className="h-8 sm:h-10 w-3/4 mx-auto mb-6 sm:mb-8" />
          <SkeletonLoader className="h-12 sm:h-14 w-full rounded-2xl" />
        </div>

        {/* Venues List Skeleton */}
        <div className="space-y-6 sm:space-y-8">
          {[1, 2, 3].map((index) => (
            <React.Fragment key={index}>
              <CardSkeleton className="p-4 sm:p-6" />
              
              {index < 3 && (
                <div className="flex items-center gap-3 px-5 py-4 mt-4 mb-4 bg-white rounded-lg shadow-sm border border-gray-100">
                  <SkeletonLoader className="w-4 h-4 rounded-full" />
                  <SkeletonLoader className="h-4 flex-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};