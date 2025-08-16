// Optimized database connection for Vercel serverless environment

import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';
import { environmentValidator } from './lib/environment';

// Database instance and connection state
let dbInstance: NeonHttpDatabase<typeof schema> | null = null;
let connectionString: string | null = null;
let isConnecting = false;

// Connection configuration optimized for serverless
const CONNECTION_CONFIG = {
  maxRetries: 3,
  baseRetryDelay: 1000, // 1 second
  maxRetryDelay: 5000,  // 5 seconds max
  connectionTimeout: 10000, // 10 seconds
};

/**
 * Initialize database connection with retry logic and proper error handling
 */
async function initializeDatabase(): Promise<NeonHttpDatabase<typeof schema>> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // Prevent multiple concurrent initialization attempts
  if (isConnecting) {
    // Wait for ongoing connection attempt
    while (isConnecting && !dbInstance) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (dbInstance) {
      return dbInstance;
    }
  }

  isConnecting = true;

  try {
    // Get validated database URL
    connectionString = environmentValidator.getDatabaseUrl();
    
    console.log('🗄️ [Database] Initializing Neon database connection...');
    
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < CONNECTION_CONFIG.maxRetries) {
      try {
        // Create Neon SQL client
        const sql = neon(connectionString);
        
        // Create Drizzle instance
        dbInstance = drizzle(sql, { schema });
        
        // Test connection with timeout
        const testPromise = sql`SELECT 1 as test, NOW() as timestamp`;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_CONFIG.connectionTimeout)
        );
        
        const result = await Promise.race([testPromise, timeoutPromise]);
        
        console.log('✅ [Database] Connection established successfully');
        console.log(`🕒 [Database] Server time: ${(result as any)[0]?.timestamp}`);
        
        isConnecting = false;
        return dbInstance;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;
        
        console.warn(`⚠️ [Database] Connection attempt ${retryCount}/${CONNECTION_CONFIG.maxRetries} failed:`, lastError.message);
        
        if (retryCount < CONNECTION_CONFIG.maxRetries) {
          // Calculate retry delay with exponential backoff
          const delay = Math.min(
            CONNECTION_CONFIG.baseRetryDelay * Math.pow(2, retryCount - 1),
            CONNECTION_CONFIG.maxRetryDelay
          );
          
          console.log(`⏳ [Database] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    isConnecting = false;
    const errorMessage = `Database connection failed after ${CONNECTION_CONFIG.maxRetries} attempts. Last error: ${lastError?.message}`;
    console.error('❌ [Database]', errorMessage);
    
    throw new Error(errorMessage);
    
  } catch (error) {
    isConnecting = false;
    
    if (error instanceof Error) {
      console.error('❌ [Database] Initialization error:', error.message);
      throw error;
    }
    
    const unknownError = new Error(`Database initialization failed: ${String(error)}`);
    console.error('❌ [Database] Unknown error:', unknownError.message);
    throw unknownError;
  }
}

/**
 * Get database instance with automatic initialization
 */
export async function getDb(): Promise<NeonHttpDatabase<typeof schema>> {
  return await initializeDatabase();
}

/**
 * Test database connectivity
 */
export async function testConnection(): Promise<boolean> {
  try {
    const db = await getDb();
    const sql = neon(connectionString!);
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ [Database] Connection test failed:', error);
    return false;
  }
}

/**
 * Get database connection information for debugging
 */
export function getDatabaseInfo() {
  return {
    isInitialized: !!dbInstance,
    isConnecting,
    hasConnectionString: !!connectionString,
    connectionStringPrefix: connectionString ? 
      `${connectionString.split('@')[0].split('://')[0]}://***@${connectionString.split('@')[1]?.substring(0, 20)}...` : 
      'Not set',
    config: CONNECTION_CONFIG,
  };
}

/**
 * Reset database connection (useful for testing)
 */
export function resetConnection(): void {
  console.log('🔄 [Database] Resetting connection...');
  dbInstance = null;
  connectionString = null;
  isConnecting = false;
}

// For backwards compatibility - direct db export
// Note: This will throw if used before initialization
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(target, prop) {
    if (!dbInstance) {
      throw new Error('Database not initialized. Use getDb() for async initialization.');
    }
    return (dbInstance as any)[prop];
  }
});
