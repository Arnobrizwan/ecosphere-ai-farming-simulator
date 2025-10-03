import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';

/**
 * Access Approval Service (UCA4) - Approve research access
 */
export class AccessApprovalService {
  constructor(adminId) {
    this.adminId = adminId;
    this.requestsCollection = collection(db, 'access_requests');
    this.auditCollection = collection(db, 'audit_events');
  }

  async getPendingRequests() {
    const q = query(this.requestsCollection, where('status', '==', 'pending'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getRequest(requestId) {
    const requests = await this.getPendingRequests();
    return requests.find(r => r.id === requestId);
  }

  async approveAccess(requestId, accessPolicy) {
    const { permissions, expiresAt, renewable } = accessPolicy;

    const requestRef = doc(db, 'access_requests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      accessPolicy: {
        permissions,
        expiresAt,
        renewable
      },
      approvers: [{
        userId: this.adminId,
        decision: 'approved',
        timestamp: Date.now()
      }],
      decidedAt: Date.now()
    });

    await this.logAudit('access_approved', requestId, accessPolicy);

    return { approved: true, requestId, accessPolicy };
  }

  async denyAccess(requestId, denialData) {
    const { reason } = denialData;

    const requestRef = doc(db, 'access_requests', requestId);
    await updateDoc(requestRef, {
      status: 'denied',
      denialReason: reason,
      approvers: [{
        userId: this.adminId,
        decision: 'denied',
        timestamp: Date.now()
      }],
      decidedAt: Date.now()
    });

    await this.logAudit('access_denied', requestId, denialData);

    return { denied: true, requestId, reason };
  }

  async revokeAccess(accessId) {
    const requestRef = doc(db, 'access_requests', accessId);
    await updateDoc(requestRef, {
      status: 'revoked',
      revokedBy: this.adminId,
      revokedAt: Date.now()
    });

    await this.logAudit('access_revoked', accessId, {});

    return { revoked: true, accessId };
  }

  async logAudit(action, resourceId, metadata) {
    await addDoc(this.auditCollection, {
      timestamp: Date.now(),
      userId: this.adminId,
      action,
      resource: 'access',
      resourceId,
      outcome: 'success',
      metadata,
      severity: 'high'
    });
  }
}

export default AccessApprovalService;
