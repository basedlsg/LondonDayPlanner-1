// server/db.ts - FIXED VERSION

import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http'; // Ensure NeonHttpDatabase is imported if used for type
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema'; // Import your Drizzle schema

// Don't fail at import time - defer connection until actually used
let dbInstance: NeonHttpDatabase<typeof schema> | null = null; // Typed instance
let connectionString: string | null = null;

function initializeDatabase(): NeonHttpDatabase<typeof schema> {
  if (dbInstance) {
    // console.log('🗄️  Database connection already initialized.');
    return dbInstance;
  }

  // Correctly handle undefined from process.env
  connectionString = process.env.DATABASE_URL || null;
  
  if (!connectionString) {
    const errorMessage = `
❌ DATABASE_URL environment variable is not set.

For local development:
1. Create a .env file in your project root (${process.cwd()}/.env)
2. Add: DATABASE_URL="your_neon_connection_string"

For Replit:
1. Go to the Secrets tab (lock icon) in the sidebar
2. Add DATABASE_URL with your Neon connection string

For production deployment:
1. Set DATABASE_URL in your deployment environment variables
`;
    console.error(errorMessage);
    // This specific error message is from the original code, let's keep it for consistency with previous logs
    throw new Error('DATABASE_URL not found. Please add the DATABASE_URL secret in the Deployments tab.'); 
  }

  console.log('🗄️  Initializing database instance with Neon driver...');
  
  try {
    const sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema }); // Pass the schema here
    console.log('✅ Database instance initialized successfully with Neon.');
    return dbInstance;
  } catch (error) {
    console.error('❌ Failed to initialize database with Neon driver:', error);
    throw error; // Re-throw the error to be caught by startup logic
  }
}

// Export a getter function for explicit initialization and access
export function getDb(): NeonHttpDatabase<typeof schema> {
  return initializeDatabase();
}

// For backwards compatibility and direct usage (e.g. in storage.ts if it expects a `db` export)
// This proxy ensures initializeDatabase() is called on first access to any property of `db`.
export const db: NeonHttpDatabase<typeof schema> = new Proxy({} as any, {
  get(target, prop) {
    const actualDb = initializeDatabase();
    // Forward the property access to the actual db instance
    // @ts-ignore
    return actualDb[prop as keyof typeof actualDb];
  }
});

// Export connection info for debugging (optional)
export function getDatabaseInfo() {
  return {
    hasConnectionString: !!connectionString,
    connectionStringPrefix: connectionString?.substring(0, 20) + '...',
    isInitialized: !!dbInstance,
  };
}
