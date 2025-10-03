import { db, storage } from '../firebase.config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Success Story Service (UC32) - Share success stories
 */
export class SuccessStoryService {
  constructor(userId) {
    this.userId = userId;
    this.storiesCollection = collection(db, 'success_stories');
  }

  async createStory(storyData) {
    const {
      title,
      narrative,
      category = 'general',
      beforeMedia = [],
      afterMedia = [],
      media = [],
      metrics = {},
      metricsText = '',
      evidence = [],
      testimonials = [],
      testimonialsText = ''
    } = storyData;

    const uploadedBefore = await this.uploadMedia(beforeMedia, 'before');
    const uploadedAfter = await this.uploadMedia(afterMedia, 'after');
    const uploadedGeneral = await this.uploadMedia(media, 'media');

    // Get user info
    const userDoc = await getDoc(doc(db, 'users', this.userId));
    const userData = userDoc.data();

    const story = {
      authorId: this.userId,
      authorName: userData?.name || 'Unknown',
      title,
      narrative,
      category,
      media: uploadedGeneral,
      beforeMedia: uploadedBefore,
      afterMedia: uploadedAfter,
      metrics: {
        yieldIncrease: metrics.yieldIncrease || 0,
        costReduction: metrics.costReduction || 0,
        sustainabilityScore: metrics.sustainabilityScore || 0,
        timeframe: metrics.timeframe || '',
        notes: metricsText,
      },
      evidence,
      testimonials: testimonials.length
        ? testimonials
        : testimonialsText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean),
      featured: false,
      verified: false,
      likes: 0,
      views: 0,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.storiesCollection, story);

    return {
      id: docRef.id,
      ...story
    };
  }

  async uploadMedia(mediaFiles, prefix) {
    const uploaded = [];

    for (const file of mediaFiles) {
      const fileName = `success_stories/${this.userId}/${prefix}_${Date.now()}_${file.name || 'media'}`;
      const storageRef = ref(storage, fileName);

      try {
        const response = await fetch(file.uri || file.url || file);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);

        const url = await getDownloadURL(storageRef);
        uploaded.push(url);
      } catch (error) {
        console.error('Media upload failed:', error);
      }
    }

    return uploaded;
  }

  async getUserStoryCount() {
    const q = query(
      this.storiesCollection,
      where('authorId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  async getTrendingStories(options = {}) {
    const { period = '7d', limit: pageLimit = 10 } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.storiesCollection,
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const stories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return stories
      .sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
      .slice(0, pageLimit);
  }

  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);
    const multipliers = { 'd': 86400000, 'w': 604800000, 'm': 2592000000 };
    return value * (multipliers[unit] || multipliers.d);
  }
}

export default SuccessStoryService;
