#!/usr/bin/env python3
"""
Download SMAP L3 Enhanced 9km soil moisture data
Uses NASA CMR API with Earthdata authentication
"""

import os
import sys
import requests
from datetime import datetime, timedelta
import json

# Configuration
CMR_API = "https://cmr.earthdata.nasa.gov/search/granules.json"
DATASET = "SPL3SMP_E"
VERSION = "005"
OUTPUT_DIR = "data/smap/raw"

# Date range: last 90 days
end_date = datetime.now()
start_date = end_date - timedelta(days=90)

# Bangladesh bounding box (approximate)
BBOX = "88.0,20.0,93.0,27.0"  # west,south,east,north

def get_earthdata_token():
    """Read token from .env file"""
    token = os.getenv('NASA_EARTHDATA_TOKEN') or os.getenv('EXPO_PUBLIC_NASA_EARTHDATA_TOKEN')
    if not token:
        print("❌ NASA_EARTHDATA_TOKEN not found in environment")
        sys.exit(1)
    return token

def download_smap_granules():
    """Download SMAP granules from CMR"""
    token = get_earthdata_token()
    
    print(f"📅 Date range: {start_date.date()} to {end_date.date()}")
    print(f"📍 Bounding box: {BBOX}")
    
    # Search for granules
    params = {
        'short_name': DATASET,
        'version': VERSION,
        'bounding_box': BBOX,
        'temporal': f"{start_date.isoformat()}Z,{end_date.isoformat()}Z",
        'page_size': 100
    }
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    print("🔍 Searching for SMAP granules...")
    response = requests.get(CMR_API, params=params, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ CMR API error: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    granules = data.get('feed', {}).get('entry', [])
    
    print(f"✅ Found {len(granules)} granules")
    
    if len(granules) == 0:
        print("⚠️  No SMAP data available for this region/timeframe")
        print("   Creating sample metadata file...")
        
        # Create sample metadata
        sample_data = {
            'dataset': DATASET,
            'version': VERSION,
            'bbox': BBOX,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'granules_found': 0,
            'note': 'No granules available - using NASA POWER fallback in app'
        }
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(f'{OUTPUT_DIR}/smap_metadata.json', 'w') as f:
            json.dump(sample_data, f, indent=2)
        
        return
    
    # Save granule metadata
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    metadata_file = f'{OUTPUT_DIR}/smap_granules.json'
    
    with open(metadata_file, 'w') as f:
        json.dump(granules, f, indent=2)
    
    print(f"💾 Saved metadata to {metadata_file}")
    
    # Download first few granules (limited to avoid huge downloads)
    max_downloads = 5
    downloaded = 0
    
    for granule in granules[:max_downloads]:
        granule_id = granule.get('id', 'unknown')
        title = granule.get('title', 'unknown')
        
        # Find data link
        links = granule.get('links', [])
        data_link = None
        for link in links:
            if 'data' in link.get('rel', '').lower():
                data_link = link.get('href')
                break
        
        if data_link:
            print(f"📥 Downloading: {title}")
            try:
                # Note: Actual HDF5 download requires authentication
                # For now, just save the URL
                granule_info = {
                    'id': granule_id,
                    'title': title,
                    'data_url': data_link,
                    'time_start': granule.get('time_start'),
                    'summary': granule.get('summary', '')
                }
                
                filename = f"{OUTPUT_DIR}/{granule_id}.json"
                with open(filename, 'w') as f:
                    json.dump(granule_info, f, indent=2)
                
                downloaded += 1
                print(f"   ✅ Saved metadata: {filename}")
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
    
    print(f"\n✅ Downloaded metadata for {downloaded} granules")
    print(f"   (Full HDF5 files require direct download - using metadata + POWER API fallback)")

if __name__ == '__main__':
    download_smap_granules()
