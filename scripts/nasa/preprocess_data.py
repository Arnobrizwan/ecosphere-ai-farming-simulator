#!/usr/bin/env python3
"""
Preprocess NASA datasets and merge into features
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Directories
SMAP_DIR = "data/smap/raw"
MODIS_DIR = "data/modis/raw"
IMERG_DIR = "data/imerg/raw"
LANDSAT_DIR = "data/landsat/raw"
OUTPUT_DIR = "data/processed"

def load_smap_data():
    """Load SMAP soil moisture metadata"""
    print("📡 Loading SMAP data...")
    
    metadata_file = f"{SMAP_DIR}/smap_metadata.json"
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        # Create synthetic time series based on metadata
        dates = pd.date_range(start='2025-07-01', end='2025-10-03', freq='D')
        
        # Simulate soil moisture values (realistic range)
        soil_moisture = 0.25 + 0.15 * np.random.random(len(dates))
        
        df = pd.DataFrame({
            'date': dates,
            'soil_moisture': soil_moisture,
            'source': 'simulated'
        })
        
        print(f"   ✅ Loaded {len(df)} days of SMAP data (simulated)")
        return df
    else:
        print("   ⚠️  No SMAP data found")
        return pd.DataFrame()

def load_modis_data():
    """Load MODIS NDVI data"""
    print("🌿 Loading MODIS data...")
    
    metadata_file = f"{MODIS_DIR}/modis_metadata.json"
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        # Create synthetic NDVI time series
        dates = pd.date_range(start='2025-07-01', end='2025-10-03', freq='16D')  # 16-day intervals
        
        # Simulate NDVI values (0.3 to 0.9 for vegetation)
        ndvi = 0.5 + 0.3 * np.random.random(len(dates))
        
        df = pd.DataFrame({
            'date': dates,
            'ndvi': ndvi,
            'source': 'simulated'
        })
        
        print(f"   ✅ Loaded {len(df)} MODIS observations (simulated)")
        return df
    else:
        print("   ⚠️  No MODIS data found")
        return pd.DataFrame()

def load_imerg_data():
    """Load IMERG precipitation data"""
    print("🌧️  Loading IMERG data...")
    
    metadata_file = f"{IMERG_DIR}/imerg_metadata.json"
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        # Create synthetic precipitation time series
        dates = pd.date_range(start='2025-07-01', end='2025-10-03', freq='D')
        
        # Simulate precipitation (0-50 mm/day)
        precipitation = 15 * np.random.random(len(dates))
        
        df = pd.DataFrame({
            'date': dates,
            'precipitation': precipitation,
            'source': 'simulated'
        })
        
        print(f"   ✅ Loaded {len(df)} days of IMERG data (simulated)")
        return df
    else:
        print("   ⚠️  No IMERG data found")
        return pd.DataFrame()

def load_landsat_data():
    """Load Landsat NDVI data"""
    print("🛰️  Loading Landsat data...")
    
    # Check for NDVI time series
    ndvi_file = f"{LANDSAT_DIR}/landsat_ndvi.json"
    if os.path.exists(ndvi_file):
        with open(ndvi_file, 'r') as f:
            ndvi_data = json.load(f)
        
        if len(ndvi_data) > 0:
            df = pd.DataFrame(ndvi_data)
            df['date'] = pd.to_datetime(df['date'])
            
            print(f"   ✅ Loaded {len(df)} Landsat observations")
            return df
    
    # Fallback: check metadata
    metadata_file = f"{LANDSAT_DIR}/landsat_metadata.json"
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        # Create synthetic Landsat NDVI (16-day intervals)
        dates = pd.date_range(start='2025-07-01', end='2025-10-03', freq='16D')
        
        # Simulate NDVI values (0.4 to 0.8 for cropland)
        landsat_ndvi = 0.5 + 0.25 * np.random.random(len(dates))
        
        df = pd.DataFrame({
            'date': dates,
            'landsat_ndvi': landsat_ndvi,
            'cloud_cover': np.random.uniform(5, 25, len(dates)),
            'source': 'simulated'
        })
        
        print(f"   ✅ Loaded {len(df)} Landsat observations (simulated)")
        return df
    else:
        print("   ⚠️  No Landsat data found")
        return pd.DataFrame()

def merge_datasets():
    print("\n🔗 Merging datasets...")

    # Load all datasets
    smap_df = load_smap_data()
    modis_df = load_modis_data()
    imerg_df = load_imerg_data()
    landsat_df = load_landsat_data()

    if smap_df.empty and modis_df.empty and imerg_df.empty and landsat_df.empty:
        print("❌ No data to merge!")
        return None

    # Start with SMAP daily data or create placeholder date range
    if not smap_df.empty:
        merged = smap_df.copy()
    else:
        dates = pd.date_range(start='2025-07-01', end='2025-10-03', freq='D')
        merged = pd.DataFrame({'date': dates})

    # Ensure date column is datetime
    merged['date'] = pd.to_datetime(merged['date'])

    # Merge MODIS NDVI (16-day cadence, forward fill)
    if not modis_df.empty:
        modis_df = modis_df.copy()
        modis_df['date'] = pd.to_datetime(modis_df['date'])
        merged = merged.merge(modis_df[['date', 'ndvi']], on='date', how='left')
        merged['ndvi'] = merged['ndvi'].ffill()

    # Merge Landsat NDVI / cloud cover (16-day cadence)
    if not landsat_df.empty:
        landsat_df = landsat_df.copy()
        landsat_df['date'] = pd.to_datetime(landsat_df['date'])
        columns = ['date']
        if 'landsat_ndvi' in landsat_df.columns:
            columns.append('landsat_ndvi')
        if 'cloud_cover' in landsat_df.columns:
            columns.append('cloud_cover')
        merged = merged.merge(landsat_df[columns], on='date', how='left')
        if 'landsat_ndvi' in merged.columns:
            merged['landsat_ndvi'] = merged['landsat_ndvi'].ffill()
        if 'cloud_cover' in merged.columns:
            merged['landsat_cloud_cover'] = merged.pop('cloud_cover')

    # Merge IMERG precipitation
    if not imerg_df.empty:
        imerg_df = imerg_df.copy()
        imerg_df['date'] = pd.to_datetime(imerg_df['date'])
        merged = merged.merge(imerg_df[['date', 'precipitation']], on='date', how='left')

    # Derived features
    merged['day_of_year'] = merged['date'].dt.dayofyear
    merged['month'] = merged['date'].dt.month

    if 'soil_moisture' in merged.columns:
        merged['soil_moisture_7d_avg'] = merged['soil_moisture'].rolling(7, min_periods=1).mean()

    if 'precipitation' in merged.columns:
        merged['precip_7d_sum'] = merged['precipitation'].rolling(7, min_periods=1).sum()

    if 'landsat_ndvi' in merged.columns and 'ndvi' in merged.columns:
        merged['combined_ndvi'] = merged[['landsat_ndvi', 'ndvi']].mean(axis=1, skipna=True)
    elif 'landsat_ndvi' in merged.columns:
        merged['combined_ndvi'] = merged['landsat_ndvi']
    elif 'ndvi' in merged.columns:
        merged['combined_ndvi'] = merged['ndvi']

    merged = merged.dropna(thresh=len(merged.columns) - 2)

    print(f"✅ Merged dataset: {len(merged)} rows, {len(merged.columns)} columns")
    print(f"   Columns: {list(merged.columns)}")
    return merged

def save_processed_data(df):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    output_file = f"{OUTPUT_DIR}/merged_features.csv"
    df.to_csv(output_file, index=False)
    
    print(f"\n💾 Saved to: {output_file}")
    
    # Save summary statistics
    summary = {
        'rows': len(df),
        'columns': list(df.columns),
        'date_range': {
            'start': df['date'].min().isoformat(),
            'end': df['date'].max().isoformat()
        },
        'statistics': df.describe().to_dict()
    }
    
    summary_file = f"{OUTPUT_DIR}/data_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    print(f"📊 Summary saved to: {summary_file}")
    
    # Print preview
    print("\n📋 Data preview:")
    print(df.head(10))
    
    print("\n📈 Statistics:")
    print(df.describe())

def main():
    print("=" * 60)
    print("NASA Data Preprocessing Pipeline")
    print("=" * 60)
    print()
    
    # Merge datasets
    merged_df = merge_datasets()
    
    if merged_df is not None and not merged_df.empty:
        # Save processed data
        save_processed_data(merged_df)
        print("\n✅ Preprocessing complete!")
    else:
        print("\n❌ No data to process")

if __name__ == '__main__':
    main()
