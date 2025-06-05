import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatInTimeZone } from 'date-fns-tz';
import { useErrorHandler } from './useErrorHandler';

export const usePlanMutation = () => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  
  return useMutation({
    mutationFn: async ({ query, city = 'nyc', date, startTime, tripDuration = 1 }: { 
      query: string; 
      city?: string;
      date?: string;
      startTime?: string;
      tripDuration?: number;
    }) => {
      const response = await fetch(`/api/${city}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, date, startTime, tripDuration }),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to create plan. Please try again.';
        let errorCode = 'UNKNOWN_ERROR';
        
        try {
          const errorJson = await response.json();
          errorMessage = errorJson.message || errorJson.error || errorMessage;
          errorCode = errorJson.code || errorCode;
        } catch (e) {
          try {
            errorMessage = await response.text();
          } catch (textError) {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
        
        const error = {
          code: errorCode,
          message: errorMessage,
          statusCode: response.status
        };
        
        throw error;
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success!',
        description: `Itinerary "${data.title || 'Plan'}" created successfully.`,
      });
    },
    onError: (error: any) => {
      handleError(error, {
        fallbackMessage: 'Failed to create itinerary. Please try again.',
        onRetry: () => {
          // The retry will be handled by React Query's retry mechanism
        }
      });
    }
  });
};