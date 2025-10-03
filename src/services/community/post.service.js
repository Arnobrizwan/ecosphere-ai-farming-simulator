import { db, storage } from '../firebase.config';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, getDocs, getDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Post Service (UC26) - Create and manage posts
 */
export class PostService {
  constructor(userId) {
    this.userId = userId;
    this.postsCollection = collection(db, 'posts');
  }

  async getPost(postId) {
    const document = await getDoc(doc(db, 'posts', postId));
    if (!document.exists()) {
      return null;
    }
    return { id: document.id, ...document.data() };
  }

  /**
   * Create new post
   */
  async createPost(postData) {
    const {
      content,
      media = [],
      hashtags = [],
      mentions = [],
      visibility = 'public',
      groupId = null,
      scheduledFor = null
    } = postData;

    // Validate content
    if (!this.validateContent(content)) {
      throw new Error('Content validation failed');
    }

    // Upload media files
    const uploadedMedia = await this.uploadMedia(media);

    // Get user info
    const userDoc = await getDoc(doc(db, 'users', this.userId));
    const userData = userDoc.data();

    const post = {
      authorId: this.userId,
      authorName: userData?.name || 'Unknown',
      authorAvatar: userData?.avatar || '',
      content,
      media: uploadedMedia,
      hashtags: this.extractHashtags(content, hashtags),
      mentions: this.extractMentions(content, mentions),
      visibility,
      groupId,
      status: scheduledFor ? 'scheduled' : 'published',
      scheduledFor,
      reactions: {
        like: 0,
        helpful: 0,
        insightful: 0
      },
      commentCount: 0,
      shareCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await addDoc(this.postsCollection, post);

    return {
      id: docRef.id,
      ...post
    };
  }

  /**
   * Upload media files
   */
  async uploadMedia(mediaFiles) {
    const uploaded = [];

    for (const file of mediaFiles) {
      if (file.uri || file.url) {
        const fileName = `posts/${this.userId}/${Date.now()}_${file.name || 'media'}`;
        const storageRef = ref(storage, fileName);

        try {
          // Upload file
          const response = await fetch(file.uri || file.url);
          const blob = await response.blob();
          await uploadBytes(storageRef, blob);

          // Get download URL
          const url = await getDownloadURL(storageRef);

          uploaded.push({
            type: file.type || 'image',
            url,
            thumbnail: url, // Could generate thumbnail
            name: file.name
          });
        } catch (error) {
          console.error('Media upload failed:', error);
        }
      }
    }

    return uploaded;
  }

  /**
   * Validate content
   */
  validateContent(content) {
    if (!content || content.trim().length === 0) {
      return false;
    }

    if (content.length > 5000) {
      return false;
    }

    // Check for spam patterns
    if (this.detectSpam(content)) {
      return false;
    }

    return true;
  }

  /**
   * Detect spam
   */
  detectSpam(content) {
    const spamPatterns = [
      /buy now/gi,
      /click here/gi,
      /limited time/gi,
      /\b(viagra|cialis)\b/gi
    ];

    return spamPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Extract hashtags
   */
  extractHashtags(content, additionalTags = []) {
    const hashtagPattern = /#(\w+)/g;
    const matches = content.match(hashtagPattern) || [];
    const extracted = matches.map(tag => tag.substring(1).toLowerCase());

    return [...new Set([...extracted, ...additionalTags])];
  }

  /**
   * Extract mentions
   */
  extractMentions(content, additionalMentions = []) {
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern) || [];
    const extracted = matches.map(mention => mention.substring(1));

    return [...new Set([...extracted, ...additionalMentions])];
  }

  /**
   * Update post
   */
  async updatePost(postId, updates) {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists() || postDoc.data().authorId !== this.userId) {
      throw new Error('Unauthorized to update this post');
    }

    await updateDoc(postRef, {
      ...updates,
      updatedAt: Date.now()
    });

    return {
      id: postId,
      ...postDoc.data(),
      ...updates
    };
  }

  /**
   * Delete post
   */
  async deletePost(postId) {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists() || postDoc.data().authorId !== this.userId) {
      throw new Error('Unauthorized to delete this post');
    }

    await deleteDoc(postRef);
  }

  /**
   * React to post
   */
  async reactToPost(postId, reactionType) {
    const postRef = doc(db, 'posts', postId);
    
    await updateDoc(postRef, {
      [`reactions.${reactionType}`]: increment(1)
    });
  }

  /**
   * Get public posts
   */
  async getPublicPosts(options = {}) {
    const { page = 1, limit: pageLimit = 20 } = options;

    const q = query(
      this.postsCollection,
      where('visibility', '==', 'public'),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get posts by authors
   */
  async getPostsByAuthors(authorIds, options = {}) {
    const { page = 1, limit: pageLimit = 20 } = options;

    if (authorIds.length === 0) return [];

    const q = query(
      this.postsCollection,
      where('authorId', 'in', authorIds.slice(0, 10)), // Firestore limit
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get posts by groups
   */
  async getPostsByGroups(groupIds, options = {}) {
    const { page = 1, limit: pageLimit = 20 } = options;

    if (groupIds.length === 0) return [];

    const q = query(
      this.postsCollection,
      where('groupId', 'in', groupIds.slice(0, 10)),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Search posts
   */
  async searchPosts(searchQuery, filters = {}) {
    // Note: For production, use Algolia or similar for full-text search
    // This is a simplified version

    let q = query(
      this.postsCollection,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by search query
    return posts.filter(post => {
      const searchLower = searchQuery.toLowerCase();
      return post.content.toLowerCase().includes(searchLower) ||
             post.hashtags.some(tag => tag.includes(searchLower));
    });
  }

  /**
   * Get user's post count
   */
  async getUserPostCount() {
    const q = query(
      this.postsCollection,
      where('authorId', '==', this.userId),
      where('status', '==', 'published')
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(options = {}) {
    const { period = '7d', limit: pageLimit = 10 } = options;

    const cutoff = Date.now() - this.parsePeriod(period);

    const q = query(
      this.postsCollection,
      where('status', '==', 'published'),
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by engagement
    return posts
      .sort((a, b) => {
        const engagementA = a.reactions.like + a.reactions.helpful + a.reactions.insightful + a.commentCount;
        const engagementB = b.reactions.like + b.reactions.helpful + b.reactions.insightful + b.commentCount;
        return engagementB - engagementA;
      })
      .slice(0, pageLimit);
  }

  /**
   * Parse period string to milliseconds
   */
  parsePeriod(period) {
    const value = parseInt(period);
    const unit = period.slice(-1);

    const multipliers = {
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || multipliers.d);
  }

  /**
   * Save draft
   */
  async saveDraft(postData) {
    return this.createPost({
      ...postData,
      status: 'draft'
    });
  }

  /**
   * Schedule post
   */
  async schedulePost(postData, scheduledFor) {
    return this.createPost({
      ...postData,
      scheduledFor,
      status: 'scheduled'
    });
  }
}

export default PostService;
