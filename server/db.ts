
import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Load environment variables
dotenv.config();

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not found. Please add the DATABASE_URL secret in the Deployments tab.");
  process.exit(1);
}

let pool: Pool;
let db: PostgresJsDatabase<typeof schema>;

try {
  // Initialize pool and db instances
  pool = new Pool({ 
    connectionString: databaseUrl,
    max: 20,
    ssl: process.env.NODE_ENV === 'production'
  });
  db = drizzle(pool, { schema });
  console.log('Database connection initialized successfully');
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  process.exit(1);
}

// Export the initialized variables
export { pool, db };
