#!/bin/bash

# Robust script to run the backend stress test
# Handles environment variable loading and path issues

# 1. Load absolute paths for common tools
NODE_PATHS="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export PATH="$NODE_PATHS:$PATH"

# 2. Find node
NODE_BIN=$(which node)
if [ -z "$NODE_BIN" ]; then
    echo "Error: node not found in $NODE_PATHS"
    exit 1
fi

# 3. Load .env if it exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    echo "Loaded environment from .env"
else
    echo "Warning: .env file not found"
fi

# 4. Run the test using tsx
echo "Running stress test with $NODE_BIN..."
$NODE_BIN node_modules/.bin/tsx server/scripts/stress-test.ts
