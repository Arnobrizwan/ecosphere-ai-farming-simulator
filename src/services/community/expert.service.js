import { db } from '../firebase.config';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Expert Service (UC29) - Access expert network
 */
export class ExpertService {
  constructor(userId) {
    this.userId = userId;
    this.expertsCollection = collection(db, 'experts');
    this.consultationsCollection = collection(db, 'consultations');
  }

  async searchExperts(filters = {}) {
    let q = query(this.expertsCollection, where('verified', '==', true));
    
    const snapshot = await getDocs(q);
    let experts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (filters.expertise) {
      experts = experts.filter(expert => 
        expert.expertise.some(exp => filters.expertise.includes(exp))
      );
    }

    return experts;
  }

  async requestConsultation(consultationData) {
    const consultation = {
      userId: this.userId,
      expertId: consultationData.expertId,
      topic: consultationData.topic,
      description: consultationData.description || '',
      preferredDate: consultationData.preferredDate,
      status: 'pending',
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.consultationsCollection, consultation);
    return { id: docRef.id, ...consultation };
  }

  async getConsultationUpdates() {
    const q = query(
      this.consultationsCollection,
      where('userId', '==', this.userId),
      where('status', '==', 'responded')
    );

    const snapshot = await getDocs(q);
    const consultations = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const expertDoc = await getDoc(doc(db, 'experts', data.expertId));
      const expertData = expertDoc.data();

      consultations.push({
        id: docSnap.id,
        expertName: expertData?.name || 'Expert',
        ...data
      });
    }

    return consultations;
  }
}

export default ExpertService;
