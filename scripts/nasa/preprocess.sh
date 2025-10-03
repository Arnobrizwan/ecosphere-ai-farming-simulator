#!/bin/bash
set -e

echo "📊 Preprocessing NASA datasets..."

# Activate virtual environment
source .venv/bin/activate

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Run preprocessing
python3 scripts/nasa/preprocess_data.py

echo "✅ Preprocessing complete!"
