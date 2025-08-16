import { testConnection, getDatabaseInfo } from '../db';
import { environmentValidator, isEnvironmentConfigured } from './environment';

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  details?: Record<string, any>;
  lastChecked: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    environment: ServiceStatus;
    apis: ServiceStatus;
  };
  debug?: {
    database: Record<string, any>;
    environment: Record<string, any>;
  };
}

class HealthCheckService {
  private startTime: number;
  private version: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(includeDebug = false): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    console.log('🏥 [HealthCheck] Starting comprehensive health check...');

    // Check all services
    const [databaseStatus, environmentStatus, apisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkEnvironment(),
      this.checkApis(),
    ]);

    // Determine overall status
    const overallStatus = this.determineOverallStatus([
      databaseStatus,
      environmentStatus,
      apisStatus,
    ]);

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp,
      uptime,
      version: this.version,
      environment: environmentValidator.getNodeEnv(),
      services: {
        database: databaseStatus,
        environment: environmentStatus,
        apis: apisStatus,
      },
    };

    // Add debug information if requested
    if (includeDebug) {
      response.debug = {
        database: getDatabaseInfo(),
        environment: {
          configured: isEnvironmentConfigured(),
          errors: environmentValidator.getValidationErrors(),
          nodeEnv: environmentValidator.getNodeEnv(),
          isProduction: environmentValidator.isProduction(),
        },
      };
    }

    console.log(`🏥 [HealthCheck] Overall status: ${overallStatus}`);
    return response;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    const lastChecked = new Date().toISOString();

    try {
      console.log('🗄️ [HealthCheck] Testing database connection...');
      
      const startTime = Date.now();
      const isConnected = await testConnection();
      const responseTime = Date.now() - startTime;

      if (isConnected) {
        return {
          status: 'healthy',
          message: 'Database connection successful',
          details: {
            responseTime: `${responseTime}ms`,
            provider: 'Neon',
          },
          lastChecked,
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
          details: {
            responseTime: `${responseTime}ms`,
            provider: 'Neon',
          },
          lastChecked,
        };
      }
    } catch (error) {
      console.error('❌ [HealthCheck] Database check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Database connection error',
        details: {
          error: error instanceof Error ? error.message : String(error),
          provider: 'Neon',
        },
        lastChecked,
      };
    }
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironment(): Promise<ServiceStatus> {
    const lastChecked = new Date().toISOString();

    try {
      console.log('🔧 [HealthCheck] Validating environment configuration...');
      
      const isConfigured = isEnvironmentConfigured();
      const errors = environmentValidator.getValidationErrors();

      if (isConfigured) {
        const config = environmentValidator.getConfig();
        return {
          status: 'healthy',
          message: 'Environment configuration valid',
          details: {
            nodeEnv: config.NODE_ENV,
            hasWeatherApi: !!config.WEATHER_API_KEY,
            hasSessionSecret: !!config.SESSION_SECRET,
          },
          lastChecked,
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Environment configuration invalid',
          details: {
            errors: errors,
            missingCount: errors.length,
          },
          lastChecked,
        };
      }
    } catch (error) {
      console.error('❌ [HealthCheck] Environment check failed:', error);
      return {
        status: 'unhealthy',
        message: 'Environment validation error',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        lastChecked,
      };
    }
  }

  /**
   * Check external API configurations
   */
  private async checkApis(): Promise<ServiceStatus> {
    const lastChecked = new Date().toISOString();

    try {
      console.log('🔌 [HealthCheck] Checking API configurations...');
      
      const config = environmentValidator.getConfig();
      const apiStatus = {
        googlePlaces: !!config.GOOGLE_PLACES_API_KEY,
        gemini: !!config.GEMINI_API_KEY,
        weather: !!config.WEATHER_API_KEY,
      };

      const configuredApis = Object.values(apiStatus).filter(Boolean).length;
      const totalApis = Object.keys(apiStatus).length;

      // Consider healthy if critical APIs are configured
      const criticalApis = apiStatus.googlePlaces && apiStatus.gemini;
      
      if (criticalApis) {
        return {
          status: configuredApis === totalApis ? 'healthy' : 'degraded',
          message: `${configuredApis}/${totalApis} APIs configured`,
          details: apiStatus,
          lastChecked,
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Critical APIs not configured',
          details: apiStatus,
          lastChecked,
        };
      }
    } catch (error) {
      console.error('❌ [HealthCheck] API check failed:', error);
      return {
        status: 'unhealthy',
        message: 'API configuration check error',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        lastChecked,
      };
    }
  }

  /**
   * Determine overall system status based on service statuses
   */
  private determineOverallStatus(serviceStatuses: ServiceStatus[]): 'healthy' | 'unhealthy' | 'degraded' {
    const hasUnhealthy = serviceStatuses.some(s => s.status === 'unhealthy');
    const hasDegraded = serviceStatuses.some(s => s.status === 'degraded');

    if (hasUnhealthy) {
      return 'unhealthy';
    } else if (hasDegraded) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Quick health check for basic liveness probe
   */
  async quickHealthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      // Just check if environment is configured
      const isConfigured = isEnvironmentConfigured();
      
      return {
        status: isConfigured ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get service uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.version;
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();

// Convenience exports
export const performHealthCheck = (includeDebug = false) => 
  healthCheckService.performHealthCheck(includeDebug);

export const quickHealthCheck = () => 
  healthCheckService.quickHealthCheck();