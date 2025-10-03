#!/bin/bash
set -e

echo "🚀 Setting up NASA data processing environment..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv .venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install required packages
echo "📚 Installing required Python packages..."
pip install numpy pandas xarray netCDF4 h5py scikit-learn joblib requests

# Optional: TensorFlow and PyTorch (commented out due to size)
# pip install tensorflow torch

echo "✅ Environment setup complete!"
echo ""
echo "To activate the environment manually, run:"
echo "  source .venv/bin/activate"
