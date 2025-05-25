// scripts/verify-env.ts - Environment verification script

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

console.log('🔍 Environment Verification Script');
console.log('================================');

// Check current working directory
console.log('📁 Current working directory:', process.cwd());

// Check for .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('📄 Looking for .env file at:', envPath);
console.log('📄 .env file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log('\n📖 .env file contents preview:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim());
  
  lines.forEach((line, index) => {
    if (line.toUpperCase().includes('DATABASE_URL')) { // Make check case-insensitive for key
      // Mask the actual URL for security
      const parts = line.split('=');
      const maskedLine = parts.length > 1 ? `${parts[0]}=${parts[0].includes('PASSWORD') || parts[0].includes('SECRET') || parts[0].includes('KEY') ? '***[MASKED]***' : parts[1].substring(0,20) + '***[MASKED]***'}` : line;
      console.log(`   Line ${index + 1}: ${maskedLine}`);
    } else if (line.toUpperCase().includes('SECRET') || line.toUpperCase().includes('KEY') || line.toUpperCase().includes('PASSWORD')) {
      const parts = line.split('=');
      const maskedLine = parts.length > 1 ? `${parts[0]}=***[MASKED]***` : line;
      console.log(`   Line ${index + 1}: ${maskedLine}`);
    } else {
      console.log(`   Line ${index + 1}: ${line}`);
    }
  });
} else {
  console.log('\n❌ .env file not found!');
  console.log('\nTo create .env file:');
  console.log(`1. Create file: ${envPath}`);
  console.log('2. Add line: DATABASE_URL="your_neon_connection_string"');
  console.log('3. Save the file');
}

// Test dotenv loading
console.log('\n🔧 Testing dotenv loading...');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('❌ dotenv loading failed:', result.error.message);
} else {
  console.log('✅ dotenv loading successful');
  console.log('📝 Variables loaded by dotenv (keys only):', Object.keys(result.parsed || {}));
}

// Check environment variables actually available on process.env
console.log('\n🌍 Environment Variables Check (from process.env):');
console.log('DATABASE_URL present on process.env:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL prefix on process.env:', process.env.DATABASE_URL?.substring(0, 20) + '...' || 'NOT SET');
console.log('NODE_ENV on process.env:', process.env.NODE_ENV || 'not set');
console.log('SESSION_SECRET present on process.env:', !!process.env.SESSION_SECRET);

// Platform detection (using a simplified version, or you could import from your environment.ts)
console.log('\n🖥️  Platform Detection (basic check):');
if (process.env.REPL_ID) console.log('Platform detected: Replit (REPL_ID is set)');
else if (process.env.VERCEL) console.log('Platform detected: Vercel (VERCEL is set)');
else if (process.env.RAILWAY_ENVIRONMENT) console.log('Platform detected: Railway (RAILWAY_ENVIRONMENT is set)');
else if (process.env.NODE_ENV === 'production') console.log('Platform detected: Production (NODE_ENV=production)');
else console.log('Platform detected: Likely Local (no specific platform env vars found)');

// Connection string validation
if (process.env.DATABASE_URL) {
  console.log('\n🔗 Database URL Validation:');
  const url = process.env.DATABASE_URL;
  console.log('✅ DATABASE_URL is set on process.env');
  console.log('Format check (postgres:// or postgresql://):', url.startsWith('postgres://') || url.startsWith('postgresql://'));
  console.log('Contains @ (for user:pass@host):', url.includes('@'));
  console.log('Contains database name (heuristic):', url.split('@').pop()?.includes('/') || false);
} else {
  console.log('\n❌ DATABASE_URL validation failed: not set on process.env');
}

console.log('\n================================');
console.log('Verification complete!');

// Exit codes for automation
if (!process.env.DATABASE_URL) {
  console.log('\n❌ Critical: DATABASE_URL not found in process.env');
  process.exit(1);
} else {
  console.log('\n✅ All critical environment variables seem to be in order.');
  process.exit(0);
} 