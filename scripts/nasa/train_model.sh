#!/bin/bash
set -e

echo "🤖 Training ML model..."

# Activate virtual environment
source .venv/bin/activate

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Run training
python3 scripts/nasa/train_model.py

echo "✅ Training complete!"
