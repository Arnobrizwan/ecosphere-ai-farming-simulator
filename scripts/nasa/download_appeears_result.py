#!/usr/bin/env python3
"""
Download completed AppEEARS request results
"""

import os
import sys
import requests
import zipfile
import json

# Your AppEEARS request details
REQUEST_ID = "da064aa4-c3e7-4952-ac02-2e3b6b92b663"
REQUEST_NAME = "mod13q1_23.81_90.41_20250701_20250930"
DOWNLOAD_URL = f"https://appeears.earthdatacloud.nasa.gov/download/{REQUEST_ID}"

OUTPUT_DIR = "data/modis/raw"

def get_earthdata_token():
    """Read token from .env file"""
    token = os.getenv('NASA_EARTHDATA_TOKEN') or os.getenv('EXPO_PUBLIC_NASA_EARTHDATA_TOKEN')
    if not token:
        print("❌ NASA_EARTHDATA_TOKEN not found in environment")
        sys.exit(1)
    return token

def download_appeears_results():
    """Download the completed AppEEARS request"""
    token = get_earthdata_token()
    
    print(f"🌿 Downloading MODIS NDVI data from AppEEARS...")
    print(f"📦 Request ID: {REQUEST_ID}")
    print(f"📅 Date range: 2025-07-01 to 2025-09-30")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Download the bundle
    zip_file = f"{OUTPUT_DIR}/{REQUEST_NAME}.zip"
    
    try:
        # AppEEARS requires session-based authentication
        session = requests.Session()
        
        # First, authenticate with Earthdata
        print("🔐 Authenticating with NASA Earthdata...")
        auth_url = "https://urs.earthdata.nasa.gov/oauth/authorize"
        
        # Use the download URL directly with Bearer token
        headers = {
            'Authorization': f'Bearer {token}',
            'User-Agent': 'EcosphereApp/1.0'
        }
        
        print(f"📥 Downloading from: {DOWNLOAD_URL}")
        response = session.get(DOWNLOAD_URL, headers=headers, stream=True, timeout=300, allow_redirects=True)
        
        if response.status_code == 200:
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(zip_file, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"\r   Progress: {percent:.1f}% ({downloaded}/{total_size} bytes)", end='')
            
            print(f"\n✅ Downloaded: {zip_file}")
            
            # Extract the zip file
            print("📂 Extracting files...")
            extract_dir = f"{OUTPUT_DIR}/{REQUEST_NAME}"
            os.makedirs(extract_dir, exist_ok=True)
            
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            print(f"✅ Extracted to: {extract_dir}")
            
            # List extracted files
            files = os.listdir(extract_dir)
            print(f"\n📋 Extracted files ({len(files)}):")
            for f in files[:10]:  # Show first 10
                print(f"   - {f}")
            if len(files) > 10:
                print(f"   ... and {len(files) - 10} more files")
            
            # Create metadata
            metadata = {
                'request_id': REQUEST_ID,
                'request_name': REQUEST_NAME,
                'date_range': {
                    'start': '2025-07-01',
                    'end': '2025-09-30'
                },
                'layers': ['_250m_16_days_NDVI'],
                'product': 'MOD13Q1.061',
                'location': {'lat': 23.81, 'lon': 90.41},
                'files_count': len(files),
                'download_date': '2025-10-03',
                'status': 'success',
                'extract_dir': extract_dir
            }
            
            with open(f'{OUTPUT_DIR}/modis_metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print(f"\n✅ MODIS NDVI data ready!")
            print(f"   Location: {extract_dir}")
            
        else:
            print(f"\n❌ Download failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    download_appeears_results()
