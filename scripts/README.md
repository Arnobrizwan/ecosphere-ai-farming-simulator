# NASA Earthdata Scripts

POSIX-compatible shell scripts for fetching remote sensing and climate data from NASA APIs.

## Requirements

- `bash` (POSIX-compatible)
- `curl` (with netrc support)
- `jq` (JSON parsing)
- `unzip` (for AppEEARS downloads)

Install on macOS:
```bash
brew install jq
```

Install on Ubuntu/Debian:
```bash
sudo apt-get install jq unzip curl
```

## Setup

### 1. NASA Earthdata Account

Register for a free account at: https://urs.earthdata.nasa.gov/users/new

### 2. Configure Credentials

Copy the template and add your credentials:
```bash
cp .env.template .env
nano .env  # Edit with your credentials
```

### 3. Setup Authentication

Run the setup script to configure `~/.netrc`:
```bash
chmod +x scripts/setup_earthdata.sh
./scripts/setup_earthdata.sh
```

This creates/updates `~/.netrc` with proper permissions (600).

## Data Sources Overview

| Dataset | Source | Auth | Temporal | Spatial | Use Case |
|---------|--------|------|----------|---------|----------|
| **POWER** | NASA LaRC | None | Daily | Point | UC13, UC19 - Climate data |
| **GIBS** | NASA EOSDIS | None | Daily | Tiles | UC13 - Map overlays |
| **MOD13Q1** | Terra MODIS | AppEEARS | 16-day | Point/Area | UC13 - NDVI vegetation |
| **IMERG** | GPM | GES DISC | 30min/Daily | BBox | UC19 - Precipitation |
| **SMAP** | Aquarius | NSIDC | Daily | BBox | UC19 - Soil moisture |
| **Landsat** | USGS | AppEEARS | 16-day | Point/Area | UC13 - LST temperature |

## Scripts

### 0. Common Setup

#### `setup_earthdata.sh`
Configure NASA Earthdata Login credentials in `~/.netrc`.
```bash
./scripts/setup_earthdata.sh
```

#### `appeears_token.sh`
Obtain AppEEARS API authentication token (required for MODIS/Landsat scripts).
```bash
./scripts/appeears_token.sh
```

---

### 1. POWER (Agro-Climate Data)

**No authentication required** ✅

#### `power_daily_point.sh`
Fetch daily agro-climate time series for a point location.

**Parameters fetched:**
- `T2M` - Temperature at 2 Meters (°C)
- `RH2M` - Relative Humidity at 2 Meters (%)
- `WS2M` - Wind Speed at 2 Meters (m/s)
- `ALLSKY_SFC_SW_DWN` - Solar Radiation (MJ/m²/day)
- `PRECTOTCORR` - Precipitation Corrected (mm/day)

**Usage:**
```bash
./scripts/power_daily_point.sh <lat> <lon> <start_YYYYMMDD> <end_YYYYMMDD>
```

**Example:**
```bash
# Dhaka, Bangladesh - August 2025
./scripts/power_daily_point.sh 23.81 90.41 20250801 20250807
```

**Output:**
```
data/power_23.81_90.41_20250801_20250807.json
```

**Caching:** ✅ Automatic (skips if file exists)

**API Docs:** https://power.larc.nasa.gov/docs/services/api/

---

### 2. GIBS (Map Tile Overlays)

**No authentication required** ✅

#### `gibs_tile_url.sh`
Generate WMTS tile URL for map overlays (NDVI, LST, true color imagery).

**Common Layers:**
- `MODIS_Terra_NDVI` - Vegetation index
- `MODIS_Terra_Land_Surface_Temp_Day` - Daytime temperature
- `MODIS_Terra_Land_Surface_Temp_Night` - Nighttime temperature
- `MODIS_Terra_CorrectedReflectance_TrueColor` - RGB imagery

**Usage:**
```bash
./scripts/gibs_tile_url.sh <layer> <date_YYYY-MM-DD> <z> <x> <y>
```

**Example:**
```bash
# NDVI tile for Bangladesh region
./scripts/gibs_tile_url.sh MODIS_Terra_NDVI 2025-08-01 5 20 12
```

**Output:** Prints tile URL to stdout
```
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI/Default/2025-08-01/GoogleMapsCompatible_Level9/5/12/20.png
```

**Note:** Layers are time-dimensioned. Check availability at:
- https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/

---

### 3. AppEEARS Token

**Requires Earthdata Login** 🔐

#### `appeears_token.sh`
Obtain API token for AppEEARS (MODIS NDVI, Landsat LST).

**Usage:**
```bash
./scripts/appeears_token.sh
```

**Output:**
```
.appeears_token (600 permissions)
```

**Token validity:** 48 hours (re-run script if expired)

---

### 4. MODIS NDVI (Vegetation Index)

**Requires AppEEARS token** 🔐

#### `ndvi_mod13q1_point.sh`
Fetch MOD13Q1 v6.1 NDVI time series for a point location.

**Product:** MOD13Q1.061 (Terra MODIS 16-Day Vegetation Indices at 250m)

**Temporal cadence:** 16-day composite (interpolate for trend analysis)

**Usage:**
```bash
./scripts/ndvi_mod13q1_point.sh <lat> <lon> <start> <end>
```

Dates can be:
- `YYYY-MM-DD` (e.g., 2025-07-01)
- `YYYY-DOY` (e.g., 2025-182)

**Example:**
```bash
# Dhaka farmland - July to September 2025
./scripts/ndvi_mod13q1_point.sh 23.81 90.41 2025-07-01 2025-09-30
```

**Output:**
```
data/mod13q1_23.81_90.41_20250701_20250930.zip
data/mod13q1_23.81_90.41_20250701_20250930/  (extracted)
```

**Processing:**
1. Submits AppEEARS task
2. Polls status every 10 seconds
3. Downloads and extracts ZIP bundle
4. Shows file listing

**Caching:** ✅ Automatic (skips if directory exists)

**API Docs:** https://appeears.earthdatacloud.nasa.gov/help

---

### 5. IMERG Precipitation

**Requires Earthdata Login** 🔐

#### `imerg_daily_bbox.sh`
Fetch GPM IMERG precipitation data for a bounding box.

**Product:** GPM_3IMERGDF.07 (IMERG Final Run, daily)

**Access method:** OPeNDAP or GES DISC Subsetter

**Usage:**
```bash
./scripts/imerg_daily_bbox.sh <minLon> <minLat> <maxLon> <maxLat> <start> <end>
```

**Example:**
```bash
# Dhaka region - August 1-7, 2025
./scripts/imerg_daily_bbox.sh 90.2 23.6 90.6 23.9 2025-08-01 2025-08-07
```

**Output:**
```
data/imerg_90.2_23.6_90.6_23.9_20250801_20250807.nc
```

**Note:** Current implementation fetches first day as example. Production use requires:
- Date range iteration
- Grid index calculation
- Data aggregation

**Alternative:** Use GES DISC Subsetter Web Interface:
https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary

**Caching:** ✅ Automatic (skips if file exists)

**Docs:**
- https://gpm.nasa.gov/data/imerg
- https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary

---

### 6. SMAP Soil Moisture

**Requires Earthdata Login** 🔐

#### `smap_bbox.sh`
Fetch SMAP Level-3 daily soil moisture for a bounding box.

**Product:** SPL3SMP.008 (SMAP L3 Radiometer Global Daily 36 km EASE-Grid Soil Moisture)

**Access:** NSIDC DAAC (tokenless with netrc)

**Usage:**
```bash
./scripts/smap_bbox.sh <minLon> <minLat> <maxLon> <maxLat> <start> <end>
```

**Example:**
```bash
# Dhaka region - August 1-3, 2025
./scripts/smap_bbox.sh 90.2 23.6 90.6 23.9 2025-08-01 2025-08-03
```

**Output:**
```
data/smap_90.2_23.6_90.6_23.9_20250801_20250803.h5
```

**Note:** Downloads full daily granule (global coverage, ~100 MB). For smaller files, use NSIDC Subsetter:
https://nsidc.org/data/spl3smp/versions/8

**Spatial subset extraction:**
- `h5dump` or `h5py` (Python)
- `gdal_translate` with HDF5 driver

**Caching:** ✅ Automatic (skips if file exists)

**Docs:** https://nsidc.org/data/spl3smp/versions/8

---

### 7. Landsat LST (Land Surface Temperature)

**Requires AppEEARS token** 🔐

#### `landsat_lst_point.sh`
Fetch Landsat Collection 2 Surface Temperature for a point location.

**Product:** LSTE.001 (Landsat 4-9 Surface Temperature)

**Units:** Kelvin (K) - Convert to Celsius: °C = K - 273.15

**Temporal cadence:** 16-day (varies by location and cloud cover)

**Usage:**
```bash
./scripts/landsat_lst_point.sh <lat> <lon> <start> <end>
```

**Example:**
```bash
# Dhaka farmland - August 2025
./scripts/landsat_lst_point.sh 23.81 90.41 2025-08-01 2025-08-10
```

**Output:**
```
data/lst_23.81_90.41_20250801_20250810.zip
data/lst_23.81_90.41_20250801_20250810/  (extracted)
```

**Caching:** ✅ Automatic (skips if directory exists)

**Docs:** https://www.usgs.gov/landsat-missions/landsat-collection-2-level-2-science-products

---

### 8. Validation

#### `validate_uc13_uc19.sh`
Check presence and basic validity of all downloaded datasets.

**Usage:**
```bash
./scripts/validate_uc13_uc19.sh
```

**Checks:**
- ✅ POWER JSON files (valid JSON)
- ✅ GIBS tile URL generation
- ✅ MODIS NDVI archives and extracted directories
- ✅ IMERG NetCDF files
- ✅ SMAP HDF5 files
- ✅ Landsat LST archives and extracted directories

**Exit codes:**
- `0` - All checks passed or only warnings
- `1` - One or more critical errors

---

## Complete Workflow Example

### UC13: Vegetation & Temperature Monitoring

```bash
# 1. Setup (one-time)
./scripts/setup_earthdata.sh
./scripts/appeears_token.sh

# 2. Fetch climate data (no auth)
./scripts/power_daily_point.sh 23.81 90.41 20250801 20250831

# 3. Generate map tile URL
./scripts/gibs_tile_url.sh MODIS_Terra_NDVI 2025-08-15 5 20 12

# 4. Fetch NDVI time series
./scripts/ndvi_mod13q1_point.sh 23.81 90.41 2025-08-01 2025-08-31

# 5. Fetch land surface temperature
./scripts/landsat_lst_point.sh 23.81 90.41 2025-08-01 2025-08-31

# 6. Validate downloads
./scripts/validate_uc13_uc19.sh
```

### UC19: Precipitation & Soil Moisture

```bash
# 1. Setup (one-time)
./scripts/setup_earthdata.sh

# 2. Fetch climate data
./scripts/power_daily_point.sh 23.81 90.41 20250801 20250807

# 3. Fetch precipitation
./scripts/imerg_daily_bbox.sh 90.2 23.6 90.6 23.9 2025-08-01 2025-08-07

# 4. Fetch soil moisture
./scripts/smap_bbox.sh 90.2 23.6 90.6 23.9 2025-08-01 2025-08-03

# 5. Validate downloads
./scripts/validate_uc13_uc19.sh
```

---

## Data Directory Structure

```
data/
├── power_23.81_90.41_20250801_20250807.json          # POWER climate data
├── mod13q1_23.81_90.41_20250701_20250930.zip         # NDVI archive
├── mod13q1_23.81_90.41_20250701_20250930/            # NDVI extracted
│   ├── MOD13Q1-061-250m-16-days-NDVI-*.csv
│   └── ...
├── imerg_90.2_23.6_90.6_23.9_20250801_20250807.nc    # Precipitation
├── smap_90.2_23.6_90.6_23.9_20250801_20250803.h5     # Soil moisture
├── lst_23.81_90.41_20250801_20250810.zip             # LST archive
└── lst_23.81_90.41_20250801_20250810/                # LST extracted
    ├── LSTE-001-SurfaceTemperature-*.csv
    └── ...
```

---

## Caching Strategy

All scripts implement caching:
- ✅ Check if output file exists before fetching
- ✅ Print "Cached: <file>" and exit early
- ✅ Validate outputs (JSON with `jq`, file size checks)

To force re-download:
```bash
rm data/power_23.81_90.41_20250801_20250807.json
./scripts/power_daily_point.sh 23.81 90.41 20250801 20250807
```

---

## File Size Estimates

| Dataset | Sample Size | Notes |
|---------|-------------|-------|
| POWER (7 days) | ~10 KB | JSON, 5 parameters |
| GIBS Tile | N/A | URL only (no download) |
| MODIS NDVI (3 months) | ~50 KB | ZIP with CSV |
| IMERG (7 days, small bbox) | ~1-5 MB | NetCDF |
| SMAP (1 day, global) | ~100 MB | HDF5, full granule |
| Landsat LST (10 days) | ~50 KB | ZIP with CSV |

**Total for complete workflow:** ~110 MB (mostly SMAP)

To keep under 5 MB: Skip SMAP or implement subsetting.

---

## Troubleshooting

### Authentication Errors

**Error:** `401 Unauthorized` or `Missing or insufficient permissions`

**Solution:**
1. Check `.env` has correct credentials
2. Run `./scripts/setup_earthdata.sh` again
3. Verify `~/.netrc` exists with 600 permissions
4. For AppEEARS, run `./scripts/appeears_token.sh`

### API Errors

**Error:** `404 Not Found` or empty response

**Reasons:**
- Date out of range (data not available yet)
- Invalid coordinates
- Product temporarily unavailable

**Solution:**
- Verify dates are in the past
- Check coordinate ranges (lat: -90 to 90, lon: -180 to 180)
- Retry later if service is down

### Script Errors

**Error:** `command not found: jq`

**Solution:** Install dependencies (see Requirements section)

**Error:** `Permission denied`

**Solution:** Make scripts executable:
```bash
chmod +x scripts/*.sh
```

---

## Dataset References

### Climate & Weather
- **POWER API:** https://power.larc.nasa.gov/docs/
- **IMERG (GPM):** https://gpm.nasa.gov/data/imerg
- **GES DISC:** https://disc.gsfc.nasa.gov/

### Vegetation & Land Surface
- **MODIS (MOD13Q1):** https://lpdaac.usgs.gov/products/mod13q1v061/
- **Landsat:** https://www.usgs.gov/landsat-missions
- **GIBS:** https://nasa-gibs.github.io/gibs-api-docs/

### Soil & Hydrology
- **SMAP:** https://smap.jpl.nasa.gov/
- **NSIDC:** https://nsidc.org/data/smap

### APIs & Tools
- **AppEEARS:** https://appeears.earthdatacloud.nasa.gov/
- **Earthdata Login:** https://urs.earthdata.nasa.gov/

---

## License

Scripts are provided as-is for use with NASA Earthdata services. Data usage subject to NASA's data policy: https://www.earthdata.nasa.gov/learn/use-data/data-use-policy

---

## Support

For issues with:
- **Scripts:** Open issue in repository
- **NASA APIs:** Contact Earthdata Support: https://support.earthdata.nasa.gov/
- **Earthdata Login:** https://urs.earthdata.nasa.gov/documentation
