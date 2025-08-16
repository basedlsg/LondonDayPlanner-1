import { z } from 'zod';

// Environment variable schema with validation
const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GOOGLE_PLACES_API_KEY: z.string().min(1, 'GOOGLE_PLACES_API_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  WEATHER_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  SESSION_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

class EnvironmentValidator {
  private config: EnvironmentConfig | null = null;
  private validationErrors: string[] = [];

  public validate(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    console.log('🔍 [Environment] Validating environment variables...');
    
    try {
      this.config = environmentSchema.parse(process.env);
      console.log('✅ [Environment] All required environment variables are present');
      
      // Log configuration status (without sensitive values)
      console.log('📋 [Environment] Configuration status:', {
        DATABASE_URL: !!this.config.DATABASE_URL,
        GOOGLE_PLACES_API_KEY: !!this.config.GOOGLE_PLACES_API_KEY,
        GEMINI_API_KEY: !!this.config.GEMINI_API_KEY,
        WEATHER_API_KEY: !!this.config.WEATHER_API_KEY,
        NODE_ENV: this.config.NODE_ENV,
        SESSION_SECRET: !!this.config.SESSION_SECRET,
        CORS_ORIGIN: !!this.config.CORS_ORIGIN,
      });

      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.validationErrors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        
        console.error('❌ [Environment] Environment validation failed:');
        this.validationErrors.forEach(err => console.error(`   - ${err}`));
        
        // Provide setup instructions
        this.logSetupInstructions();
        
        throw new Error(`Environment validation failed: ${this.validationErrors.join(', ')}`);
      }
      
      console.error('❌ [Environment] Unexpected error during validation:', error);
      throw error;
    }
  }

  public getConfig(): EnvironmentConfig {
    if (!this.config) {
      return this.validate();
    }
    return this.config;
  }

  public isConfigured(): boolean {
    try {
      this.validate();
      return true;
    } catch {
      return false;
    }
  }

  public getValidationErrors(): string[] {
    return this.validationErrors;
  }

  private logSetupInstructions(): void {
    console.error(`
🔧 [Environment] Setup Instructions:

For Vercel deployment:
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following required variables:
   - DATABASE_URL: Your Neon database connection string
   - GOOGLE_PLACES_API_KEY: Your Google Places API key
   - GEMINI_API_KEY: Your Google Gemini API key
   - WEATHER_API_KEY: Your weather API key (optional)

For local development:
1. Create a .env file in your project root
2. Add the required environment variables
3. Ensure .env is in your .gitignore

Missing variables: ${this.validationErrors.join(', ')}
`);
  }

  // Helper methods for specific configurations
  public getDatabaseUrl(): string {
    return this.getConfig().DATABASE_URL;
  }

  public getGooglePlacesApiKey(): string {
    return this.getConfig().GOOGLE_PLACES_API_KEY;
  }

  public getGeminiApiKey(): string {
    return this.getConfig().GEMINI_API_KEY;
  }

  public getWeatherApiKey(): string | undefined {
    return this.getConfig().WEATHER_API_KEY;
  }

  public getNodeEnv(): string {
    return this.getConfig().NODE_ENV;
  }

  public isProduction(): boolean {
    return this.getNodeEnv() === 'production';
  }

  public isDevelopment(): boolean {
    return this.getNodeEnv() === 'development';
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();

// Convenience exports
export const getEnvironmentConfig = () => environmentValidator.getConfig();
export const validateEnvironment = () => environmentValidator.validate();
export const isEnvironmentConfigured = () => environmentValidator.isConfigured();