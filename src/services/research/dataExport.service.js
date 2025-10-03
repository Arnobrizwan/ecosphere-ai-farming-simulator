import { db, storage } from '../firebase.config';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Data Export Service (UC55) - Export research data
 */
export class DataExportService {
  constructor(userId) {
    this.userId = userId;
    this.exportsCollection = collection(db, 'data_exports');
  }

  async exportDataset(exportConfig) {
    const {
      datasetId,
      format,
      subset = {},
      anonymization = { enabled: false }
    } = exportConfig;

    // Verify license allows export
    await this.verifyLicense(datasetId);

    // Process export
    const data = await this.processExport(datasetId, subset, anonymization);

    // Format data
    const formatted = await this.formatData(data, format);

    // Upload to storage
    const downloadUrl = await this.uploadExport(formatted, format, datasetId);

    // Generate citation
    const citation = await this.generateCitation(datasetId);

    // Generate README
    const readme = this.generateReadme(datasetId, subset, anonymization);

    // Log export
    const exportRecord = {
      userId: this.userId,
      datasetId,
      format,
      subset,
      anonymization,
      downloadUrl,
      citation,
      readme,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.exportsCollection, exportRecord);

    return {
      id: docRef.id,
      ...exportRecord
    };
  }

  async verifyLicense(datasetId) {
    // Mock license verification
    return true;
  }

  async processExport(datasetId, subset, anonymization) {
    // Mock data processing
    let data = [
      { date: '2024-01-01', location: 'Field A', temperature: 25, rainfall: 10 },
      { date: '2024-01-02', location: 'Field A', temperature: 26, rainfall: 5 },
      { date: '2024-01-03', location: 'Field B', temperature: 24, rainfall: 15 }
    ];

    // Apply subset filters
    if (subset.fields) {
      data = data.map(row => {
        const filtered = {};
        subset.fields.forEach(field => {
          if (row[field] !== undefined) {
            filtered[field] = row[field];
          }
        });
        return filtered;
      });
    }

    // Apply anonymization
    if (anonymization.enabled) {
      data = this.anonymizeData(data, anonymization);
    }

    return data;
  }

  anonymizeData(data, config) {
    return data.map(row => {
      const anonymized = { ...row };
      
      config.fields.forEach(field => {
        if (anonymized[field]) {
          switch (config.method) {
            case 'hash':
              anonymized[field] = this.hashValue(anonymized[field]);
              break;
            case 'remove':
              delete anonymized[field];
              break;
            case 'generalize':
              anonymized[field] = this.generalizeValue(anonymized[field]);
              break;
          }
        }
      });

      return anonymized;
    });
  }

  hashValue(value) {
    // Simple hash for demonstration
    return `hash_${btoa(String(value)).substring(0, 10)}`;
  }

  generalizeValue(value) {
    // Generalize location to region, etc.
    if (typeof value === 'string' && value.includes('Field')) {
      return 'Region A';
    }
    return value;
  }

  async formatData(data, format) {
    switch (format) {
      case 'csv':
        return this.formatAsCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'geotiff':
        return this.formatAsGeoTIFF(data);
      case 'netcdf':
        return this.formatAsNetCDF(data);
      default:
        return JSON.stringify(data);
    }
  }

  formatAsCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    return csv;
  }

  formatAsGeoTIFF(data) {
    // Mock GeoTIFF format
    return btoa(JSON.stringify(data));
  }

  formatAsNetCDF(data) {
    // Mock NetCDF format
    return btoa(JSON.stringify(data));
  }

  async uploadExport(formatted, format, datasetId) {
    const extension = {
      csv: 'csv',
      json: 'json',
      geotiff: 'tif',
      netcdf: 'nc'
    }[format] || 'txt';

    const fileName = `exports/${this.userId}/${Date.now()}_${datasetId}.${extension}`;
    const storageRef = ref(storage, fileName);

    await uploadString(storageRef, formatted, format === 'geotiff' || format === 'netcdf' ? 'base64' : 'raw');
    
    return await getDownloadURL(storageRef);
  }

  async generateCitation(datasetId) {
    // Mock citation generation
    const year = new Date().getFullYear();
    return `EcoSphere Research Dataset ${datasetId} (${year}). Retrieved from EcoSphere Platform. DOI: 10.1234/ecosphere.data.${datasetId}`;
  }

  generateReadme(datasetId, subset, anonymization) {
    let readme = `# Dataset Export\n\n`;
    readme += `Dataset ID: ${datasetId}\n`;
    readme += `Export Date: ${new Date().toISOString()}\n\n`;

    if (subset.fields) {
      readme += `## Fields Included\n`;
      subset.fields.forEach(field => {
        readme += `- ${field}\n`;
      });
      readme += `\n`;
    }

    if (anonymization.enabled) {
      readme += `## Anonymization\n`;
      readme += `Method: ${anonymization.method}\n`;
      readme += `Fields anonymized: ${anonymization.fields.join(', ')}\n\n`;
    }

    readme += `## Usage\n`;
    readme += `Please cite this dataset in your publications.\n\n`;
    readme += `## License\n`;
    readme += `This data is provided under the dataset's original license terms.\n`;

    return readme;
  }
}

export default DataExportService;
