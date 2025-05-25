// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node', // Important for backend tests
    globals: true, // To use describe, it, expect, etc. globally
    setupFiles: ['./server/tests/setup.ts'], // Path to your setup file
    // You might want to include a test timeout if API calls are slow in integration tests
    // testTimeout: 10000, 
  },
  resolve: {
    alias: {
      // Alias to match your tsconfig.json paths for consistent imports
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './server'), // Assuming '@' maps to './server' for backend tests
      // Add other aliases if needed, e.g., for client if testing client code with Vitest
    }
  }
}); 