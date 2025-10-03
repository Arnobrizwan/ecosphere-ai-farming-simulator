#!/usr/bin/env python3
"""
Download IMERG precipitation data via GES DISC
"""

import os
import sys
import requests
import json
from datetime import datetime, timedelta

# Configuration
GES_DISC_API = "https://disc.gsfc.nasa.gov/api"
OUTPUT_DIR = "data/imerg/raw"

# Bangladesh coordinates (Dhaka)
LAT = 23.8103
LON = 90.4125

# Date range: last 30 days
end_date = datetime.now()
start_date = end_date - timedelta(days=30)

def get_earthdata_token():
    """Read token from .env file"""
    token = os.getenv('NASA_EARTHDATA_TOKEN') or os.getenv('EXPO_PUBLIC_NASA_EARTHDATA_TOKEN')
    if not token:
        print("❌ NASA_EARTHDATA_TOKEN not found in environment")
        sys.exit(1)
    return token

def download_imerg_data():
    """Download IMERG precipitation data"""
    token = get_earthdata_token()
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    print("🌧️  Searching for IMERG precipitation data...")
    print(f"📍 Location: {LAT}, {LON}")
    print(f"📅 Date range: {start_date.date()} to {end_date.date()}")
    
    # Build bounding box
    bbox = {
        'west': LON - 0.1,
        'south': LAT - 0.1,
        'east': LON + 0.1,
        'north': LAT + 0.1
    }
    
    # Search for IMERG Early Run granules
    search_url = f"{GES_DISC_API}/search"
    
    params = {
        'dataset': 'GPM_3IMERGHHE.07',
        'bbox': f"{bbox['west']},{bbox['south']},{bbox['east']},{bbox['north']}",
        'start': start_date.strftime('%Y%m%dT000000'),
        'end': end_date.strftime('%Y%m%dT235959'),
        'format': 'json'
    }
    
    try:
        response = requests.get(search_url, params=params, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            
            print(f"✅ Found {len(results)} IMERG granules")
            
            if len(results) > 0:
                # Save granule metadata
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                
                metadata = {
                    'dataset': 'GPM_3IMERGHHE.07',
                    'location': {'lat': LAT, 'lon': LON},
                    'bbox': bbox,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': end_date.isoformat()
                    },
                    'granules_found': len(results),
                    'granules': results[:10]  # Save first 10
                }
                
                with open(f'{OUTPUT_DIR}/imerg_metadata.json', 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                print(f"💾 Saved metadata to {OUTPUT_DIR}/imerg_metadata.json")
                
                # Extract precipitation values (simplified)
                precip_data = []
                for granule in results[:10]:
                    precip_data.append({
                        'id': granule.get('id'),
                        'time': granule.get('time_start'),
                        'precipitation': 'See granule for actual values'
                    })
                
                with open(f'{OUTPUT_DIR}/imerg_precip.json', 'w') as f:
                    json.dump(precip_data, f, indent=2)
                
            else:
                print("⚠️  No IMERG data available")
                create_fallback_metadata()
                
        else:
            print(f"❌ GES DISC API error: {response.status_code}")
            print(response.text)
            create_fallback_metadata()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        create_fallback_metadata()

def create_fallback_metadata():
    """Create fallback metadata when download fails"""
    print("⚠️  Creating fallback metadata...")
    
    fallback_data = {
        'dataset': 'GPM_3IMERGHHE.07',
        'location': {'lat': LAT, 'lon': LON},
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        },
        'status': 'no_data',
        'note': 'No IMERG data available - using NASA POWER fallback in app'
    }
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(f'{OUTPUT_DIR}/imerg_metadata.json', 'w') as f:
        json.dump(fallback_data, f, indent=2)

if __name__ == '__main__':
    download_imerg_data()
