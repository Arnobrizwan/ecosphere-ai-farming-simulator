import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';

/**
 * Alert Management Service (UCA5) - Manage alerts & notices
 */
export class AlertManagementService {
  constructor(adminId) {
    this.adminId = adminId;
    this.noticesCollection = collection(db, 'system_notices');
    this.templatesCollection = collection(db, 'alert_templates');
    this.auditCollection = collection(db, 'audit_events');
  }

  async createNotice(noticeData) {
    const notice = {
      type: noticeData.type,
      title: noticeData.title,
      message: noticeData.message,
      severity: noticeData.severity || 'info',
      audience: noticeData.audience,
      schedule: noticeData.schedule,
      status: 'draft',
      deliveryStats: {
        sent: 0,
        delivered: 0,
        failed: 0
      },
      createdBy: this.adminId,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.noticesCollection, notice);

    await this.logAudit('notice_created', docRef.id, notice);

    return { id: docRef.id, ...notice };
  }

  async createAlertTemplate(templateData) {
    const template = {
      name: templateData.name,
      message: templateData.message,
      channels: templateData.channels,
      audience: templateData.audience,
      createdBy: this.adminId,
      createdAt: Date.now()
    };

    const docRef = await addDoc(this.templatesCollection, template);

    await this.logAudit('template_created', docRef.id, template);

    return { id: docRef.id, ...template };
  }

  async sendNotice(noticeId) {
    const noticeRef = doc(db, 'system_notices', noticeId);
    await updateDoc(noticeRef, {
      status: 'active',
      sentAt: Date.now()
    });

    // Would trigger actual delivery
    console.log(`Sending notice ${noticeId}`);

    await this.logAudit('notice_sent', noticeId, {});

    return { sent: true, noticeId };
  }

  async revokeNotice(noticeId) {
    const noticeRef = doc(db, 'system_notices', noticeId);
    await updateDoc(noticeRef, {
      status: 'revoked',
      revokedBy: this.adminId,
      revokedAt: Date.now()
    });

    await this.logAudit('notice_revoked', noticeId, {});

    return { revoked: true, noticeId };
  }

  async logAudit(action, resourceId, metadata) {
    await addDoc(this.auditCollection, {
      timestamp: Date.now(),
      userId: this.adminId,
      action,
      resource: 'alert',
      resourceId,
      outcome: 'success',
      metadata,
      severity: 'medium'
    });
  }
}

export default AlertManagementService;
