# NASA Satellite Data Integration

This guide documents setup and testing steps for UC36/UC38 using SMAP soil moisture, MODIS NDVI (AppEEARS), and Landsat scenes.

## Environment Variables

Set the following keys inside `.env` (never commit secrets):

```
NASA_EARTHDATA_USERNAME=your_earthdata_username
NASA_EARTHDATA_TOKEN=your_long_lived_access_token
```

Ensure `.env` is listed in `.gitignore` (already present) and keep tokens out of source control.

## Dependencies

Install required packages:

```bash
npm install axios date-fns
```

These are already declared in `package.json`.

## Services Overview

- `src/services/nasa/smapService.js`
  - `fetchSMAPSoilMoisture(latitude, longitude, date)`
  - `getSMAPTrend(latitude, longitude, startDate, endDate)`
- `src/services/nasa/modisService.js`
  - Handles AppEEARS login, task submission, polling, and bundle download for MODIS NDVI.
- `src/services/nasa/landsatService.js`
  - Searches Landsat Collection 2 Level 2 scenes, filtering by cloud cover.
- `src/services/nasa/satelliteService.js`
  - Orchestrates all three data sources, persists results to Firestore, and exposes `verifySatelliteEvidence()`.

## React Native Screen

`src/screens/SatelliteDataScreen.js` provides a manual fetch UI for SMAP/MODIS/Landsat results.

Add a navigation entry or dashboard CTA linking to `SatelliteData` route (if not already present).

## Testing Checklist

1. **Token validation**
   - Launch the app with the `.env` token set.
   - Trigger `SatelliteDataScreen` and confirm no authorization errors.

2. **SMAP trend**
   - Use demo coordinates (e.g., `latitude=40.7128`, `longitude=-74.0060`).
   - Verify soil moisture entries are populated and logged in the console.

3. **MODIS NDVI**
   - Confirm AppEEARS login succeeds (token cached).
   - Ensure task completes (polling takes up to a few minutes). Placeholder NDVI value is returned until GeoTIFF parsing is implemented.

4. **Landsat scenes**
   - Verify returned array contains scenes with `<20%` cloud cover and browse/data URLs.

5. **Firestore storage**
   - Inspect `satellite_data` collection for new documents containing SMAP/MODIS/Landsat payloads.

6. **Verification workflow**
   - Call `verifySatelliteEvidence(farmId, claimedYield, claimedSoilHealth)` from your claim validation logic and confirm response contains `yieldCheck` and `soilCheck` booleans.

## Known Limitations

- MODIS GeoTIFF parsing is a placeholder. Integrate `geotiff` to decode actual NDVI rasters.
- Landsat NDVI calculation is mocked; implement band download and NDVI formula for production accuracy.
- Network calls use simple retries. Add exponential backoff if rate limiting becomes an issue.

## Operational Notes

- Tokens expire; refresh `NASA_EARTHDATA_TOKEN` before expiry (see Earthdata profile).
- Cache raw downloads in `nasa_data_cache/` (ignored by Git) if you add persistence to avoid repeated polling.
- Handle `401` responses by calling `resetModisSession()` to force AppEEARS re-authentication.
