// server/lib/environment.ts - Robust environment setup

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

interface EnvironmentInfo {
  platform: 'local' | 'replit' | 'vercel' | 'railway' | 'unknown';
  hasEnvFile: boolean;
  databaseUrl: string | null;
  sessionSecret: string | null;
  // Add other critical env vars here if needed for validation
}

export function setupEnvironment(): EnvironmentInfo {
  console.log('🔧 [environment.ts] Setting up environment...');
  
  const platform = detectPlatform();
  console.log(`📍 [environment.ts] Detected platform: ${platform}`);
  
  let hasEnvFile = false;
  if (platform === 'local') {
    hasEnvFile = loadLocalEnvFile();
  }
  
  const databaseUrl = getDatabaseUrl(platform);
  const sessionSecret = getSessionSecret(platform);
  
  validateEnvironment(databaseUrl, platform); // This will throw if DATABASE_URL is missing
  
  const info: EnvironmentInfo = {
    platform,
    hasEnvFile,
    databaseUrl,
    sessionSecret,
  };
  
  console.log('✅ [environment.ts] Environment setup complete:', {
    platform: info.platform,
    hasEnvFile: info.hasEnvFile,
    hasDatabaseUrl: !!info.databaseUrl,
    hasSessionSecret: !!info.sessionSecret,
  });
  
  return info;
}

function detectPlatform(): EnvironmentInfo['platform'] {
  if (process.env.REPL_ID || process.env.REPLIT_DB_URL) {
    return 'replit';
  }
  if (process.env.VERCEL) {
    return 'vercel';
  }
  if (process.env.RAILWAY_ENVIRONMENT) {
    return 'railway';
  }
  // If NODE_ENV is explicitly production but no platform detected, assume generic production
  if (process.env.NODE_ENV === 'production') {
    return 'unknown'; // Or 'production-generic'
  }
  return 'local';
}

function loadLocalEnvFile(): boolean {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'), // Common alternative
    // path.resolve(__dirname, '../../.env'), // This path might be if environment.ts is in server/lib/
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📄 [environment.ts] Loading .env file from: ${envPath}`);
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        console.warn(`⚠️  [environment.ts] Error loading .env file from ${envPath}: ${result.error.message}`);
        // continue to try other paths if preferred, or return false
      } else {
        console.log(`✅ [environment.ts] Loaded ${Object.keys(result.parsed || {}).length} variables from ${envPath}`);
        return true; // Successfully loaded an .env file
      }
    }
  }
  
  console.log('📄 [environment.ts] No .env file found in standard local paths.');
  return false;
}

function getDatabaseUrl(platform: EnvironmentInfo['platform']): string | null {
  const possibleNames = [
    'DATABASE_URL',
    'NEON_DATABASE_URL', 
    'POSTGRES_URL',
    'DB_URL',
  ];
  
  for (const name of possibleNames) {
    const value = process.env[name];
    if (value) {
      console.log(`🗄️  [environment.ts] Found database URL in env var: ${name}`);
      return value;
    }
  }
  console.warn('🗄️  [environment.ts] No database URL found in common environment variables.');
  return null;
}

function getSessionSecret(platform: EnvironmentInfo['platform']): string | null {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  
  if (!secret && platform === 'local') {
    console.warn('⚠️  [environment.ts] SESSION_SECRET not set, will use development fallback. SET THIS FOR PRODUCTION!');
    return 'dev-fallback-secret-please-change-in-production'; // More descriptive fallback
  }
  if (secret) {
      console.log('🔑 [environment.ts] SESSION_SECRET found.')
  } else {
      console.warn('🔑 [environment.ts] SESSION_SECRET not found.')
  }
  return secret || null;
}

function validateEnvironment(databaseUrl: string | null, platform: EnvironmentInfo['platform']) {
  if (!databaseUrl) {
    const errorMessage = createDatabaseUrlErrorMessage(platform);
    console.error(errorMessage); // Log the detailed message
    // The error thrown should be generic enough for the top-level catch in server/index.ts if setupEnvironment fails
    throw new Error(`DATABASE_URL is missing. ${getSetupInstructions(platform)}`);
  }
  
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string (e.g., postgresql://...)');
  }
}

function createDatabaseUrlErrorMessage(platform: EnvironmentInfo['platform']): string {
  const baseMessage = '❌ CRITICAL ERROR: DATABASE_URL is not set in environment.\n';
  // ... (same content as user provided for this function)
  switch (platform) {
    case 'local':
      return baseMessage + `
For local development:
1. Create a .env file in your project root: ${process.cwd()}/.env
2. Add this line: DATABASE_URL="postgresql://user:password@host:port/database"
3. Get your Neon connection string from: https://neon.tech/
4. Restart your development server
`;
    case 'replit':
      return baseMessage + `
For Replit:
1. Click the lock icon (🔒) in the left sidebar to open Secrets
2. Add a new secret with key: DATABASE_URL  
3. Paste your Neon PostgreSQL connection string as the value
4. Restart your Repl
`;
    default:
      return baseMessage + `
For ${platform} deployment:
1. Set DATABASE_URL in your deployment environment variables
2. Use your Neon PostgreSQL connection string
3. Redeploy your application
`;
  }
}

function getSetupInstructions(platform: EnvironmentInfo['platform']): string {
  // ... (same content as user provided for this function)
  switch (platform) {
    case 'replit':
      return 'Please add the DATABASE_URL secret in the Deployments tab.';
    case 'local':
      return 'Please create a .env file with DATABASE_URL.';
    default:
      return 'Please set DATABASE_URL in your environment variables.';
  }
} 