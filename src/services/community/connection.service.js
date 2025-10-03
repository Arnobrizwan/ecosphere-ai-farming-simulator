import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc, or, and } from 'firebase/firestore';

/**
 * Connection Service (UC28) - Connect with farmers
 */
export class ConnectionService {
  constructor(userId) {
    this.userId = userId;
    this.connectionsCollection = collection(db, 'connections');
  }

  /**
   * Send connection request
   */
  async sendRequest(targetUserId) {
    // Check if connection already exists
    const existing = await this.getConnection(targetUserId);
    if (existing) {
      throw new Error('Connection already exists');
    }

    const connection = {
      userId1: this.userId,
      userId2: targetUserId,
      status: 'pending',
      initiatedBy: this.userId,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.connectionsCollection, connection);
    return { id: docRef.id, ...connection };
  }

  /**
   * Accept connection request
   */
  async acceptRequest(connectionId) {
    const connectionRef = doc(db, 'connections', connectionId);
    
    await updateDoc(connectionRef, {
      status: 'accepted',
      acceptedAt: Date.now()
    });
  }

  /**
   * Decline connection request
   */
  async declineRequest(connectionId) {
    const connectionRef = doc(db, 'connections', connectionId);
    
    await updateDoc(connectionRef, {
      status: 'declined'
    });
  }

  /**
   * Get connections
   */
  async getConnections() {
    const q = query(
      this.connectionsCollection,
      and(
        where('status', '==', 'accepted'),
        or(
          where('userId1', '==', this.userId),
          where('userId2', '==', this.userId)
        )
      )
    );

    const snapshot = await getDocs(q);
    const connections = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const otherUserId = data.userId1 === this.userId ? data.userId2 : data.userId1;
      
      // Get user info
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      const userData = userDoc.data();

      connections.push({
        id: docSnap.id,
        userId: otherUserId,
        userName: userData?.name || 'Unknown',
        userAvatar: userData?.avatar || '',
        ...data
      });
    }

    return connections;
  }

  /**
   * Get pending requests
   */
  async getPendingRequests() {
    const q = query(
      this.connectionsCollection,
      where('userId2', '==', this.userId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const requests = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const userDoc = await getDoc(doc(db, 'users', data.userId1));
      const userData = userDoc.data();

      requests.push({
        id: docSnap.id,
        userId: data.userId1,
        userName: userData?.name || 'Unknown',
        userAvatar: userData?.avatar || '',
        ...data
      });
    }

    return requests;
  }

  /**
   * Search users
   */
  async searchUsers(searchQuery, filters = {}) {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      users = users.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.location?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filters.location) {
      users = users.filter(user => user.location === filters.location);
    }

    if (filters.crops) {
      users = users.filter(user => 
        user.crops?.some(crop => filters.crops.includes(crop))
      );
    }

    return users.filter(user => user.id !== this.userId);
  }

  /**
   * Get connection
   */
  async getConnection(targetUserId) {
    const q = query(
      this.connectionsCollection,
      or(
        and(
          where('userId1', '==', this.userId),
          where('userId2', '==', targetUserId)
        ),
        and(
          where('userId1', '==', targetUserId),
          where('userId2', '==', this.userId)
        )
      )
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  /**
   * Get connection count
   */
  async getConnectionCount() {
    const connections = await this.getConnections();
    return connections.length;
  }
}

export default ConnectionService;
