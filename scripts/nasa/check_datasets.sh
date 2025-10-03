#!/bin/bash

echo "🔍 Checking NASA datasets..."
echo ""

# Check SMAP
echo "📡 SMAP Data:"
if [ -d "data/smap/raw" ]; then
    file_count=$(find data/smap/raw -type f | wc -l)
    echo "   Files: $file_count"
    if [ -f "data/smap/raw/smap_granules.json" ]; then
        echo "   ✅ Metadata found"
    elif [ -f "data/smap/raw/smap_metadata.json" ]; then
        echo "   ⚠️  No granules (using fallback)"
    else
        echo "   ❌ No data"
    fi
else
    echo "   ❌ Directory not found"
fi
echo ""

# Check MODIS
echo "🌿 MODIS Data:"
if [ -d "data/modis/raw" ]; then
    file_count=$(find data/modis/raw -type f | wc -l)
    echo "   Files: $file_count"
    if [ -f "data/modis/raw/modis_task.json" ]; then
        echo "   ⏳ Task submitted (check status)"
    elif [ -f "data/modis/raw/modis_metadata.json" ]; then
        echo "   ⚠️  Metadata only (using fallback)"
    else
        echo "   ❌ No data"
    fi
else
    echo "   ❌ Directory not found"
fi
echo ""

# Check IMERG
echo "🌧️  IMERG Data:"
if [ -d "data/imerg/raw" ]; then
    file_count=$(find data/imerg/raw -type f | wc -l)
    echo "   Files: $file_count"
    if [ -f "data/imerg/raw/imerg_metadata.json" ]; then
        granules=$(grep -o '"granules_found":[0-9]*' data/imerg/raw/imerg_metadata.json | cut -d: -f2)
        if [ -n "$granules" ] && [ "$granules" -gt 0 ]; then
            echo "   ✅ Found $granules granules"
        else
            echo "   ⚠️  No granules (using fallback)"
        fi
    else
        echo "   ❌ No data"
    fi
else
    echo "   ❌ Directory not found"
fi
echo ""

# Check processed data
echo "📊 Processed Data:"
if [ -f "data/processed/merged_features.csv" ]; then
    lines=$(wc -l < data/processed/merged_features.csv)
    echo "   ✅ Merged features: $lines rows"
else
    echo "   ❌ Not processed yet (run: npm run nasa:preprocess)"
fi
echo ""

# Check models
echo "🤖 ML Models:"
if [ -f "models/rf_soil_moisture.pkl" ]; then
    size=$(du -h models/rf_soil_moisture.pkl | cut -f1)
    echo "   ✅ RandomForest model: $size"
else
    echo "   ❌ Not trained yet (run: npm run nasa:train)"
fi
echo ""

echo "📋 Summary:"
echo "   To download data: npm run nasa:download"
echo "   To preprocess:    npm run nasa:preprocess"
echo "   To train model:   npm run nasa:train"
