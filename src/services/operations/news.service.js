import { db } from '../firebase.config';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * News Service (UC41) - Access news & updates
 */
export class NewsService {
  constructor(userId) {
    this.userId = userId;
    this.articlesCollection = collection(db, 'news_articles');
    this.preferencesCollection = collection(db, 'news_preferences');
  }

  async getNewsFeed(options = {}) {
    const {
      locale = 'en',
      crops = [],
      categories = [],
      page = 1,
      pageLimit = 20
    } = options;

    let q = query(
      this.articlesCollection,
      where('locale', '==', locale),
      orderBy('publishedAt', 'desc'),
      limit(pageLimit)
    );

    const snapshot = await getDocs(q);
    let articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by crops
    if (crops.length > 0) {
      articles = articles.filter(article =>
        article.crops.some(crop => crops.includes(crop))
      );
    }

    // Filter by categories
    if (categories.length > 0) {
      articles = articles.filter(article =>
        categories.includes(article.category)
      );
    }

    return articles;
  }

  async saveArticle(articleId) {
    const articleRef = doc(db, 'news_articles', articleId);
    await updateDoc(articleRef, {
      savedBy: arrayUnion(this.userId)
    });

    return { saved: true, articleId };
  }

  async shareArticle(articleId, platform) {
    const articleRef = doc(db, 'news_articles', articleId);
    await updateDoc(articleRef, {
      shares: arrayUnion({ userId: this.userId, platform, timestamp: Date.now() })
    });

    return { shared: true, articleId, platform };
  }

  async getSavedArticles() {
    const q = query(
      this.articlesCollection,
      where('savedBy', 'array-contains', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async searchArticles(searchQuery) {
    const q = query(
      this.articlesCollection,
      orderBy('publishedAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }
}

export default NewsService;
