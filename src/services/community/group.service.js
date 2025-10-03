import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * Group Service (UC30) - Join farmer groups
 */
export class GroupService {
  constructor(userId) {
    this.userId = userId;
    this.groupsCollection = collection(db, 'groups');
    this.membershipsCollection = collection(db, 'group_memberships');
  }

  async searchGroups(filters = {}) {
    let q = query(this.groupsCollection);

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    const snapshot = await getDocs(q);
    let groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (filters.location) {
      groups = groups.filter(group => 
        group.location === filters.location || group.type === 'topic'
      );
    }

    return groups;
  }

  async joinGroup(groupId) {
    const membership = {
      userId: this.userId,
      groupId,
      role: 'member',
      joinedAt: Date.now()
    };

    const docRef = await addDoc(this.membershipsCollection, membership);
    
    // Update group member count
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      memberCount: arrayUnion(this.userId)
    });

    return { id: docRef.id, ...membership };
  }

  async leaveGroup(groupId) {
    const q = query(
      this.membershipsCollection,
      where('userId', '==', this.userId),
      where('groupId', '==', groupId)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const membershipRef = doc(db, 'group_memberships', snapshot.docs[0].id);
      await updateDoc(membershipRef, { status: 'left' });
      
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberCount: arrayRemove(this.userId)
      });
    }
  }

  async getUserGroups() {
    const q = query(
      this.membershipsCollection,
      where('userId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    const groups = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const groupDoc = await getDoc(doc(db, 'groups', data.groupId));
      
      if (groupDoc.exists()) {
        groups.push({
          id: groupDoc.id,
          ...groupDoc.data()
        });
      }
    }

    return groups;
  }

  async getUserGroupCount() {
    const groups = await this.getUserGroups();
    return groups.length;
  }

  async getPendingInvitations() {
    // Mock implementation
    return [];
  }
}

export default GroupService;
