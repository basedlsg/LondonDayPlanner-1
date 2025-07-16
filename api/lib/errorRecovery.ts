import { AppError, ValidationError, NotFoundError, GooglePlacesError, NLPServiceError, WeatherServiceError } from './errors';

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error) => boolean;
  recover: (error: Error, context: any) => Promise<any>;
  priority: number; // Lower number = higher priority
}

export interface RecoveryContext {
  operation: string;
  retryCount: number;
  maxRetries: number;
  fallbackData?: any;
  originalRequest?: any;
}

export class ErrorRecoveryService {
  private strategies: RecoveryStrategy[] = [];

  constructor() {
    this.registerDefaultStrategies();
  }

  registerStrategy(strategy: RecoveryStrategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  async attemptRecovery<T>(
    error: Error,
    context: RecoveryContext
  ): Promise<{ recovered: boolean; data?: T; error?: Error }> {
    console.log(`🔄 [Recovery] Attempting recovery for ${context.operation}`, {
      errorType: error.constructor.name,
      retryCount: context.retryCount,
      maxRetries: context.maxRetries
    });

    // Find applicable recovery strategies
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.canRecover(error)
    );

    if (applicableStrategies.length === 0) {
      console.log(`❌ [Recovery] No recovery strategies available for ${error.constructor.name}`);
      return { recovered: false, error };
    }

    // Try each strategy in priority order
    for (const strategy of applicableStrategies) {
      try {
        console.log(`🔧 [Recovery] Trying strategy: ${strategy.name}`);
        const recoveredData = await strategy.recover(error, context);
        
        console.log(`✅ [Recovery] Successfully recovered using ${strategy.name}`);
        return { recovered: true, data: recoveredData };
      } catch (recoveryError) {
        console.log(`❌ [Recovery] Strategy ${strategy.name} failed:`, recoveryError);
        continue;
      }
    }

    console.log(`❌ [Recovery] All recovery strategies failed for ${context.operation}`);
    return { recovered: false, error };
  }

  private registerDefaultStrategies() {
    // Strategy 1: Retry with exponential backoff
    this.registerStrategy({
      name: 'RetryWithBackoff',
      priority: 1,
      canRecover: (error) => {
        return (error instanceof GooglePlacesError || error instanceof NLPServiceError || error instanceof WeatherServiceError) && 
               (error.statusCode === 503 || error.statusCode === 502 || error.statusCode === 429);
      },
      recover: async (error, context: RecoveryContext) => {
        if (context.retryCount >= context.maxRetries) {
          throw new Error('Maximum retries exceeded');
        }

        const delay = Math.min(1000 * Math.pow(2, context.retryCount), 10000);
        console.log(`⏳ [Recovery] Waiting ${delay}ms before retry ${context.retryCount + 1}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        throw new Error('Retry requested'); // Signal to retry the original operation
      }
    });

    // Strategy 2: Fallback to cached/default data
    this.registerStrategy({
      name: 'FallbackData',
      priority: 2,
      canRecover: (error) => true, // Can recover from any error if fallback data is available
      recover: async (error, context: RecoveryContext) => {
        if (!context.fallbackData) {
          throw new Error('No fallback data available');
        }

        console.log(`📦 [Recovery] Using fallback data for ${context.operation}`);
        return context.fallbackData;
      }
    });

    // Strategy 3: Simplified response for venue search failures
    this.registerStrategy({
      name: 'SimplifiedVenueResponse',
      priority: 3,
      canRecover: (error) => {
        return error.message?.includes('venue') || error.message?.includes('place');
      },
      recover: async (error, context: RecoveryContext) => {
        const { originalRequest } = context;
        
        // Create a simplified venue response
        const fallbackVenue = {
          name: originalRequest?.query ? `Activity: ${originalRequest.query}` : 'Planned Activity',
          address: originalRequest?.location || 'Location to be determined',
          rating: 0,
          categories: ['general'],
          time: originalRequest?.time || '12:00 PM',
          isPlaceholder: true,
          note: 'Venue details unavailable - please verify location'
        };

        console.log(`🏢 [Recovery] Created simplified venue response`);
        return { venues: [fallbackVenue] };
      }
    });

    // Strategy 4: Graceful degradation for AI services
    this.registerStrategy({
      name: 'AIServiceDegradation',
      priority: 4,
      canRecover: (error) => {
        return error.message?.includes('Gemini') || 
               error.message?.includes('AI') ||
               error.message?.includes('NLP');
      },
      recover: async (error, context: RecoveryContext) => {
        const { originalRequest } = context;
        
        console.log(`🤖 [Recovery] AI service unavailable, using rule-based fallback`);
        
        // Simple rule-based parsing as fallback
        const query = originalRequest?.query || '';
        const activities = [];
        
        // Basic keyword detection
        if (query.toLowerCase().includes('coffee') || query.toLowerCase().includes('cafe')) {
          activities.push({
            activity: 'Coffee',
            type: 'cafe',
            location: originalRequest?.location || 'City Center',
            duration: 60
          });
        }
        
        if (query.toLowerCase().includes('lunch') || query.toLowerCase().includes('restaurant')) {
          activities.push({
            activity: 'Lunch',
            type: 'restaurant', 
            location: originalRequest?.location || 'City Center',
            duration: 90
          });
        }
        
        if (query.toLowerCase().includes('museum') || query.toLowerCase().includes('art')) {
          activities.push({
            activity: 'Museum Visit',
            type: 'museum',
            location: originalRequest?.location || 'City Center', 
            duration: 120
          });
        }

        if (activities.length === 0) {
          activities.push({
            activity: 'General Activity',
            type: 'tourist_attraction',
            location: originalRequest?.location || 'City Center',
            duration: 90
          });
        }

        return { activities, isSimplified: true };
      }
    });

    // Strategy 5: Weather service fallback
    this.registerStrategy({
      name: 'WeatherFallback',
      priority: 5,
      canRecover: (error) => {
        return error.message?.includes('weather') || error.message?.includes('forecast');
      },
      recover: async (error, context: RecoveryContext) => {
        console.log(`🌤️ [Recovery] Weather service unavailable, using default conditions`);
        
        // Return basic weather data
        return {
          current: {
            temp: 20,
            description: 'Pleasant weather',
            icon: '01d'
          },
          isDefault: true,
          note: 'Weather data unavailable - using default conditions'
        };
      }
    });
  }
}

// Retry decorator for async functions
export function withRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  return async (...args: T): Promise<R> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break; // Don't wait after the last attempt
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        console.log(`🔄 [Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  };
}

// Circuit breaker for external services
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        console.log(`🔄 [Circuit Breaker] Transitioning to HALF_OPEN state`);
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🚫 [Circuit Breaker] Circuit OPEN - too many failures (${this.failures})`);
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();