// @ts-nocheck
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { getDb } from './db';
import { config } from 'dotenv';

// Load environment variables
config();

async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  try {
    const db = getDb();
    
    // Run migrations from the migrations folder
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Migrations completed successfully!');
    
    // Verify the schema by checking if tables exist
    try {
      const testQuery = await db.execute`SELECT COUNT(*) FROM itineraries`;
      console.log('✅ Itineraries table verified');
    } catch (error) {
      console.error('❌ Error verifying itineraries table:', error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();