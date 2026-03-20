import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../..');

const envPaths = [
  path.join(repoRoot, '.env.local'),
  path.join(repoRoot, '.env'),
];

export function loadEnvironment(): string[] {
  const loadedPaths: string[] = [];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    dotenv.config({ path: envPath });
    loadedPaths.push(envPath);
  }

  return loadedPaths;
}

loadEnvironment();
