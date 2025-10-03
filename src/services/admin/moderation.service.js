import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';

/**
 * Moderation Service (UCA3) - Moderate posts & groups
 */
export class ModerationService {
  constructor(adminId) {
    this.adminId = adminId;
    this.moderationCollection = collection(db, 'moderation_queue');
    this.auditCollection = collection(db, 'audit_events');
  }

  async getModerationQueue(filters = {}) {
    let q = query(this.moderationCollection, where('status', '==', 'pending'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async reviewItem(itemId, decision) {
    const { action, reason, policyReference, warning } = decision;

    const itemRef = doc(db, 'moderation_queue', itemId);
    await updateDoc(itemRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      moderatorId: this.adminId,
      decision: {
        action,
        reason,
        policyReference,
        warning
      },
      reviewedAt: Date.now()
    });

    // Apply action to content
    await this.applyContentAction(itemId, action);

    await this.logAudit('content_moderated', itemId, decision);

    return { reviewed: true, itemId, action };
  }

  async applyContentAction(itemId, action) {
    // Would update the actual content based on action
    console.log(`Applying ${action} to content ${itemId}`);
  }

  async banUser(userId, banData) {
    const { duration, reason } = banData;

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'banned',
      bannedUntil: Date.now() + (duration * 24 * 60 * 60 * 1000),
      bannedReason: reason,
      updatedAt: Date.now()
    });

    await this.logAudit('user_banned', userId, banData);

    return { banned: true, userId };
  }

  async setAutoModerationRule(rule) {
    const ruleDoc = {
      pattern: rule.pattern.toString(),
      action: rule.action,
      createdBy: this.adminId,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, 'auto_moderation_rules'), ruleDoc);

    await this.logAudit('auto_rule_created', docRef.id, rule);

    return { id: docRef.id, ...ruleDoc };
  }

  async getQueueStats() {
    const queue = await this.getModerationQueue();

    return {
      pending: queue.length,
      byType: this.groupBy(queue, 'type'),
      byReason: this.groupBy(queue, 'reason')
    };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const value = item[key];
      (result[value] = result[value] || []).push(item);
      return result;
    }, {});
  }

  async logAudit(action, resourceId, metadata) {
    await addDoc(this.auditCollection, {
      timestamp: Date.now(),
      userId: this.adminId,
      action,
      resource: 'moderation',
      resourceId,
      outcome: 'success',
      metadata,
      severity: 'high'
    });
  }
}

export default ModerationService;
