#!/usr/bin/env python3
"""
Download MODIS NDVI data via AppEEARS API
"""

import os
import sys
import requests
import time
import json
from datetime import datetime, timedelta

# Configuration
APPEEARS_API = "https://appeears.earthdatacloud.nasa.gov/api"
OUTPUT_DIR = "data/modis/raw"

# Bangladesh region (Dhaka area)
REGION = {
    "type": "Polygon",
    "coordinates": [[
        [90.3, 23.7],
        [90.5, 23.7],
        [90.5, 23.9],
        [90.3, 23.9],
        [90.3, 23.7]
    ]]
}

# Date range: last 6 months
end_date = datetime.now()
start_date = end_date - timedelta(days=180)

def get_earthdata_token():
    """Read token from .env file"""
    token = os.getenv('NASA_EARTHDATA_TOKEN') or os.getenv('EXPO_PUBLIC_NASA_EARTHDATA_TOKEN')
    if not token:
        print("❌ NASA_EARTHDATA_TOKEN not found in environment")
        sys.exit(1)
    return token

def download_modis_ndvi():
    """Submit AppEEARS request for MODIS NDVI"""
    token = get_earthdata_token()
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Create task request
    task_data = {
        "task_type": "area",
        "task_name": f"ecosphere_modis_{int(time.time())}",
        "params": {
            "dates": [
                {
                    "startDate": start_date.strftime("%m-%d-%Y"),
                    "endDate": end_date.strftime("%m-%d-%Y")
                }
            ],
            "layers": [
                {
                    "product": "MOD13Q1.061",
                    "layer": "_250m_16_days_NDVI"
                },
                {
                    "product": "MOD13Q1.061",
                    "layer": "_250m_16_days_EVI"
                }
            ],
            "output": {
                "format": {
                    "type": "geotiff"
                },
                "projection": "geographic"
            },
            "geo": REGION
        }
    }
    
    print("🌿 Submitting MODIS NDVI request to AppEEARS...")
    print(f"📅 Date range: {start_date.date()} to {end_date.date()}")
    
    try:
        # Submit task
        response = requests.post(
            f"{APPEEARS_API}/task",
            headers=headers,
            json=task_data,
            timeout=30
        )
        
        if response.status_code == 202:
            task_info = response.json()
            task_id = task_info.get('task_id')
            print(f"✅ Task submitted: {task_id}")
            print(f"   Status URL: {APPEEARS_API}/task/{task_id}")
            
            # Save task info
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            with open(f'{OUTPUT_DIR}/modis_task.json', 'w') as f:
                json.dump(task_info, f, indent=2)
            
            print("\n⏳ Task is processing...")
            print("   This may take 10-30 minutes.")
            print("   Run 'npm run nasa:check' to check status")
            
        else:
            print(f"❌ AppEEARS API error: {response.status_code}")
            print(response.text)
            
            # Create fallback metadata
            print("\n⚠️  Creating fallback metadata...")
            fallback_data = {
                'dataset': 'MOD13Q1.061',
                'layers': ['NDVI', 'EVI'],
                'region': REGION,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'status': 'failed',
                'note': 'AppEEARS request failed - using simulated NDVI in app'
            }
            
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            with open(f'{OUTPUT_DIR}/modis_metadata.json', 'w') as f:
                json.dump(fallback_data, f, indent=2)
                
    except Exception as e:
        print(f"❌ Error: {e}")
        
        # Create fallback metadata
        fallback_data = {
            'dataset': 'MOD13Q1.061',
            'error': str(e),
            'note': 'Download failed - using simulated NDVI in app'
        }
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(f'{OUTPUT_DIR}/modis_metadata.json', 'w') as f:
            json.dump(fallback_data, f, indent=2)

if __name__ == '__main__':
    download_modis_ndvi()
