import { useCallback, useState } from 'react';
import { useToast } from './use-toast';
import { AlertCircle, WifiOff, Clock, ShieldAlert, MapPin } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'LOCATION_ERROR'
  | 'API_KEY_ERROR'
  | 'UNKNOWN_ERROR';

interface ErrorConfig {
  title: string;
  description: string;
  icon: any;
  action?: {
    label: string;
    handler: () => void;
  };
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  NETWORK_ERROR: {
    title: 'Connection Problem',
    description: 'Unable to connect to the server. Please check your internet connection.',
    icon: WifiOff,
    action: {
      label: 'Retry',
      handler: () => window.location.reload()
    }
  },
  TIMEOUT_ERROR: {
    title: 'Request Timed Out',
    description: 'The request took too long. The server might be busy.',
    icon: Clock
  },
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    icon: AlertCircle
  },
  NOT_FOUND: {
    title: 'Not Found',
    description: 'The requested resource could not be found.',
    icon: AlertCircle
  },
  UNAUTHORIZED: {
    title: 'Authentication Required',
    description: 'Please log in to continue.',
    icon: ShieldAlert,
    action: {
      label: 'Log In',
      handler: () => window.location.href = '/login'
    }
  },
  RATE_LIMIT: {
    title: 'Too Many Requests',
    description: 'Please wait a moment before trying again.',
    icon: Clock
  },
  SERVER_ERROR: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
    icon: AlertCircle
  },
  LOCATION_ERROR: {
    title: 'Location Not Found',
    description: 'We couldn\'t find that location. Please try a different one.',
    icon: MapPin
  },
  API_KEY_ERROR: {
    title: 'Configuration Error',
    description: 'The application is not properly configured. Please contact support.',
    icon: ShieldAlert
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred. Please try again.',
    icon: AlertCircle
  }
};

export function useErrorHandler() {
  const { toast } = useToast();
  const [lastError, setLastError] = useState<AppError | null>(null);

  const mapErrorToType = (error: any): ErrorType => {
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    
    // Timeout errors
    if (error.code === 'TIMEOUT_ERROR' || error.message?.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    
    // HTTP status-based errors
    if (error.statusCode === 400 || error.code === 'VALIDATION_ERROR') {
      return 'VALIDATION_ERROR';
    }
    
    if (error.statusCode === 401) {
      return 'UNAUTHORIZED';
    }
    
    if (error.statusCode === 404) {
      return 'NOT_FOUND';
    }
    
    if (error.statusCode === 429) {
      return 'RATE_LIMIT';
    }
    
    if (error.statusCode >= 500) {
      return 'SERVER_ERROR';
    }
    
    // Application-specific errors
    if (error.code === 'LOCATION_ERROR' || error.message?.includes('location')) {
      return 'LOCATION_ERROR';
    }
    
    if (error.code === 'API_KEY_ERROR' || error.message?.includes('API key')) {
      return 'API_KEY_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  };

  const handleError = useCallback((error: any, options?: {
    silent?: boolean;
    fallbackMessage?: string;
    onRetry?: () => void;
  }) => {
    console.error('Error handled:', error);
    
    const appError: AppError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || options?.fallbackMessage || 'An error occurred',
      details: error.details || error,
      statusCode: error.statusCode || error.status
    };
    
    setLastError(appError);
    
    if (!options?.silent) {
      const errorType = mapErrorToType(appError);
      const config = ERROR_CONFIGS[errorType];
      
      toast({
        variant: 'destructive',
        title: config.title,
        description: appError.message || config.description,
        action: config.action ? (
          <ToastAction altText={config.action.label} onClick={config.action.handler}>
            {config.action.label}
          </ToastAction>
        ) : undefined
      });
    }
    
    return appError;
  }, [toast]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    handleError,
    clearError,
    lastError,
    isError: lastError !== null
  };
}