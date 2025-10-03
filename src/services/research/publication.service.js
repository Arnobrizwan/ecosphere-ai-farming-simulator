import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';

/**
 * Publication Service (UC52) - Publish research findings
 */
export class PublicationService {
  constructor(userId) {
    this.userId = userId;
    this.publicationsCollection = collection(db, 'publications');
  }

  async submitPublication(publicationData) {
    const publication = {
      title: publicationData.title,
      abstract: publicationData.abstract,
      authors: publicationData.authors,
      manuscript: publicationData.manuscript,
      datasetIds: publicationData.datasetIds || [],
      keywords: publicationData.keywords || [],
      category: publicationData.category,
      status: 'submitted',
      reviews: [],
      doi: null,
      citation: null,
      publishedAt: null,
      views: 0,
      downloads: 0,
      submittedBy: this.userId,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.publicationsCollection, publication);

    // Assign reviewers
    await this.assignReviewers(docRef.id);

    return {
      id: docRef.id,
      ...publication
    };
  }

  async assignReviewers(publicationId) {
    // Mock reviewer assignment
    const reviewers = ['reviewer1', 'reviewer2'];
    
    console.log(`Assigned reviewers for publication ${publicationId}:`, reviewers);

    const publicationRef = doc(db, 'publications', publicationId);
    await updateDoc(publicationRef, {
      status: 'under_review',
      reviewers
    });
  }

  async submitReview(publicationId, reviewData) {
    const review = {
      reviewerId: this.userId,
      rating: reviewData.rating,
      comments: reviewData.comments,
      decision: reviewData.decision,
      reviewedAt: Date.now()
    };

    const publication = await this.getPublication(publicationId);
    const reviews = [...publication.reviews, review];

    const publicationRef = doc(db, 'publications', publicationId);
    await updateDoc(publicationRef, {
      reviews
    });

    // Check if all reviews complete
    await this.checkReviewCompletion(publicationId);

    return review;
  }

  async checkReviewCompletion(publicationId) {
    const publication = await this.getPublication(publicationId);
    
    if (publication.reviews.length >= 2) {
      const allApproved = publication.reviews.every(r => r.decision === 'approve');
      
      if (allApproved) {
        await this.approvePublication(publicationId);
      }
    }
  }

  async approvePublication(publicationId) {
    const publicationRef = doc(db, 'publications', publicationId);
    await updateDoc(publicationRef, {
      status: 'approved'
    });
  }

  async publish(publicationId) {
    const doi = this.generateDOI(publicationId);
    const citation = await this.generateCitation(publicationId);

    const publicationRef = doc(db, 'publications', publicationId);
    await updateDoc(publicationRef, {
      status: 'published',
      doi,
      citation,
      publishedAt: Date.now()
    });

    return {
      published: true,
      doi,
      citation
    };
  }

  generateDOI(publicationId) {
    return `10.1234/ecosphere.${publicationId}`;
  }

  async generateCitation(publicationId) {
    const publication = await this.getPublication(publicationId);
    
    const authors = publication.authors.map(a => a.name).join(', ');
    const year = new Date().getFullYear();
    
    return `${authors} (${year}). ${publication.title}. EcoSphere Research. DOI: ${this.generateDOI(publicationId)}`;
  }

  async getPublicationStatus(publicationId) {
    const publication = await this.getPublication(publicationId);
    
    return {
      status: publication.status,
      reviews: publication.reviews.length,
      doi: publication.doi
    };
  }

  async getUserPublications() {
    const q = query(
      this.publicationsCollection,
      where('submittedBy', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getPublication(publicationId) {
    const publications = await this.getUserPublications();
    return publications.find(p => p.id === publicationId);
  }
}

export default PublicationService;
