import { db } from '../firebase.config';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';

/**
 * Academic Resources Service (UC53) - Access academic resources
 */
export class AcademicResourcesService {
  constructor(userId) {
    this.userId = userId;
    this.resourcesCollection = collection(db, 'academic_resources');
    this.enrollmentsCollection = collection(db, 'course_enrollments');
  }

  async searchResources(filters = {}) {
    let q = query(this.resourcesCollection);

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    const snapshot = await getDocs(q);
    let resources = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by difficulty
    if (filters.difficulty) {
      resources = resources.filter(r => r.difficulty === filters.difficulty);
    }

    return resources;
  }

  async getResource(resourceId) {
    const resources = await this.searchResources();
    return resources.find(r => r.id === resourceId);
  }

  async enrollInCourse(courseId) {
    const enrollment = {
      userId: this.userId,
      courseId,
      progress: 0,
      completed: false,
      enrolledAt: Date.now()
    };

    const enrollmentRef = collection(db, 'course_enrollments');
    await addDoc(enrollmentRef, enrollment);

    // Update enrollment count
    const courseRef = doc(db, 'academic_resources', courseId);
    await updateDoc(courseRef, {
      enrollmentCount: increment(1)
    });

    return enrollment;
  }

  async markComplete(resourceId) {
    // Find enrollment
    const q = query(
      this.enrollmentsCollection,
      where('userId', '==', this.userId),
      where('courseId', '==', resourceId)
    );

    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const enrollmentRef = doc(db, 'course_enrollments', snapshot.docs[0].id);
      await updateDoc(enrollmentRef, {
        completed: true,
        completedAt: Date.now(),
        progress: 100
      });
    }

    // Add to user history
    await this.addToHistory(resourceId, 'completed');

    return { completed: true, resourceId };
  }

  async addToHistory(resourceId, action) {
    const historyRef = collection(db, 'resource_history');
    await addDoc(historyRef, {
      userId: this.userId,
      resourceId,
      action,
      timestamp: Date.now()
    });
  }

  async bookmarkResource(resourceId) {
    const userRef = doc(db, 'users', this.userId);
    await updateDoc(userRef, {
      bookmarkedResources: arrayUnion(resourceId)
    });

    return { bookmarked: true, resourceId };
  }

  async getLearningPath(topic) {
    const resources = await this.searchResources({ category: topic });
    
    // Sort by difficulty
    const ordered = resources.sort((a, b) => {
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });

    return {
      topic,
      resources: ordered,
      estimatedDuration: ordered.reduce((sum, r) => sum + r.duration, 0)
    };
  }

  async getRecommendations() {
    // Get user's completed courses
    const q = query(
      this.enrollmentsCollection,
      where('userId', '==', this.userId),
      where('completed', '==', true)
    );

    const snapshot = await getDocs(q);
    const completedIds = snapshot.docs.map(doc => doc.data().courseId);

    // Get resources in same categories
    const allResources = await this.searchResources();
    
    return allResources
      .filter(r => !completedIds.includes(r.id))
      .slice(0, 5);
  }
}

export default AcademicResourcesService;
