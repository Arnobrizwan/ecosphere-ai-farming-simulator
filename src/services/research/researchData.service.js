import { db, storage } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc, increment } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

/**
 * Research Data Service (UC50) - Access curated research datasets/metadata
 * Supports browsing catalog, requesting/loading datasets, preview/download
 */
export class ResearchDataService {
  constructor(userId, userRole = 'researcher') {
    this.userId = userId;
    this.userRole = userRole;
    this.datasetsCollection = collection(db, 'research_datasets');
    this.accessLogsCollection = collection(db, 'dataset_access_logs');
  }

  async browseCatalog(filters = {}) {
    let q = query(this.datasetsCollection);

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.format) {
      q = query(q, where('format', '==', filters.format));
    }

    const snapshot = await getDocs(q);
    let datasets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      datasets = datasets.filter(ds =>
        filters.tags.some(tag => ds.tags && ds.tags.includes(tag))
      );
    }

    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      datasets = datasets.filter(ds =>
        ds.title.toLowerCase().includes(term) ||
        ds.description.toLowerCase().includes(term)
      );
    }

    // Check access permissions
    datasets = datasets.map(ds => ({
      ...ds,
      hasAccess: this.hasAccess(ds),
      requiresRequest: ds.accessControl && ds.accessControl.requestRequired
    }));

    // Sort by most recent
    datasets.sort((a, b) => b.createdAt - a.createdAt);

    return datasets;
  }

  hasAccess(dataset) {
    if (!dataset.accessControl) return true;
    if (dataset.accessControl.public) return true;

    // Check user role
    if (dataset.accessControl.allowedRoles &&
        dataset.accessControl.allowedRoles.includes(this.userRole)) {
      return true;
    }

    // Check if user is dataset owner
    if (dataset.ownerId === this.userId) return true;

    return false;
  }

  async getMetadata(datasetId) {
    const dataset = await this.getDataset(datasetId);

    return {
      id: dataset.id,
      title: dataset.title,
      description: dataset.description,
      category: dataset.category,
      format: dataset.format,
      recordCount: dataset.recordCount,
      size: dataset.size,
      license: dataset.license,
      citation: dataset.citation,
      tags: dataset.tags,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      downloads: dataset.downloads || 0,
      views: dataset.views || 0
    };
  }

  async requestAccess(datasetId) {
    const dataset = await this.getDataset(datasetId);
    
    if (!dataset.accessControl.requestRequired) {
      return { granted: true, immediate: true };
    }

    // Create access request
    const request = {
      userId: this.userId,
      datasetId,
      status: 'pending',
      requestedAt: Date.now()
    };

    await addDoc(collection(db, 'access_requests'), request);

    return { granted: false, pending: true };
  }

  async previewDataset(datasetId) {
    const dataset = await this.getDataset(datasetId);
    
    if (!this.hasAccess(dataset)) {
      throw new Error('Access denied');
    }

    // Log access
    await this.logAccess(datasetId, 'preview');

    // Get preview data (first 100 records)
    const previewUrl = dataset.previewUrl;
    
    return {
      datasetId,
      preview: {
        url: previewUrl,
        recordCount: Math.min(100, dataset.recordCount),
        fields: this.getDatasetFields(dataset)
      }
    };
  }

  async downloadDataset(datasetId) {
    const dataset = await this.getDataset(datasetId);
    
    if (!this.hasAccess(dataset)) {
      throw new Error('Access denied');
    }

    // Log access
    await this.logAccess(datasetId, 'download');

    // Increment download count
    const datasetRef = doc(db, 'research_datasets', datasetId);
    await updateDoc(datasetRef, {
      downloads: increment(1)
    });

    // Get download URL
    const storageRef = ref(storage, dataset.downloadUrl);
    const downloadUrl = await getDownloadURL(storageRef);

    return {
      downloadUrl,
      citation: dataset.citation,
      license: dataset.license
    };
  }

  async logAccess(datasetId, action) {
    const log = {
      userId: this.userId,
      datasetId,
      action,
      timestamp: Date.now()
    };

    await addDoc(this.accessLogsCollection, log);
  }

  async getDataset(datasetId) {
    const datasets = await this.browseCatalog();
    return datasets.find(ds => ds.id === datasetId);
  }

  getDatasetFields(dataset) {
    // Mock fields based on format
    const fieldsByFormat = {
      csv: ['date', 'location', 'temperature', 'rainfall'],
      geotiff: ['band1', 'band2', 'band3'],
      netcdf: ['time', 'lat', 'lon', 'value']
    };

    return fieldsByFormat[dataset.format] || [];
  }

  async getRecentDatasets() {
    const datasets = await this.browseCatalog();
    return datasets.slice(0, 5);
  }
}

export default ResearchDataService;
