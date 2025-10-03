import { db, storage } from '../firebase.config';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, getDocs, getDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Knowledge Service (UC27) - Share guides, how-tos, datasets
 */
export class KnowledgeService {
  constructor(userId) {
    this.userId = userId;
    this.resourcesCollection = collection(db, 'knowledge_resources');
  }

  /**
   * Upload knowledge resource
   */
  async uploadResource(resourceData) {
    const {
      title,
      description,
      type, // 'guide' | 'how-to' | 'dataset' | 'research'
      category,
      tags = [],
      difficulty = 'intermediate',
      language = 'en',
      files = []
    } = resourceData;

    // Upload files
    const uploadedFiles = await this.uploadFiles(files);

    // Get user info
    const userDoc = await getDoc(doc(db, 'users', this.userId));
    const userData = userDoc.data();

    const resource = {
      title,
      description,
      authorId: this.userId,
      authorName: userData?.name || 'Unknown',
      type,
      category,
      tags,
      difficulty,
      language,
      files: uploadedFiles,
      rating: 0,
      reviewCount: 0,
      downloadCount: 0,
      version: '1.0',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await addDoc(this.resourcesCollection, resource);

    return {
      id: docRef.id,
      ...resource
    };
  }

  /**
   * Upload files
   */
  async uploadFiles(files) {
    const uploaded = [];

    for (const file of files) {
      const fileName = `knowledge/${this.userId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);

      try {
        const response = await fetch(file.uri || file.url);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);

        const url = await getDownloadURL(storageRef);

        uploaded.push({
          name: file.name,
          url,
          type: file.type || 'application/pdf',
          size: file.size || 0
        });
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }

    return uploaded;
  }

  /**
   * Search resources
   */
  async searchResources(searchQuery, filters = {}) {
    let q = query(
      this.resourcesCollection,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    const snapshot = await getDocs(q);
    const resources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by search query
    return resources.filter(resource => {
      const searchLower = searchQuery.toLowerCase();
      return resource.title.toLowerCase().includes(searchLower) ||
             resource.description.toLowerCase().includes(searchLower) ||
             resource.tags.some(tag => tag.toLowerCase().includes(searchLower));
    });
  }

  /**
   * Rate resource
   */
  async rateResource(resourceId, rating) {
    const resourceRef = doc(db, 'knowledge_resources', resourceId);
    
    await updateDoc(resourceRef, {
      rating: increment(rating),
      reviewCount: increment(1)
    });
  }

  /**
   * Track download
   */
  async trackDownload(resourceId) {
    const resourceRef = doc(db, 'knowledge_resources', resourceId);
    
    await updateDoc(resourceRef, {
      downloadCount: increment(1)
    });
  }

  /**
   * Get user's resource count
   */
  async getUserResourceCount() {
    const q = query(
      this.resourcesCollection,
      where('authorId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get trending resources
   */
  async getTrendingResources(options = {}) {
    const { period = '7d', limit: pageLimit = 10 } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.resourcesCollection,
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const resources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return resources
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, pageLimit);
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000 };
    return value * (multipliers[unit] || multipliers.d);
  }
}

export default KnowledgeService;
