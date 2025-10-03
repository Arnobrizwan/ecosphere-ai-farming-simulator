#!/bin/bash
set -e

echo "🛰️  Downloading NASA datasets..."

# Check if .netrc exists
if [ ! -f ~/.netrc ]; then
    echo "❌ ~/.netrc not found!"
    echo ""
    echo "Please create ~/.netrc with your NASA Earthdata credentials:"
    echo ""
    echo "machine urs.earthdata.nasa.gov"
    echo "login YOUR_EARTHDATA_USERNAME"
    echo "password YOUR_EARTHDATA_PASSWORD"
    echo ""
    echo "Then run: chmod 600 ~/.netrc"
    exit 1
fi

# Create data directories
mkdir -p data/smap/raw data/modis/raw data/imerg/raw

# Read credentials from .env
source .env

# Activate virtual environment
source .venv/bin/activate

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📡 Downloading SMAP L3 9km data..."
# SMAP: Try CMR API for recent data
python3 scripts/nasa/download_smap.py

echo "🌿 Downloading MODIS NDVI data via AppEEARS..."
# MODIS: Use AppEEARS API
python3 scripts/nasa/download_modis.py

echo "🌧️  Downloading IMERG precipitation data..."
# IMERG: Use GES DISC subset service
python3 scripts/nasa/download_imerg.py

echo "🛰️  Downloading Landsat data..."
# Landsat: Use CMR API
python3 scripts/nasa/download_landsat.py

echo "✅ All datasets downloaded!"
echo ""
echo "Downloaded files:"
ls -lh data/smap/raw/ 2>/dev/null || echo "  No SMAP files"
ls -lh data/modis/raw/ 2>/dev/null || echo "  No MODIS files"
ls -lh data/imerg/raw/ 2>/dev/null || echo "  No IMERG files"
ls -lh data/landsat/raw/ 2>/dev/null || echo "  No Landsat files"
